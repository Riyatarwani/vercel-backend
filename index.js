import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import all route files
import authRoutes from '../route/authUser.js';
import userRoutes from '../route/userRout.js';
import messageRoutes from '../route/messageRout.js';
import connectionRoutes from '../route/connectionRout.js';
import isLogin from '../middleware/isLogin.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// MongoDB connection (Vercel will handle this per request)
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  const db = await mongoose.connect(process.env.MONGODB_CONNECT);
  cachedDb = db;
  return db;
}

// Connect to DB before handling requests
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

// Mount routes - REMOVE /api prefix (Vercel adds it automatically)
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/user', userRoutes);
app.use('/message', messageRoutes);
app.use('/connection', connectionRoutes);

// Test route
app.get('/test', (req, res) => {
  res.json({ message: "API is working!" });
});

// Test auth route
app.get('/test-auth', isLogin, (req, res) => {
  res.json({ 
    message: "Auth is working!", 
    user: req.user 
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    success: true, 
    message: "Backend running",
    endpoints: [
      '/auth/login',
      '/users/currentchatters',
      '/message/send/:id',
      '/test'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong on the server!' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: "Endpoint not found",
    path: req.path
  });
});

export default app;