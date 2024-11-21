const WebSocket = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
require("dotenv").config();
const ChatFile = require('../models/ChatFile');


const path = require('path');
const fs = require('fs');
const multer = require('multer');

const upload = multer({ 
    dest: path.join(__dirname, 'uploads'), 
    limits: { fileSize: 10 * 1024 * 1024 }, 
});


let clients = {}; 
let groups = {};  
let activeConversations = {};  
const JWT_SECRET = process.env.JWT_SECRET;  

// WebSocket route handler function
function websocketRoute(server) {
    const io = WebSocket(server);
    io.on('connection', (socket) => {
        const token = socket.handshake.query.token;
        console.log('Received token:', token);
        if (!token) {
            console.error('No token provided');
            socket.disconnect();
            return;
        }
        try {
            // Verify the JWT token and get user information
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = decoded.id;
            socket.userId = userId;

            // Store the socket for the user
            clients[userId] = socket;
            socket.emit('connected', { message: 'You are connected!' });
            

            // Initialize active conversations for the user
            activeConversations[userId] = activeConversations[userId] || {};

            socket.on('sendMessage', async (msg) => {
                try {
                    // Save the text message to the database
                    const newMessage = await Message.create({
                        sender_id: msg.senderId,
                        receiver_id: msg.receiverId,
                        content: msg.content,
                        timestamp: new Date(),
                        is_read: false,
                    });
            
                    // Initialize the filePaths array to store file references
                    let filePaths = [];
            
                    // Handle files if present
                    if (msg.files && msg.files.length > 0) {
                        for (const file of msg.files) {
                            // Save the file to disk
                            const fileExtension = path.extname(file.name);
                            const fileName = `${Date.now()}-${file.name}`;
                            const filePath = path.join(__dirname, 'uploads', fileName);
                            fs.writeFileSync(filePath, file.data); 
            
                            // Save the file metadata in the database
                            const newFile = await ChatFile.create({
                                file_name: fileName,
                                message_id: newMessage.message_id,
                            });
            
                            // Add the file reference to the filePaths array
                            filePaths.push(newFile);
                        }
                    }
            
                    // Call the broadcast function with or without files
                    broadcastOneToOneMessage(newMessage, filePaths);
                } catch (err) {
                    console.error('Error saving message:', err);
                    socket.emit('error', { message: 'Message send failed' });
                }
            });
            
            // Function to broadcast one-to-one message
            function broadcastOneToOneMessage(message, filePaths) {
                const messageData = {
                    message_id: message.message_id,
                    sender_id: message.sender_id,
                    receiver_id: message.receiver_id,
                    content: message.content,
                    timestamp: message.timestamp,
                    files: filePaths || [], // If no files, pass an empty array
                };
            
                // Emit to sender and receiver
                if (clients[message.sender_id]) {
                    clients[message.sender_id].emit('senderMessage', messageData);
                }
                if (clients[message.receiver_id]) {
                    clients[message.receiver_id].emit('receiveMessage', messageData);
                }
            }
            
            
            socket.on('sendGroupMessage', async (msg) => {
                try {
                    // Validate incoming message data
                    if (!msg.senderId || !msg.content || !msg.groupId) {
                        console.error("Missing required fields: senderId, content, or groupId");
                        socket.emit('error', { message: 'Sender, content, and group are required' });
                        return;
                    }
            
                    // Create message first
                    const newMessage = await Message.create({
                        sender_id: msg.senderId,
                        group_id: msg.groupId,
                        content: msg.content,
                        timestamp: new Date(),
                        is_read: false,
                    });
            
                    // Handle files if present
                    let filePaths = [];
                    if (msg.files && msg.files.length > 0) {
                        for (const file of msg.files) {
                            // Save the file to disk
                            const fileExtension = path.extname(file.name);
                            const fileName = `${Date.now()}-${file.name}`;
                            const filePath = path.join(__dirname, 'uploads', fileName);
                            // Write file to disk (assuming fs and path are required)
                            fs.writeFileSync(filePath, file.data); 
                            // Create file metadata record in the database
                            const newFile = await ChatFile.create({
                                file_name:fileName,
                                message_id: newMessage.message_id, 
                            });
                            filePaths.push(newFile);
                        }
                    }
            
                    // Broadcast message and files to group
                    broadcastGroupMessage(newMessage, filePaths);
            
                } catch (err) {
                    console.error('Error saving group message:', err);
                    socket.emit('error', { message: 'Group message send failed' });
                }
            });
            

            // Function to broadcast the message to all users in the group
            function broadcastGroupMessage(message, files) {
                const messageData = {
                    message_id: message.message_id,
                    sender_id: message.sender_id,
                    group_id: message.group_id,
                    content: message.content,
                    timestamp: message.timestamp,
                    files: files || [], 
                };

                const groupUsers = groups[message.group_id] || [];

                groupUsers.forEach(userId => {
                    if (clients[userId]) {
                        clients[userId].emit('receiveGroupMessage', messageData);
                    } else {
                        console.log(`No client found for user ${userId}`);
                    }
                });
            }


            // Join a group
            socket.on('joinGroup', (groupId) => {
                if (!groups[groupId]) {
                    groups[groupId] = [];
                }
                // Add user to the group and make sure the socket joins the room
                if (!groups[groupId].includes(userId)) {
                    groups[groupId].push(userId);
                    socket.join(groupId);
                    io.to(groupId).emit('userJoinedGroup', { userId, groupId });
                }
            });

            // Leave a group
            // On the backend: handle the user leaving a group
            socket.on('leaveGroup', (groupId) => {
                const groupMembers = groups[groupId];
                if (groupMembers) {
                    const index = groupMembers.indexOf(userId);
                    if (index > -1) {
                        groupMembers.splice(index, 1); 
                        socket.leave(groupId); 
                        io.to(groupId).emit('userLeftGroup', { userId, groupId });
                    }
                }
            });

            // Leave a group
            // Leave a one-to-one conversation
            socket.on('leaveConversation', (otherUserId) => {
                // Remove the other user from active conversations
                if (activeConversations[userId] && activeConversations[userId][otherUserId]) {
                    delete activeConversations[userId][otherUserId];
                }
                // Optionally remove the current user from the other user's active conversations as well
                if (activeConversations[otherUserId] && activeConversations[otherUserId][userId]) {
                    delete activeConversations[otherUserId][userId];
                }
            });

            // Handle user disconnection
            socket.on('disconnect', () => {
                if (socket.userId) {
                    // Clean up clients object
                    delete clients[socket.userId];
                    for (const groupId in groups) {
                        const groupMembers = groups[groupId];
                        const index = groupMembers.indexOf(socket.userId);
                        if (index > -1) {
                            groupMembers.splice(index, 1);
                        }
                    }
                    // Remove user from active conversations
                    for (const otherUserId in activeConversations[socket.userId]) {
                        delete activeConversations[socket.userId][otherUserId];
                    }
                }
            });
        } catch (err) {
            console.error('Error verifying token: ', err);
            socket.disconnect();
        }
    });

    

    // Function to broadcast a group message

}

module.exports = websocketRoute;
