import express from 'express';
import { getCurrentChatters, getUserBySearch, getAllUsers, getProfile, updateProfile } from '../routeControllers/userhandlerController.js';
import isLogin from '../middleware/isLogin.js';

const router = express.Router();

// Debugging middleware
router.use((req, res, next) => {
  console.log('User Routes Middleware Triggered');
  console.log('Request Path:', req.path);
  console.log('Request Method:', req.method);
  next();
});

// User search routes
router.get('/search', isLogin, getUserBySearch);
router.get('/currentchatters', isLogin, getCurrentChatters);
router.get('/all', isLogin, getAllUsers);
router.get('/profile', isLogin, getProfile);
router.put('/profile', isLogin, updateProfile);


router.get('/', (req, res) => {
  res.json({ message: "User routes are working!" });
});

export default router;