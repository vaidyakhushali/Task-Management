import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  actor: 
  {
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'User', 
     required: true 
  },
  task: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Task', 
    default: null 
  },
  title: 
  {
     type: String, 
     required: true, 
     trim: true 
    },
  message: 
  { 
    type: String, 
    required: true, 
    trim: true 
  },
  type: 
  { 
    type: String, 
    enum: ['task', 'workspace', 'info', 'comment', 'chat'], 
    default: 'task' 
  },
  read: 
  { 
    type: Boolean, 
    default: false 
  },
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);