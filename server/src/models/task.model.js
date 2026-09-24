import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: 
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
  taskType: { type: String, default: 'Standard', trim: true, maxlength: 40 },
  budget: { type: Number, default: 0, min: 0 },
  cost: { type: Number, default: 0, min: 0 },
  completed: 
  { 
    type: Boolean, 
    default: false 
  },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  priority:
   { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  project: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    default: null, 
    index: true 
  },
  assignedUser: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null, 
    index: true 
  },
  creator: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  owner: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  dueDate: 
  { 
    type: Date, 
    default: null 
  },
}, { timestamps: true });

export const Task = mongoose.model('Task', taskSchema);
