import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; 
import dotenv from 'dotenv';

dotenv.config();

// Update this relative path if your User model file has a different name
import User from './src/models/user.model.js'; 

async function seedAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MongoDB connection string not found in .env file');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB...');

    // Hash the password
    const plainPassword = 'admin123'; // Change this to your desired password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Update or Insert the Admin user
    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@taskmanagement.com' },
      {
        fullName: 'Admin User',
        username: 'admin',
        email: 'admin@taskmanagement.com',
        password: hashedPassword,
        role: 'Admin', 
      },
      { upsert: true, new: true }
    );

    console.log('Admin account restored successfully:', adminUser.email);
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

seedAdmin();