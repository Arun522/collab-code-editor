# CollabCode - Real-Time Collaborative Code Editor

A Google Docs-style collaborative code editor with live cursors, room-based sessions, and syntax highlighting powered by Monaco Editor.

## Architecture

```
┌─────────────┐     WebSocket (Socket.io)     ┌─────────────┐
│   React +   │◄──────────────────────────────►│  Express +   │
│   Monaco    │      REST API (JWT Auth)       │  Socket.io   │
│   Editor    │◄──────────────────────────────►│   Server     │
└─────────────┘                                └──────┬───────┘
                                                      │
                                                      ▼
                                               ┌─────────────┐
                                               │   MongoDB    │
                                               │  (Rooms,     │
                                               │   Users,     │
                                               │   Snapshots) │
                                               └─────────────┘
```

**Frontend**: React 18 + Vite, Monaco Editor, Socket.io client, Tailwind CSS
**Backend**: Node.js + Express, Socket.io server, JWT + bcrypt auth
**Database**: MongoDB + Mongoose
**Deployment**: Docker Compose

## Features

- **Real-time collaboration**: Multiple users edit the same file simultaneously
- **Live cursors**: See other users' cursor positions with colored labels
- **Room-based sessions**: Create/join rooms via slug or shareable link
- **Language support**: JavaScript, TypeScript, Python, Java, C++, HTML, CSS, JSON, Markdown
- **Theme toggle**: Dark (vs-dark) and light themes
- **Version history**: Save and restore code snapshots
- **In-room chat**: Real-time text chat alongside the editor
- **Role-based access**: Editor and read-only viewer roles
- **Reconnection**: Automatic reconnect with full state re-sync
- **Responsive UI**: Works on desktop and tablet

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone and start all services
docker compose up --build

# In another terminal, seed demo data
docker compose exec server npm run seed
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

### Option 2: Local Development

**Prerequisites**: Node.js 18+, MongoDB running locally

```bash
# Install server dependencies
cd server
npm install

# Seed the database
npm run seed

# Start the server
npm run dev
```

```bash
# In a new terminal - install client dependencies
cd client
npm install

# Start the client
npm run dev
```

### Demo Credentials

After running the seed script:
- **Email**: demo@example.com
- **Password**: demo123
- **Sample room**: welcome-room

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Sign in (returns JWT) |
| GET | /api/auth/me | Get current user |
| POST | /api/rooms | Create a room |
| GET | /api/rooms | List user's rooms |
| GET | /api/rooms/:slug | Get room by slug |
| PUT | /api/rooms/:slug | Update room settings |
| DELETE | /api/rooms/:slug | Delete room |
| POST | /api/rooms/:slug/snapshots | Save snapshot |
| GET | /api/rooms/:slug/snapshots | List snapshots |

## Socket.io Events (namespace: /editor)

| Event | Direction | Description |
|-------|-----------|-------------|
| join-room | Client → Server | Join a room by slug |
| room-state | Server → Client | Full room state on join |
| code-change | Bidirectional | Code update (debounced 50ms) |
| cursor-update | Bidirectional | Cursor position broadcast |
| language-change | Bidirectional | Language selection sync |
| user-joined | Server → Client | New user notification |
| user-left | Server → Client | User disconnect notification |
| chat-message | Bidirectional | In-room chat message |

## Editor Shortcuts

All standard Monaco Editor / VS Code keybindings work, including:
- `Ctrl/Cmd+Z` - Undo
- `Ctrl/Cmd+Shift+Z` - Redo
- `Ctrl/Cmd+/` - Toggle comment
- `Ctrl/Cmd+D` - Select next occurrence
- `Ctrl/Cmd+F` - Find
- `Alt+Up/Down` - Move line

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 5000 | Server port |
| MONGO_URI | mongodb://localhost:27017/collab-editor | MongoDB connection |
| JWT_SECRET | (required) | JWT signing secret |
| CLIENT_URL | http://localhost:5173 | CORS allowed origin |

## Conflict Resolution

Uses a "last-write-wins with cursor preservation" approach:
- Changes are debounced at 50ms and broadcast as full document state
- On receiving remote changes, the editor preserves the local cursor position and scroll offset
- On reconnect, the full document state is re-synced from the server

## Project Structure

```
collab-code-editor/
├── client/
│   ├── src/
│   │   ├── components/    # ChatPanel, SnapshotPanel
│   │   ├── context/       # AuthContext
│   │   ├── hooks/         # useSocket
│   │   ├── pages/         # Login, Register, Dashboard, EditorRoom
│   │   ├── utils/         # API client
│   │   ├── App.jsx        # Router setup
│   │   └── main.jsx       # Entry point
│   ├── Dockerfile
│   └── package.json
├── server/
│   ├── models/            # User, Room, Snapshot
│   ├── routes/            # auth, rooms
│   ├── middleware/         # JWT auth
│   ├── utils/             # Cursor colors
│   ├── socket.js          # Socket.io handler
│   ├── index.js           # Express entry
│   ├── seed.js            # Database seeder
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```
