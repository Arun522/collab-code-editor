import { Router } from 'express';
import Room from '../models/Room.js';
import Snapshot from '../models/Snapshot.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

function generateSlug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

const DEFAULT_CODE = {
  javascript: '// JavaScript\nconsole.log("Hello, world!");\n',
  typescript: '// TypeScript\nconst greeting: string = "Hello, world!";\nconsole.log(greeting);\n',
  python: '# Python\nprint("Hello, world!")\n',
  java: '// Java\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n',
  cpp: '// C++\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, world!" << std::endl;\n    return 0;\n}\n',
  html: '<!DOCTYPE html>\n<html>\n<head>\n  <title>Page</title>\n</head>\n<body>\n  <h1>Hello, world!</h1>\n</body>\n</html>\n',
  css: '/* CSS */\nbody {\n  font-family: sans-serif;\n  background: #1e1e1e;\n  color: #fff;\n}\n',
  json: '{\n  "message": "Hello, world!"\n}\n',
  markdown: '# Hello, world!\n\nStart writing markdown here.\n',
};

router.post('/', async (req, res) => {
  try {
    const { name, language, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const lang = language || 'javascript';
    const slug = generateSlug(name);
    const room = await Room.create({
      name,
      slug,
      language: lang,
      code: DEFAULT_CODE[lang] || `// ${lang}\n`,
      owner: req.user._id,
      isPublic: isPublic !== false,
      collaborators: [{ user: req.user._id, role: 'editor' }],
    });

    await room.populate('owner', 'displayName email avatar');
    res.status(201).json({ room });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

router.get('/', async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id },
      ],
    })
      .populate('owner', 'displayName email avatar')
      .sort({ updatedAt: -1 });

    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const room = await Room.findOne({ slug: req.params.slug })
      .populate('owner', 'displayName email avatar')
      .populate('collaborators.user', 'displayName email avatar');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isPublic && !room.collaborators.some(c => c.user._id.equals(req.user._id))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

router.put('/:slug', async (req, res) => {
  try {
    const room = await Room.findOne({ slug: req.params.slug });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.owner.equals(req.user._id)) {
      return res.status(403).json({ error: 'Only the owner can update room settings' });
    }

    const { name, language, isPublic } = req.body;
    if (name) room.name = name;
    if (language) room.language = language;
    if (isPublic !== undefined) room.isPublic = isPublic;

    await room.save();
    await room.populate('owner', 'displayName email avatar');
    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update room' });
  }
});

router.delete('/:slug', async (req, res) => {
  try {
    const room = await Room.findOne({ slug: req.params.slug });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.owner.equals(req.user._id)) {
      return res.status(403).json({ error: 'Only the owner can delete the room' });
    }

    await Snapshot.deleteMany({ room: room._id });
    await Room.deleteOne({ _id: room._id });
    res.json({ message: 'Room deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Snapshots
router.post('/:slug/snapshots', async (req, res) => {
  try {
    const room = await Room.findOne({ slug: req.params.slug });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const snapshot = await Snapshot.create({
      room: room._id,
      code: room.code,
      savedBy: req.user._id,
      label: req.body.label || `Snapshot ${new Date().toLocaleString()}`,
    });

    await snapshot.populate('savedBy', 'displayName avatar');
    res.status(201).json({ snapshot });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save snapshot' });
  }
});

router.get('/:slug/snapshots', async (req, res) => {
  try {
    const room = await Room.findOne({ slug: req.params.slug });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const snapshots = await Snapshot.find({ room: room._id })
      .populate('savedBy', 'displayName avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ snapshots });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

export default router;
