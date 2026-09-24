import { User } from '../models/user.model.js';

export async function ensureAdminUser() {
    const adminConfig = {
        fullname: process.env.ADMIN_FULLNAME || 'Admin',
        username: process.env.ADMIN_USERNAME || 'admin',
        email: (process.env.ADMIN_EMAIL || 'admin@taskmanagement.com').toLowerCase().trim(),
        password: process.env.ADMIN_PASSWORD || 'admin123',
    };

    const existingUser = await User.findOne({
        $or: [
            { email: adminConfig.email },
            { username: adminConfig.username },
        ],
    });

    if (existingUser) {
        if (existingUser.role !== 'Admin') {
            existingUser.role = 'Admin';
            await existingUser.save({ validateBeforeSave: false });
        }
        return existingUser;
    }

    const admin = await User.create({ ...adminConfig, role: 'Admin' });
    console.log(`✅ Admin account initialized: ${adminConfig.email} (Password: ${adminConfig.password})`);
    return admin;
}