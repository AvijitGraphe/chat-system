const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const { authenticateToken } = require("../middleware/authMiddleware");

let clients = {}; 

// Add a new message to the chat
router.post("/addMessage", async (req, res) => {
    const { senderId, receiverId, content } = req.body;  
    try {
        const newMessage = await Message.create({
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            timestamp: new Date(),
            is_read: false,
        });
        // broadcastMessage(newMessage);
        res.status(201).json(newMessage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send message" });
    }
});


// SSE endpoint to stream new messages to the connected clients
// router.get("/streamMessages", (req, res) => {
//     const receiverId = req.query.userId; 
//     if (!receiverId) {
//         return res.status(400).json({ error: "userId is required" });
//     }

//     // Set headers for SSE
//     res.setHeader('Content-Type', 'text/event-stream');
//     res.setHeader('Cache-Control', 'no-cache');
//     res.setHeader('Connection', 'keep-alive');
//     res.flushHeaders(); 

//     // Initialize client connection list for the receiver
//     if (!clients[receiverId]) {
//         clients[receiverId] = [];
//     }
    
//     // Add the response object to the client's list of connected clients
//     clients[receiverId].push(res);

//     // Cleanup when the connection is closed
//     req.on('close', () => {
//         clients[receiverId] = clients[receiverId].filter(client => client !== res);
//     });
// });





// Get all messages in the chat
router.get("/getChat", authenticateToken, async (req, res) => {
    try {
        const user = await User.findOne({ where: { user_id: req.user.id } });
        const chat = await Message.findAll({    
            where: { group_id: user.group_id },
            order: [['timestamp', 'D']],
        });
        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});




// Broadcast a message to all connected clients
// function broadcastMessage(chat) {
//     const message = {
//         message_id: chat.message_id,
//         sender_id: chat.sender_id,
//         receiver_id: chat.receiver_id,
//         content: chat.content, 
//         timestamp: chat.timestamp,
//     };
//     // Check if the sender is connected and broadcast to them
//     if (clients[chat.sender_id]) {
//         clients[chat.sender_id].forEach(client => {
//             client.write(`data: ${JSON.stringify(message)}\n\n`);
//         });
//     }
//     // Check if the receiver is connected and broadcast to them
//     if (clients[chat.receiver_id]) {
//         clients[chat.receiver_id].forEach(client => {
//             client.write(`data: ${JSON.stringify(message)}\n\n`);
//         });
//     }
// }


  
module.exports = router;
