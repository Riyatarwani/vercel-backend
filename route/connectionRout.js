import express from "express";
import { 
    sendConnectionRequest, 
    getConnectionRequests, 
    getSentConnectionRequests,
    respondToConnectionRequest,
    getConnections,
    checkConnectionStatus
} from "../routeControllers/connectionController.js";
import isLogin from "../middleware/isLogin.js";

const router = express.Router();

// LinkedIn-style connection routes
router.post('/send/:id', isLogin, sendConnectionRequest);        // Send connection request
router.get('/requests', isLogin, getConnectionRequests);         // Get pending requests
router.get('/sent', isLogin, getSentConnectionRequests);         // Get sent requests (pending)
router.put('/respond/:id', isLogin, respondToConnectionRequest); // Accept/reject request
router.get('/list', isLogin, getConnections);                     // Get connections list
router.get('/check/:userId1/:userId2', isLogin, checkConnectionStatus); // Debug: Check connection status

export default router;
