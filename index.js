import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import all route files
import authRoutes from './route/authUser.js';
import userRoutes from './route/userRout.js';
import messageRoutes from './route/messageRout.js';
import connectionRoutes from './route/connectionRout.js';
import isLogin from './middleware/isLogin.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Mount routes with clear prefixes
app.use('/api/auth', authRoutes);    // Authentication routes
app.use('/api/users', userRoutes);   // User-related routes
app.use('/api/user', userRoutes);    // Alias for frontend compatibility
app.use('/api/message', messageRoutes); // Message routes
app.use('/api/connection', connectionRoutes); // Connection routes

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: "API is working!" });
});

// Test auth route
app.get('/api/test-auth', isLogin, (req, res) => {
  res.json({ 
    message: "Auth is working!", 
    user: req.user 
  });
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_CONNECT)  // Changed from MONGODB_URI to MONGODB_CONNECT to match your .env file
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Available endpoints:');
      console.log('- GET /api/test');
      console.log('- POST /api/auth/login');
      console.log('- GET /api/users/currentchatters');
      console.log('- POST /api/message/send/:id');
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);  // Exit with error code if MongoDB connection fails
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong on the server!' 
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: "Endpoint not found" 
  });
});

export default app;  // Export app for testing purposes