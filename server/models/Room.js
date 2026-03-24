import mongoose from 'mongoose';

const collaboratorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['editor', 'viewer'],
    default: 'editor',
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  language: {
    type: String,
    default: 'javascript',
  },
  code: {
    type: String,
    default: '// Start coding collaboratively!\n',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  collaborators: [collaboratorSchema],
  isPublic: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

roomSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Room', roomSchema);
