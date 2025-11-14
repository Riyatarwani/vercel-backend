import Connection from "../Models/connectionModels.js";
import User from "../Models/userModels.js";

// Send connection request
export const sendConnectionRequest = async (req, res) => {
    try {
        const { id: recipientId } = req.params;
        const { message } = req.body;
        const requesterId = req.user._id;

        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if trying to connect with self
        if (requesterId.toString() === recipientId) {
            return res.status(400).json({
                success: false,
                message: "Cannot connect with yourself"
            });
        }

        // Check if connection already exists
        const existingConnection = await Connection.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId }
            ]
        });

        if (existingConnection) {
            return res.status(400).json({
                success: false,
                message: "Connection already exists or pending"
            });
        }

        // Create new connection request
        const connection = await Connection.create({
            requester: requesterId,
            recipient: recipientId,
            message: message || `Hi ${recipient.username}, I'd like to connect with you!`
        });

        res.status(201).json({
            success: true,
            message: "Connection request sent successfully",
            connection
        });
    } catch (error) {
        console.error("Error in sendConnectionRequest:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get connection requests (received only)
export const getConnectionRequests = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get pending requests where user is recipient
        const receivedRequests = await Connection.find({
            recipient: userId,
            status: 'pending'
        }).populate('requester', 'fullName username avatar bio location skills');

        res.status(200).json({
            success: true,
            receivedRequests
        });
    } catch (error) {
        console.error("Error in getConnectionRequests:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get connection requests sent by the current user (pending)
export const getSentConnectionRequests = async (req, res) => {
    try {
        const userId = req.user._id;

        const sentRequests = await Connection.find({
            requester: userId,
            status: 'pending'
        }).populate('recipient', 'fullName username avatar bio location skills');

        res.status(200).json({
            success: true,
            sentRequests
        });
    } catch (error) {
        console.error("Error in getSentConnectionRequests:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Accept or reject connection request
export const respondToConnectionRequest = async (req, res) => {
    try {
        const { id: connectionId } = req.params;
        const { status } = req.body;
        const userId = req.user._id;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be 'accepted' or 'rejected'"
            });
        }

        const connection = await Connection.findOne({
            _id: connectionId,
            recipient: userId,
            status: 'pending'
        });

        if (!connection) {
            return res.status(404).json({
                success: false,
                message: "Connection request not found or already responded"
            });
        }

        connection.status = status;
        await connection.save();

        res.status(200).json({
            success: true,
            message: `Connection request ${status} successfully`,
            connection
        });
    } catch (error) {
        console.error("Error in respondToConnectionRequest:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get all connections (accepted only)
export const getConnections = async (req, res) => {
    try {
        const userId = req.user._id;

        const connections = await Connection.find({
            $or: [
                { requester: userId, status: 'accepted' },
                { recipient: userId, status: 'accepted' }
            ]
        }).populate('requester', 'fullName username avatar bio location skills')
          .populate('recipient', 'fullName username avatar bio location skills');

        // Format connections to show the other user
        const formattedConnections = connections.map(connection => {
            const otherUser = connection.requester._id.toString() === userId.toString() 
                ? connection.recipient 
                : connection.requester;
            
            return {
                _id: connection._id,
                user: otherUser,
                connectedAt: connection.updatedAt
            };
        });

        res.status(200).json({
            success: true,
            connections: formattedConnections
        });
    } catch (error) {
        console.error("Error in getConnections:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Remove connection
export const removeConnection = async (req, res) => {
    try {
        const { id: connectionId } = req.params;
        const userId = req.user._id;

        const connection = await Connection.findOne({
            _id: connectionId,
            $or: [
                { requester: userId },
                { recipient: userId }
            ],
            status: 'accepted'
        });

        if (!connection) {
            return res.status(404).json({
                success: false,
                message: "Connection not found"
            });
        }

        await Connection.findByIdAndDelete(connectionId);

        res.status(200).json({
            success: true,
            message: "Connection removed successfully"
        });
    } catch (error) {
        console.error("Error in removeConnection:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Debug endpoint to check connection status between two users
export const checkConnectionStatus = async (req, res) => {
    try {
        const { userId1, userId2 } = req.params;
        const currentUserId = req.user._id;
        
        // Only allow users to check their own connections
        if (currentUserId.toString() !== userId1 && currentUserId.toString() !== userId2) {
            return res.status(403).json({
                success: false,
                message: "You can only check your own connections"
            });
        }
        
        const connection = await Connection.findOne({
            $or: [
                { requester: userId1, recipient: userId2 },
                { requester: userId2, recipient: userId1 }
            ]
        });
        
        res.status(200).json({
            success: true,
            connection: connection ? {
                id: connection._id,
                requester: connection.requester,
                recipient: connection.recipient,
                status: connection.status,
                createdAt: connection.createdAt,
                updatedAt: connection.updatedAt
            } : null,
            areConnected: connection && connection.status === 'accepted'
        });
    } catch (error) {
        console.error("Error in checkConnectionStatus:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};