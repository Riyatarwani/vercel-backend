import mongoose from "mongoose";
import Conversation from "../Models/conversationModels.js";
import Message from "../Models/messageSchema.js";
import Connection from "../Models/connectionModels.js";

// Updated getMessages function with consistent response format
export const getMessages = async (req, res) => {
    try {
        console.log("getMessages called with params:", req.params);
        console.log("User info:", req.user);
        
        const { id: conversationId } = req.params; 
        
        // Check if we have a valid user
        const senderId = req.user?._id || req.user?._conditions?._id;
        
        if (!senderId) {
            console.log("User not authenticated");
            return res.status(401).send({
                success: false,
                message: "Unauthorized: User not authenticated"
            });
        }

        console.log("Looking for conversation with ID:", conversationId);
        
        // Find conversation either by ID or participants
        let conversation;
        
        // First try to find by direct conversationId
        conversation = await Conversation.findById(conversationId);
        console.log("Find by ID result:", conversation ? "Found" : "Not found");
        
        // If not found, try to find by participants (backward compatibility)
        if (!conversation && conversationId.match(/^[0-9a-fA-F]{24}$/)) {
            console.log("Looking for conversation by participants");
            conversation = await Conversation.findOne({
                participants: { $all: [senderId, conversationId] }
            });
            console.log("Find by participants result:", conversation ? "Found" : "Not found");
        }

        if (!conversation) {
            console.log("No conversation found, returning empty array");
            // Return consistent format even for empty results
            return res.status(200).send({
                success: true,
                messages: []
            });
        }

        // Find messages for this conversation
        console.log("Finding messages for conversation:", conversation._id);
        const messages = await Message.find({ 
            conversationId: conversation._id 
        }).sort({ createdAt: 1 }).populate('senderId', 'username fullName avatar').populate('receiverId', 'username fullName avatar');
        
        console.log(`Found ${messages.length} messages`);

        // Return with consistent format
        res.status(200).send({
            success: true,
            messages: messages
        });
    } catch (error) {
        console.error(`Error in getMessages: ${error}`);
        res.status(500).send({
            success: false,
            message: error.message,
        });
    }
};

// Updated sendMessage function with consistent response format
export const sendMessage = async (req, res) => {
    try {
        console.log("sendMessage called with params:", req.params);
        console.log("Request body:", req.body);
        console.log("User info:", req.user);
        
        // Add input validation
        if (!req.body.message) {
            console.log("Message content missing");
            return res.status(400).send({
                success: false,
                message: "Message content is required"
            });
        }
        
        const { message } = req.body;
        const { id: receiverId } = req.params;
        
        // Ensure senderId is correctly extracted - handle different auth patterns
        const senderId = req.user?._id || req.user?._conditions?._id;
        
        if (!senderId) {
            console.log("User not authenticated");
            return res.status(401).send({
                success: false,
                message: "Unauthorized: User not authenticated"
            });
        }
        
        // Validate receiver ID
        if (!receiverId) {
            console.log("Receiver ID missing");
            return res.status(400).send({
                success: false,
                message: "Receiver ID is required"
            });
        }
        
        console.log(`Sending message from ${senderId} to ${receiverId}`);
        
        // Convert to ObjectId to ensure proper comparison
        const senderObjectId = new mongoose.Types.ObjectId(senderId);
        const receiverObjectId = new mongoose.Types.ObjectId(receiverId);
        
        // Check if users are connected before allowing messaging
        const connection = await Connection.findOne({
            $or: [
                { requester: senderObjectId, recipient: receiverObjectId, status: 'accepted' },
                { requester: receiverObjectId, recipient: senderObjectId, status: 'accepted' }
            ]
        });

        console.log("Connection check:", {
            senderId: senderObjectId,
            receiverId: receiverObjectId,
            connection: connection ? connection.status : 'No connection found',
            connectionId: connection ? connection._id : 'N/A'
        });
        
        // Additional debugging - check all connections for these users
        const allConnections = await Connection.find({
            $or: [
                { requester: senderObjectId },
                { recipient: senderObjectId },
                { requester: receiverObjectId },
                { recipient: receiverObjectId }
            ]
        });
        console.log("All connections for these users:", allConnections.map(conn => ({
            id: conn._id,
            requester: conn.requester,
            recipient: conn.recipient,
            status: conn.status
        })));

        if (!connection) {
            console.log("Users are not connected");
            return res.status(403).json({
                success: false,
                message: "You must be connected to this user to send messages"
            });
        }

        console.log("Connection found, allowing message");
        
        // Find existing conversation or create new one
        let conversation = await Conversation.findOne({
            participants: { $all: [senderObjectId, receiverObjectId] },
        });
        
        if (!conversation) {
            console.log("Creating new conversation");
            conversation = await Conversation.create({
                participants: [senderObjectId, receiverObjectId],
            });
        } else {
            console.log("Found existing conversation:", conversation._id);
        }
        
        // Create new message
        const newMessage = new Message({
            senderId: senderObjectId,
            receiverId: receiverObjectId,
            message,
            conversationId: conversation._id,
        });
        
        // Save message first
        console.log("Saving new message");
        await newMessage.save();
        console.log("Message saved with ID:", newMessage._id);
        
        // Send successful response with consistent format
        res.status(201).json({
            success: true,
            message: newMessage
        });
    } catch (error) {
        console.error("Error in sendMessage:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

// Get or create conversation between two users
export const getOrCreateConversation = async (req, res) => {
    try {
        const { id: otherUserId } = req.params;
        const senderId = req.user?._id || req.user?._conditions?._id;
        
        if (!senderId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User not authenticated"
            });
        }
        
        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: "Other user ID is required"
            });
        }
        
        // Convert to ObjectId
        const senderObjectId = new mongoose.Types.ObjectId(senderId);
        const otherUserObjectId = new mongoose.Types.ObjectId(otherUserId);
        
        // Check if users are connected
        const connection = await Connection.findOne({
            $or: [
                { requester: senderObjectId, recipient: otherUserObjectId, status: 'accepted' },
                { requester: otherUserObjectId, recipient: senderObjectId, status: 'accepted' }
            ]
        });
        
        console.log("Conversation creation - Connection check:", {
            senderId: senderObjectId,
            otherUserId: otherUserObjectId,
            connection: connection ? connection.status : 'No connection found'
        });
        
        if (!connection) {
            console.log("No connection found for conversation creation");
            return res.status(403).json({
                success: false,
                message: "You must be connected to this user to start a conversation"
            });
        }
        
        // Find existing conversation or create new one
        let conversation = await Conversation.findOne({
            participants: { $all: [senderObjectId, otherUserObjectId] },
        });
        
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderObjectId, otherUserObjectId],
            });
        }
        
        res.status(200).json({
            success: true,
            conversation: conversation
        });
    } catch (error) {
        console.error("Error in getOrCreateConversation:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};