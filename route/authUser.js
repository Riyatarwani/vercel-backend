import express from "express";
import { userRegister, userLogin, userLogout } from "../routeControllers/userRouteController.js";

const router = express.Router();

// Auth routes
router.post('/login', userLogin);
router.post('/register', userRegister);
router.post('/logout', userLogout);

export default router;