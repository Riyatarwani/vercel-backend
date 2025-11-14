// userRouteController.js
import User from '../Models/userModels.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// User registration (email verification removed)
export const userRegister = async (req, res) => {
    try {
        const {
            fullName,
            username,
            email,
            password,
            confirmPassword,
            gender,
            education,
            skills,
            location,
            phoneNumber
        } = req.body;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        // Validate password (simplified requirements)
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Validate required fields
        if (!fullName || !username || !email || !password || !confirmPassword || !gender) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields"
            });
        }

        // Check if education object exists and has required fields
        if (education && (education.institute || education.degree || education.field || education.year)) {
            // If any education field is provided, validate the year format
            if (education.year) {
                const yearRegex = /^\d{4}$/;
                if (!yearRegex.test(education.year)) {
                    return res.status(400).json({
                        success: false,
                        message: "Year should be a 4-digit number"
                    });
                }
            }
        }

        // Check if passwords match
        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        // Check if username contains only allowed characters
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: "Username can only contain letters, numbers and underscores"
            });
        }

        // Validate phone number (if provided)
        if (phoneNumber) {
            const phoneRegex = /^\+?[0-9]{10,15}$/;
            if (!phoneRegex.test(phoneNumber)) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid phone number"
                });
            }
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { email: email.toLowerCase() }, 
                { username: username.toLowerCase() }
            ] 
        });
        
        if (existingUser) {
            if (existingUser.email.toLowerCase() === email.toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    message: "Email already registered"
                });
            }
            return res.status(400).json({
                success: false,
                message: "Username already taken"
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user (without email verification)
        const newUser = new User({
            fullName,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            gender: gender.toLowerCase(),
            status: "active", // Set to active immediately
            education,
skills: skills || [],
            location,
            phoneNumber
        });

        // Save user to database
        await newUser.save();
        
        // Return success response
        res.status(201).json({
            success: true,
            message: "Registration successful. You can now login.",
            user: {
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred during registration",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// User login
export const userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password"
            });
        }

        // Find user by email (case-insensitive)
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Update last login time
        user.lastLogin = Date.now();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set token as cookie
        res.cookie('jwt', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production' // Only secure in production
        });

        // Return success response
        res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email
            },
            token: token // Also send the token in the response for frontend storage
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred during login"
        });
    }
};

// User logout
export const userLogout = async (req, res) => {
    try {
        // Clear the JWT cookie
        res.clearCookie('jwt');
        
        res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred during logout"
        });
    }
};