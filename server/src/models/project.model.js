import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: 
  { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: 
  { 
    type: String, 
    default: '', 
    trim: true 
  },
  owner: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  members: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }],
}, { timestamps: true });

export const Project = mongoose.model('Project', projectSchema);
