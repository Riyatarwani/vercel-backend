// userhandlerController.js
import Conversation from "../Models/conversationModels.js";
import User from "../Models/userModels.js";
import Connection from "../Models/connectionModels.js";

export const getUserBySearch = async (req, res) => {
    try {
        const search = req.query.search || '';
        const currentUserID = req.user._id; // Get user ID from the user object

        console.log("Search Query:", search); // Debugging
        console.log("Current User ID:", currentUserID); // Debugging

        const users = await User.find({
            $and: [
                {
                    $or: [
                        { username: { $regex: '.*' + search + '.*', $options: 'i' } },
                        { fullName: { $regex: '.*' + search + '.*', $options: 'i' } }
                    ]
                },
                {
                    _id: { $ne: currentUserID } // Exclude the current user
                }
            ]
        }).select("-password").select("email fullName username"); // Include fullName and username in the response

        res.status(200).send(users);
    } catch (error) {
        console.error("Error in getUserBySearch:", error);
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
};


export const getCurrentChatters = async (req, res) => {
    try {
        const currentUserID = req.user._id; // Get user ID from the authenticated user

        // First, get all accepted connections for the current user
        const connections = await Connection.find({
            $or: [
                { requester: currentUserID, status: 'accepted' },
                { recipient: currentUserID, status: 'accepted' }
            ]
        });

        // If no connections, return an empty array
        if (!connections || connections.length === 0) {
            return res.status(200).json([]);
        }

        // Extract connected user IDs
        const connectedUserIDs = connections.map(connection => 
            connection.requester.toString() === currentUserID.toString() 
                ? connection.recipient 
                : connection.requester
        );

        // Fetch user details for connected users
        const users = await User.find({ 
            _id: { $in: connectedUserIDs } 
        }).select("-password -email"); // Exclude sensitive information

        res.status(200).json(users);
    } catch (error) {
        console.error("Error in getCurrentChatters:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const currentUserID = req.user._id;
        const users = await User.find({ _id: { $ne: currentUserID } })
            .select("-password")
            .select("email fullName username");
        res.status(200).json(users);
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getProfile = async (req, res) => {
    try {
        console.log('getProfile called');
        console.log('req.user:', req.user);
        
        const userId = req.user._id; // Get user ID from the authenticated user
        console.log('Looking for user with ID:', userId);
        
        const user = await User.findById(userId).select('-password');
        console.log('Found user:', user ? 'Yes' : 'No');

        if (!user) {
            console.log('User not found in database');
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        console.log('Returning profile for user:', user.username);
        res.status(200).json({ success: true, profile: user });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const updateData = req.body;
        
        console.log('Updating profile for user:', userId);
        console.log('Update data:', updateData);

        // Remove fields that shouldn't be updated directly
        const { password, email, username, ...allowedUpdates } = updateData;
        
        // Validate education year if provided
        if (allowedUpdates.education?.year && !/^\d{4}$/.test(allowedUpdates.education.year)) {
            return res.status(400).json({
                success: false,
                message: 'Graduation year must be a 4-digit number'
            });
        }

        // Validate phone number if provided
        if (allowedUpdates.phoneNumber && !/^\+?[0-9]{10,15}$/.test(allowedUpdates.phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid phone number'
            });
        }

        // Update the user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            allowedUpdates,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('Profile updated successfully for user:', updatedUser.username);
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            profile: updatedUser
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
};