import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './index.js';
import { User } from '../models/user.model.js';
import { Task } from '../models/task.model.js';
import { Comment } from '../models/comment.model.js';
import { Notification } from '../models/notification.model.js';
import { ensureAdminUser } from './ensure-admin.js';

dotenv.config({ path: './.env' });

async function seedData() {
  try {
    await connectDB();
    console.log('🌱 Connected to MongoDB for seeding...');

    const admin = await ensureAdminUser();

    // Create demo standard users if they don't exist
    const demoUsers = [
      { fullname: 'Alex Johnson', username: 'alex', email: 'user1@taskmanagement.com', password: 'user123', role: 'User' },
      { fullname: 'Sarah Miller', username: 'sarah', email: 'sarah@taskmanagement.com', password: 'user123', role: 'User' },
      { fullname: 'David Chen', username: 'david', email: 'david@taskmanagement.com', password: 'user123', role: 'User' },
    ];

    const users = [];
    for (const u of demoUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = await User.create(u);
        console.log(`👤 Created demo user: ${u.email}`);
      }
      users.push(user);
    }

    // Seed sample tasks if no tasks exist
    const existingTaskCount = await Task.countDocuments();
    if (existingTaskCount === 0) {
      const sampleTasks = [
        {
          title: 'Design Task Management Landing UI',
          description: 'Create responsive mockup with cream/peach theme and dashboard metrics.',
          status: 'in-progress',
          priority: 'high',
          assignedUser: users[0]._id,
          creator: admin._id,
          owner: admin._id,
          dueDate: new Date(Date.now() + 3 * 86400000),
        },
        {
          title: 'Setup Express & MongoDB Authentication Routes',
          description: 'Implement JWT, bcryptjs, and role-based middleware for Admin and User roles.',
          status: 'completed',
          priority: 'high',
          assignedUser: users[1]._id,
          creator: admin._id,
          owner: admin._id,
          dueDate: new Date(Date.now() - 86400000),
        },
        {
          title: 'Integrate Task Commenting System',
          description: 'Allow users to reply directly to task items and communicate with Admin.',
          status: 'pending',
          priority: 'medium',
          assignedUser: users[0]._id,
          creator: admin._id,
          owner: admin._id,
          dueDate: new Date(Date.now() + 5 * 86400000),
        },
        {
          title: 'Verify Toast Notification Banners',
          description: 'Test in-app pop-up notifications when tasks are assigned to specific team members.',
          status: 'pending',
          priority: 'low',
          assignedUser: users[2]._id,
          creator: admin._id,
          owner: admin._id,
          dueDate: new Date(Date.now() + 7 * 86400000),
        },
      ];

      const createdTasks = await Task.insertMany(sampleTasks);
      console.log(`📋 Created ${createdTasks.length} sample tasks.`);

      // Create sample notifications
      for (const t of createdTasks) {
        if (t.assignedUser) {
          await Notification.create({
            recipient: t.assignedUser,
            actor: admin._id,
            task: t._id,
            title: 'New Task Assigned',
            message: `Admin assigned you "${t.title}".`,
            type: 'task',
          });
        }
      }

      // Add sample comment
      if (createdTasks[0]) {
        await Comment.create({
          task: createdTasks[0]._id,
          user: admin._id,
          message: 'Please update status as soon as wireframes are finalized.',
        });
        await Comment.create({
          task: createdTasks[0]._id,
          user: users[0]._id,
          message: 'Sure! Working on the card layouts now.',
        });
        console.log('💬 Added initial comments for sample task.');
      }
    }

    console.log('✨ Database seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedData();
