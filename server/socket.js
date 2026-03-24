import { Server } from 'socket.io';
import { socketAuth } from './middleware/auth.js';
import { getNextCursorColor } from './utils/cursorColors.js';
import Room from './models/Room.js';

// Track connected users per room: { roomSlug: { socketId: { user, color } } }
const roomUsers = new Map();

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  const editorNs = io.of('/editor');
  editorNs.use(socketAuth);

  editorNs.on('connection', (socket) => {
    const user = socket.user;

    socket.on('join-room', async ({ slug }) => {
      try {
        const room = await Room.findOne({ slug })
          .populate('owner', 'displayName email avatar')
          .populate('collaborators.user', 'displayName email avatar');

        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Add user as collaborator if not already
        const isCollaborator = room.collaborators.some(
          (c) => c.user._id.equals(user._id)
        );
        if (!isCollaborator) {
          room.collaborators.push({ user: user._id, role: 'editor' });
          await room.save();
        }

        socket.join(slug);
        socket.currentRoom = slug;

        // Track user in room
        if (!roomUsers.has(slug)) {
          roomUsers.set(slug, new Map());
        }
        const users = roomUsers.get(slug);
        const color = getNextCursorColor();
        users.set(socket.id, {
          userId: user._id.toString(),
          displayName: user.displayName,
          avatar: user.avatar,
          color,
        });

        // Determine user's role
        const collab = room.collaborators.find(
          (c) => c.user._id.equals(user._id)
        );
        const role = collab ? collab.role : 'viewer';

        // Send current state to joining user
        socket.emit('room-state', {
          code: room.code,
          language: room.language,
          users: Array.from(users.values()),
          role,
          roomName: room.name,
        });

        // Notify others
        socket.to(slug).emit('user-joined', {
          userId: user._id.toString(),
          displayName: user.displayName,
          avatar: user.avatar,
          color,
          users: Array.from(users.values()),
        });
      } catch (err) {
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('code-change', async ({ slug, code }) => {
      try {
        // Update in DB (debounced by client, so this is fine)
        await Room.updateOne({ slug }, { code, updatedAt: new Date() });

        // Broadcast to others in the room
        socket.to(slug).emit('code-change', {
          code,
          userId: user._id.toString(),
        });
      } catch (err) {
        // Silent fail for performance
      }
    });

    socket.on('cursor-update', ({ slug, position }) => {
      const users = roomUsers.get(slug);
      const userData = users?.get(socket.id);
      if (!userData) return;

      socket.to(slug).emit('cursor-update', {
        userId: user._id.toString(),
        displayName: user.displayName,
        position,
        color: userData.color,
      });
    });

    socket.on('language-change', async ({ slug, language }) => {
      try {
        await Room.updateOne({ slug }, { language });
        socket.to(slug).emit('language-change', { language });
      } catch (err) {
        // Silent fail
      }
    });

    socket.on('chat-message', ({ slug, message }) => {
      editorNs.in(slug).emit('chat-message', {
        userId: user._id.toString(),
        displayName: user.displayName,
        avatar: user.avatar,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      const slug = socket.currentRoom;
      if (!slug) return;

      const users = roomUsers.get(slug);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) {
          roomUsers.delete(slug);
        } else {
          socket.to(slug).emit('user-left', {
            userId: user._id.toString(),
            users: Array.from(users.values()),
          });
        }
      }
    });
  });

  return io;
}
