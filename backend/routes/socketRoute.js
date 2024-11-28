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
            
            clients[userId] = socket;
            
            socket.emit('connected', {userId});
            broadcastActiveUsers();

            // Initialize active conversations for the user
            activeConversations[userId] = activeConversations[userId] || {};

            //user
            socket.on('sendMessage', async (msg) => {
                
                try {
                    const newMessage = await Message.create({
                        sender_id: msg.senderId,
                        receiver_id: msg.receiverId,
                        content: msg.content,
                        prevMessageId: msg.prevMessageId,
                        prevContent: msg.prevContent,
                        sender_name: msg.sender_name,
                        rebackName: msg.rebackName,
                        is_read: false,
                    });
                    let filePaths = [];
                    if (msg.files && msg.files.length > 0) {
                        for (const file of msg.files) {
                            const fileExtension = path.extname(file.name);
                            const fileName = `${Date.now()}-${file.name}`;
                            const filePath = path.join(__dirname, 'uploads', fileName);
                            fs.writeFileSync(filePath, file.data); 
                            const newFile = await ChatFile.create({
                                file_name: fileName,
                                message_id: newMessage.message_id,
                            });
                            filePaths.push(newFile);
                        }
                    }
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
                    prevContent: message.prevContent,
                    content: message.content,
                    sender_name: message.sender_name,
                    rebackName: message.rebackName,
                    timestamp: message.created_at,
                    status: message.status,
                    files: filePaths || [], 
                };
                if (clients[message.sender_id]) {
                    clients[message.sender_id].emit('senderMessage', messageData);
                }
                
                if (clients[message.receiver_id]) {
                    clients[message.receiver_id].emit('receiveMessage', messageData);
                }


            }
            

            socket.on('response', async (msg) => {
                try {
                  const message = await Message.findOne({ where: { message_id: msg.message_id } });
                  if (message.status === 'check') {
                    return; 
                  }
                  // Update message status to "checked"
                  await Message.update(
                    { status: 'check' },
                    { where: { message_id: msg.message_id } }
                  );
              
                  // Find the next message (if any)
                  const nextMessage = await Message.findOne({ where: { message_id: msg.message_id } });
                  if (nextMessage) {
                    broadcastOneToOneMessage(nextMessage, []);  // Only send the next message if valid
                  }

                // responseBack();
                } catch (error) {
                  console.error('Error processing response message:', error);
                }
              });
              
            

            socket.on('sendGroupMessage', async (msg) => {
                try {
                    if (!msg.senderId || !msg.content || !msg.groupId) {
                        console.error("Missing required fields: senderId, content, or groupId");
                        socket.emit('error', { message: 'Sender, content, and group are required' });
                        return;
                    }
                    const newMessage = await Message.create({
                        sender_id: msg.senderId,
                        group_id: msg.groupId,
                        content: msg.content,
                        prevMessageId: msg.prevMessageId,
                        prevContent: msg.prevContent,
                        sender_name: msg.sender_name,
                        rebackName: msg.rebackName,
                        is_read: false,
                    });
                    let filePaths = [];
                    if (msg.files && msg.files.length > 0) {
                        for (const file of msg.files) {
                            // Save the file to disk
                            const fileExtension = path.extname(file.name);
                            const fileName = `${Date.now()}-${file.name}`;
                            const filePath = path.join(__dirname, 'uploads', fileName);
                            fs.writeFileSync(filePath, file.data); 
                            const newFile = await ChatFile.create({
                                file_name:fileName,
                                message_id: newMessage.message_id, 
                            });
                            filePaths.push(newFile);
                        }
                    }
                    broadcastGroupMessage(newMessage, filePaths);
                    
                   

                } catch (err) {
                    console.error('Error saving group message:', err);
                    socket.emit('error', { message: 'Group message send failed' });
                }
            });
            
            // Function to broadcast the message to group members;
            function broadcastGroupMessage(message, files) {
                const messageData = {
                    message_id: message.message_id,
                    sender_id: message.sender_id,
                    group_id: message.group_id,
                    content: message.content,
                    prevContent: message.prevContent,
                    sender_name: message.sender_name,
                    rebackName: message.rebackName,
                    timestamp: message.created_at,
                    files: files || [],
                    created_at: message.created_at,
                    status: message.status
                };
                const groupUsers = groups[message.group_id] || [];
                const activeUsers = Object.keys(clients);
                // Broadcast message to group members
                groupUsers.forEach(userId => {
                    if (clients[userId]) {
                         

                          

                        clients[userId].emit('receiveGroupMessage', messageData);




                    } else {
                        console.log(`No client found for user ${userId}`);
                    }
                });


                activeUsers.forEach(userId => {
                    if (!groupUsers.includes(userId) && clients[userId]) {
                        clients[userId].emit('receiveGroupNotification', {
                            message: `New message in Group ${message.group_id}`,
                            group_id: message.group_id,
                            sender_name: message.sender_name,
                        });
                    }
                });

            }


      
            // For group message response
            socket.on("groupMessagerespone", async (msg) => {
                try {
            
                    const message = await Message.findOne({
                        where: { message_id: msg.message_id },
                    });

                    if (!message || message.status === "check") {
                        console.log("Message already checked, skipping update.");
                        return; // Early exit if the message is already checked
                    }

                    // Wait for the update to complete
                    const updateResult = await Message.update(
                        { status: "check" },
                        { where: { message_id: msg.message_id } }
                    );

                    // If update was successful, retrieve the updated message
                    if (updateResult[0] > 0) {
                        const updatedMessage = await Message.findOne({
                            where: { message_id: msg.message_id },
                        });

                        if (updatedMessage) {
                            console.log(updatedMessage);
                            broadcastGroupMessage(updatedMessage, []); // Send updated message to clients
                        }
                    }
                } catch (error) {
                    console.error("Error updating message status:", error);
                }
            });

            


            
            // Join a group
            socket.on('joinGroup', (groupId) => {
                if (!groups[groupId]) {
                    groups[groupId] = [];
                }
                if (!groups[groupId].includes(userId)) {
                    groups[groupId].push(userId);
                    socket.join(groupId);
                    io.to(groupId).emit('userJoinedGroup', { userId, groupId });
                }
            });

            // Leave a group
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

            // Leave a one-to-one conversation
            socket.on('leaveConversation', (otherUserId) => {
                if (activeConversations[userId] && activeConversations[userId][otherUserId]) {
                    delete activeConversations[userId][otherUserId];
                }
                if (activeConversations[otherUserId] && activeConversations[otherUserId][userId]) {
                    delete activeConversations[otherUserId][userId];
                }
            });

            // Handle user discfonnection
            socket.on('disconnect', () => {
                if (socket.userId) {
                    delete clients[socket.userId];
                    broadcastActiveUsers();
                    for (const groupId in groups) {
                        const groupMembers = groups[groupId];
                        const index = groupMembers.indexOf(socket.userId);
                        if (index > -1) {
                            groupMembers.splice(index, 1);
                        }
                    }
                    for (const otherUserId in activeConversations[socket.userId]) {
                        delete activeConversations[socket.userId][otherUserId];
                    }
                }
            });


            // Typing event handler with groupId
            const typingUsers = {};
            socket.on('typing', (groupId, userId, userName) => {
              if (!typingUsers[groupId]) {
                typingUsers[groupId] = [];
              }
              const userExists = typingUsers[groupId].some(user => user.userId === userId);
              if (!userExists) {
                typingUsers[groupId].push({ userId, userName });
              }
              socket.to(groupId).emit('typing', groupId, typingUsers[groupId]);
            });
            // Stop typing event handler
            socket.on('stopTyping', (groupId, userId, userName) => {
              if (typingUsers[groupId]) {
                typingUsers[groupId] = typingUsers[groupId].filter(user => user.userId !== userId);
                socket.to(groupId).emit('stopTyping', groupId, typingUsers[groupId]);
              }
            });

            socket.on('joinCheckId', (checkId) => {           
                socket.join(checkId);
            });
            

        // Listen for 'clearMessages' event from the client
        socket.on('clearMessages', async (payload) => {
            const { userId, clearId } = payload;
            try {
                const messages = await Message.findAll({
                    where: {
                      sender_id: clearId,  
                      receiver_id: userId,  
                      status: 'uncheck'    
                    }
                  });
                if (messages.length === 0) {
                    socket.emit('clearMessagesResponse', []);
                    return;
                }
                const messageIds = messages.map(msg => msg.message_id);

                const [updatedCount] = await Message.update(
                    { status: 'check' },
                    {
                      where: {
                        sender_id: clearId,
                        receiver_id: userId,
                        status: 'uncheck'
                      }
                    }
                  );
        
                // Find the updated messages to log their new status
                const updatedMessages = await Message.findAll({
                    where: {
                        message_id: messageIds,
                    }
                });
                if (clients[clearId]) {
                    clients[clearId].emit('senderMessage', updatedMessages);
                }
                // Optionally send the updated messages to the original socket that requested the clear
                socket.emit('clearMessagesResponse', updatedMessages);
        
            } catch (error) {
                console.error('Error while clearing messages:', error);
                socket.emit('clearMessagesResponse', { error: 'An error occurred' });
            }
        });
        
    
        // Function to broadcast active user list
        function broadcastActiveUsers() {
            const activeUsers = Object.keys(clients).map(userId => {
                return { userId, userName: clients[userId].userName };  
            });
            io.emit('activeUserList', activeUsers);
            logId = activeUsers;
        }



        } catch (err) {
            console.error('Error verifying token: ', err);
            socket.disconnect();
        }
    });
}

module.exports = websocketRoute;
