// isLogin.js
import jwt from 'jsonwebtoken';
import User from '../Models/userModels.js';

const isLogin = async (req, res, next) => {
    try {
        // Try to get token from cookie first
        let token = req.cookies?.jwt;
        
        // If no token in cookie, check Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        console.log("Token found:", token ? "Yes" : "No"); // Debugging without exposing the token

        if (!token) {
            return res.status(401).send({ success: false, message: "User Unauthorized - No token provided" });
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token verified:", decode ? "Yes" : "No"); // Debugging

        if (!decode) {
            return res.status(401).send({ success: false, message: "User Unauthorized - Invalid Token" });
        }

        const user = await User.findById(decode.userId).select("-password");
        console.log("User found:", user ? "Yes" : "No"); // Debugging

        if (!user) {
            return res.status(404).send({ success: false, message: "User not found" });
        }

        req.user = user; // Attach the user object to the request
        next();
    } catch (error) {
        console.error(`Error in isLogin middleware: ${error.message}`);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).send({
                success: false,
                message: "Invalid token"
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).send({
                success: false,
                message: "Token expired"
            });
        }
        res.status(500).send({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export default isLogin;