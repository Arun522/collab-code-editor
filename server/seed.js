import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Room from './models/Room.js';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Room.deleteMany({});

  // Create demo user
  const user = await User.create({
    email: 'demo@example.com',
    password: 'demo123',
    displayName: 'Demo User',
    avatar: 'hsl(210, 70%, 50%)',
  });

  // Create sample room
  await Room.create({
    name: 'Welcome Room',
    slug: 'welcome-room',
    language: 'javascript',
    code: `// Welcome to the Collaborative Code Editor!
// Share this room's link with others to code together in real-time.

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Try editing this code - others will see your changes instantly!
for (let i = 0; i < 10; i++) {
  console.log(\`fib(\${i}) = \${fibonacci(i)}\`);
}
`,
    owner: user._id,
    collaborators: [{ user: user._id, role: 'editor' }],
    isPublic: true,
  });

  console.log('Seed complete!');
  console.log('Demo user: demo@example.com / demo123');
  console.log('Sample room: welcome-room');

  await mongoose.disconnect();
}

seed().catch(console.error);
