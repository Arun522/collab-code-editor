import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  savedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  label: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Snapshot', snapshotSchema);
