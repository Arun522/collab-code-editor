import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import executeRoutes from './routes/execute.js';
import { setupSocket } from './socket.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/execute', executeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

setupSocket(httpServer);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
