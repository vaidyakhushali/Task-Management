import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    fullname: 
    { 
        type: String, 
        required: true, 
        trim: true 
    },
    username: 
    {  
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    email: 
    { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    password: 
    { 
        type: String, 
        required: true, 
        minlength: 6 
    },
    role: 
    { 
        type: String, 
        enum: ['User', 'Manager', 'Admin'], 
        default: 'User' 
    },
    workspaceName: {
        type: String,
        default: 'Task Manager',
        trim: true,
        maxlength: 60,
    },
    refreshToken: 
    { 
        type: String, 
        default: null 
    },
    lastLoginAt: {
        type: Date,
        default: null
    },
}, { timestamps: true });

userSchema.pre('save', async function savePassword() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = function isPasswordCorrect(password) {
    return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function generateAccessToken() {
    return jwt.sign(
        { _id: this._id, username: this.username, role: this.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d' },
    );
};

userSchema.methods.generateRefreshToken = function generateRefreshToken() {
    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' },
    );
};

export const User = mongoose.model('User', userSchema);
