import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  sender: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  recipient: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  message: 
  { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 1000 
  },
}, { timestamps: true });

export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
