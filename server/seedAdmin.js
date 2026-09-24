import mongoose from 'mongoose';
import bcrypt from 'bcryptjs'; // Change to 'bcrypt' if your project uses bcrypt
import dotenv from 'dotenv';

// Load variables from .env file
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
    const plainPassword = 'your_admin_password'; // Change this to your desired password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Update or Insert the Admin user
    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@taskmanagement.com' },
      {
        fullName: 'Admin User',
        username: 'admin',
        email: 'admin@taskmanagement.com',
        password: hashedPassword,
        role: 'Admin', // Adjust case if your schema requires lower 'admin'
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