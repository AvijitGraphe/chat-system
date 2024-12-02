const WebSocket = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');
require("dotenv").config();
const ChatFile = require('../models/ChatFile');
const { Op } = require('sequelize');

const { Sequelize } = require('sequelize');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const GroupMessageRead = require('../models/GroupMessageRead');


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

            //user message data
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
            
            //respone the data
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
              
            
            //rspone the group message
            socket.on('sendGroupMessage', async (msg) => {
                try {
                    if (!msg.senderId || !msg.content || !msg.groupId) {
                        console.error("Missing required fields: senderId, content, or groupId");
                        socket.emit('error', { message: 'Sender, content, and group are required' });
                        return;
                    }
                    const groupMembers = await GroupMember.findAll({
                        where: { group_id: msg.groupId }
                    });
                    const membersWithoutSender = groupMembers.filter(member => member.dataValues.user_id !== parseInt(msg.senderId));
                    const userIdsWithoutSender = membersWithoutSender.map(member => member.dataValues.user_id);
                    const activeUsers = Object.keys(clients).map(userId => parseInt(userId));
                    const isAnyMemberActive = userIdsWithoutSender.some(userId => activeUsers.includes(userId));
                    const messageStatus = isAnyMemberActive ? "check" : "uncheck";
                    const newMessage = await Message.create({
                        sender_id: msg.senderId,
                        group_id: msg.groupId,
                        content: msg.content,
                        prevMessageId: msg.prevMessageId,
                        prevContent: msg.prevContent,
                        sender_name: msg.sender_name,
                        rebackName: msg.rebackName,
                        is_read: false,
                        group_status: 'uncheck'
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
                    status: message.status,
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
        



            //get message
            // Listen for the 'getMessages' event from the client
            socket.on('getMessages', async ({ userId, otherUserId }) => {
                try {
                // Fetch messages from the database (same logic as before)
                const messages = await Message.findAll({
                    where: {
                    [Op.or]: [
                        { sender_id: userId, receiver_id: otherUserId },
                        { sender_id: otherUserId, receiver_id: userId }
                    ]
                    },
                    include: [
                    { model: User, as: 'sender', attributes: ['user_id', 'username'] },
                    { model: User, as: 'receiver', attributes: ['user_id', 'username'] }
                    ],
                    order: [['message_id', 'ASC']]
                });

                // If no messages, send an empty array
                if (messages.length === 0) {
                    socket.emit('messages', []);
                    return;
                }

                // Process files associated with the messages
                const messagesWithFiles = await Promise.all(
                    messages.map(async (msg) => {
                    const files = await ChatFile.findAll({
                        where: { message_id: msg.message_id }
                    });

                    return {
                        message_id: msg.message_id,
                        sender_id: msg.sender_id,
                        receiver_id: msg.receiver_id,
                        sender_name: msg.sender.username,
                        receiver_name: msg.receiver.username,
                        content: msg.content,
                        timestamp: msg.created_at,
                        prevContent: msg.prevContent,
                        prevMessageId: msg.prevMessageId,
                        rebackName: msg.rebackName,
                        group_status: msg.group_status,
                        status: msg.status,
                        files: files.map(file => ({
                        file_id: file.file_id,
                        file_name: file.file_name
                        }))
                    };
                    })
                );

                // Emit the fetched messages to the client
                socket.emit('messages', messagesWithFiles);
                } catch (error) {
                console.error('Error fetching messages:', error);
                socket.emit('error', 'Internal Server Error');
                }
            });
        
            // Listen for the 'getMessageLength' event from the client
            socket.on('getMessageLength', async (userId) => {
                try {
                // Fetch unread messages (status 'uncheck') for the given userId
                const messages = await Message.findAll({
                    where: {
                    receiver_id: userId,  // Messages for this user
                    status: 'uncheck',    // Unread messages
                    }
                });

                // Count messages by sender and receiver
                const messageCounts = messages.reduce((acc, message) => {
                    const sender = message.sender_id;
                    const receiver = message.receiver_id;
                    const key = `${sender} to ${receiver}`;
                    if (!acc[key]) {
                    acc[key] = 0;
                    }
                    acc[key]++;

                    return acc;
                }, {});

                // Convert the counts into an array format
                const resultArray = Object.entries(messageCounts).map(([key, value]) => {
                    const [sender, receiver] = key.split(" to ");
                    return { [sender]: value };
                });

                // Emit the result to the client
                socket.emit('messageLength', resultArray);
                } catch (error) {
                console.error("Error fetching message length:", error);
                socket.emit('error', 'Failed to retrieve message counts');
                }
            });



            // Listen for the 'getUserName' event from the client
            socket.on('getUserName', async (userId) => {
                try {
                // Check if userId is provided
                if (!userId) {
                    socket.emit('error', 'userId is required');
                    return;
                }
                // Fetch the user by userId
                const user = await User.findOne({
                    where: { user_id: userId }
                });

                if (!user) {
                    socket.emit('getUserNameResponse', null);  // User not found, return null
                    return;
                }
                // Send the username back to the client
                socket.emit('getUserNameResponse', user.username);
                } catch (error) {
                console.error('Error fetching user name:', error);
                socket.emit('error', 'Internal server error');
                }
            });



            // Listen for the 'getUserList' event from the client
            socket.on('getUserList', async (userId) => {
                try {
                // Check if userId is provided
                if (!userId) {
                    socket.emit('error', 'userId is required');
                    return;
                }

                // Fetch all users except the current user
                const users = await User.findAll({
                    where: {
                    user_id: { [Sequelize.Op.ne]: userId } 
                    }
                });

                // Send the list of users to the client
                socket.emit('userListResponse', users);
                } catch (error) {
                console.error('Error fetching user list:', error);
                socket.emit('error', 'Internal server error');
                }
            });



            // Listen for the 'getGroups' event from the client
            socket.on('getGroups', async (userId) => {
                try {
                // Fetch group IDs where the user is a member
                const groupMembers = await GroupMember.findAll({
                    where: { user_id: userId },
                    attributes: ['group_id'],
                });
                
                const groupIds = groupMembers.map(member => member.group_id);

                if (groupIds.length === 0) {
                    // Emit an empty array if no groups found
                    socket.emit('groupsResponse', []);
                    return;
                }

                // Fetch the groups based on the group IDs
                const groups = await Group.findAll({
                    where: { group_id: groupIds },
                });

                // Emit the groups to the client
                socket.emit('groupsResponse', groups);
                } catch (error) {
                console.error('Error fetching groups:', error);
                socket.emit('error', 'Internal server error');
                }
            });

            // Listen for the 'getGroupMembers' event from the client
            socket.on('getGroupMembers', async (groupId) => {
                try {
                // Fetch group members for the given groupId
                const groupMembers = await GroupMember.findAll({
                    where: { group_id: groupId },
                    attributes: ['user_id'],
                });

                const userIds = groupMembers.map(member => member.user_id);

                // Fetch user details for each userId
                const users = await User.findAll({
                    where: { user_id: userIds },
                    attributes: ['user_id', 'username'],
                });

                // Combine user details with the groupId
                const groupMembersWithGroupId = users.map(user => ({
                    user_id: user.user_id,
                    username: user.username,
                    group_id: groupId,
                }));

                // Emit the group members list to the client
                socket.emit('groupMembersResponse', groupMembersWithGroupId);
                } catch (error) {
                console.error('Error fetching group members:', error);
                socket.emit('error', 'Internal server error');
                }
            });



            // Listen for the 'getLastGroupMessage' event from the client
            socket.on('getLastGroupMessage', async (userId) => {
                try {
                if (!userId) {
                    return socket.emit('error', 'userId is required');
                }

                // Get all groups the user is part of
                const groupMembers = await GroupMember.findAll({
                    where: { user_id: userId }
                });

                const groupIds = groupMembers.map(group => group.group_id);

                if (groupIds.length === 0) {
                    return socket.emit('lastGroupMessages', []); // No groups
                }

                // Get the last message from each group
                const lastMessagesPromises = groupIds.map(async (groupId) => {
                    const messages = await Message.findAll({
                    where: { group_id: groupId },
                    order: [['created_at', 'DESC']],
                    limit: 1
                    });

                    return {
                    groupId,
                    content: messages.length > 0 ? messages[0].content : null,
                    created_at: messages.length > 0 ? messages[0].created_at : null  
                    };
                });

                const lastMessages = await Promise.all(lastMessagesPromises);
                
                // Emit the last messages to the client
                socket.emit('lastGroupMessages', lastMessages);

                } catch (error) {
                console.error('Error fetching last group message:', error);
                socket.emit('error', 'Internal server error');
                }
            });


            // Listen for the 'getLastMessagesByUser' event
            socket.on('getLastMessagesByUser', async (userId, userIdsArray) => {
                try {
                if (!userId || !userIdsArray || userIdsArray.length === 0) {
                    return socket.emit('error', 'userId or userIdsArray is missing');
                }

                const lastMessages = [];
                for (const receiverId of userIdsArray) {
                    const messages = await Message.findAll({
                    where: {
                        [Op.or]: [
                        { sender_id: userId, receiver_id: receiverId },
                        { sender_id: receiverId, receiver_id: userId }
                        ]
                    },
                    order: [['created_at', 'DESC']],
                    limit: 1  // Get only the most recent message
                    });

                    if (messages.length > 0) {
                    lastMessages.push(messages[0]);  // Add the last message to the array
                    }
                }

                // Emit the last messages to the client
                socket.emit('lastMessagesByUser', lastMessages);
                } catch (error) {
                console.error("Error fetching last messages:", error);
                socket.emit('error', 'Failed to fetch last messages');
                }
            });


            // Listen for the 'getGroupMessages' event
            socket.on('getGroupMessages', async (groupId) => {
                const log = await GroupMessageRead.findAll({
                    where: { group_id: parseInt(groupId, 10) },
                });
            
                try {
                    // Fetch group messages from the database
                    const messages = await Message.findAll({
                        where: { group_id: groupId },
                        include: [
                            {
                                model: User,
                                as: 'sender',
                                attributes: ['user_id', 'username']
                            }
                        ],
                        order: [['message_id', 'ASC']]
                    });
            
                    // If no messages are found, return an empty array
                    if (messages.length === 0) {
                        return socket.emit('groupMessages', []);
                    }
                    const messagesWithFiles = await Promise.all(
                        messages.map(async (msg) => {
                            const logEntry = log.find(item => item.message_id === msg.message_id);
                            const logStatus = logEntry ? logEntry.status : 'uncheck';
            
    
                            // Fetch the attached files for this message
                            const files = await ChatFile.findAll({
                                where: { message_id: msg.message_id }
                            });
            
                            return {
                                message_id: msg.message_id,
                                sender_id: msg.sender_id,
                                sender_name: msg.sender ? msg.sender.username : null,
                                group_id: msg.group_id,
                                content: msg.content,
                                prevContent: msg.prevContent,
                                prevMessageId: msg.prevMessageId,
                                rebackName: msg.rebackName,
                                timestamp: msg.created_at,
                                status: msg.status,
                                logStatus: logStatus,  
                                group_status: msg.group_status,
                                files: files.map(file => ({
                                    file_id: file.file_id,
                                    file_name: file.file_name
                                }))
                            };
                        })
                    );
            
                    // Emit the group messages with all the relevant data
                    socket.emit('groupMessages', messagesWithFiles);
                } catch (error) {
                    console.error("Error fetching group messages: ", error);
                    socket.emit('groupMessages', []);
                }
            });
            


    
            // Listen for the 'getGroupMessageRead' event
            socket.on('getGroupMessageRead', async (userId, groupId, messageId, logArray) => {
                try {
                    // Check if the user is a member of the group
                    const groupMember = await GroupMember.findOne({
                        where: { user_id: userId, group_id: groupId }
                    });
                    // If the user is not a member of the group, return an empty response
                    if (!groupMember) {
                        return socket.emit('groupMessageRead', []);
                    }
                    // Fetch the unread messages for the group that are not sent by the user
                    const messages = await Message.findAll({
                        where: {
                            group_id: groupId,
                            status: 'uncheck',
                            sender_id: { [Op.ne]: userId } 
                        }
                    });
                    // If no unread messages are found, return an empty response
                    if (!messages.length) {
                        return socket.emit('groupMessageRead', []);
                    }
                    const data = await Promise.all(messages.map(async (msg) => {
                        // Check if the record already exists in GroupMessageRead
                        const existingRecord = await GroupMessageRead.findOne({
                            where: {
                                user_id: userId,
                                group_id: groupId,
                                message_id: msg.message_id
                            }
                        });
                        if (!existingRecord) {
                            const readResponse = await GroupMessageRead.upsert({
                                user_id: userId,
                                group_id: groupId,
                                message_id: msg.message_id,
                                status: 'check', // Mark as read
                                updated_at: new Date() 
                            });
                            return readResponse;
                        } else {
                            return { message_id: msg.message_id, status: 'already read' };
                        }
                    }));

                    // Emit the response with the updated message read data
                    socket.emit('groupMessageRead', data);

                    groupMessageVerify(groupId, messageId, logArray)

                } catch (error) {
                    console.error('Error marking messages as read:', error);
                    socket.emit('error', 'Failed to mark messages as read');
                }
            });

            
            const groupMessageVerify = async (groupId, messageIds, logArray) => {
                try {
                  // Ensure messageIds is an array
                  if (!Array.isArray(messageIds)) {
                    messageIds = [messageIds]; // Convert single messageId into an array
                  }
              
                  // Fetch the group members
                  const groupMembers = await GroupMember.findAll({ where: { group_id: groupId } });
                  const userIds = groupMembers.map(member => member.user_id);
              
                  // Fetch the sender IDs for the messages
                  const senderId = await Message.findAll({ where: { message_id: messageIds } });
                  const senderIds = senderId.map(ids => ids.sender_id);
              
                  let allChecked = true;
              
                  for (const msgId of messageIds) {
                    // Check the read statuses for the message
                    const readStatuses = await GroupMessageRead.findAll({
                      where: { group_id: groupId, message_id: msgId, status: 'check' },
                    });
              
                    const checkedUserIds = readStatuses.map(status => status.user_id);
                    const uncheckedUsers = userIds.filter(userId => 
                      !checkedUserIds.includes(userId) && !senderIds.includes(userId)
                    );
              
                    if (uncheckedUsers.length > 0) {
                      allChecked = false; // Set to false if any user hasn't checked
                    }
                  }
              
                  if (allChecked) {
                    // Update message status to 'check' if all users have read it
                    const verify = await Message.update(
                      { status: 'check' }, 
                      { where: { message_id: messageIds } }
                    );
              
                    if (verify[0] > 0) {
                      // Fetch the updated message(s) after update
                      const updatedMessage = await Message.findOne({
                        where: { message_id: messageIds }
                      });
              
                      console.log("Updated message(s):", updatedMessage);
              
                      // Emit the response with the updated message ID
                      socket.emit('groupMessageVerifyRespone', updatedMessage);
                    }
                  } else {
                    console.log("Not all users have checked the message.");
                  }
                } catch (error) {
                  console.error('Error verifying group message status:', error);
                  socket.emit('error', 'Failed to verify group message status');
                }
              };
            


            // Listen for the 'getGroupMessageLength' event
            socket.on('getGroupMessageLength', async (userId) => {
                try {
                    // Find all groups the user is a member of
                    const groups = await GroupMember.findAll({
                        where: { user_id: userId }
                    });
            
                    // If no groups are found, return an empty response
                    if (!groups.length) {
                        return socket.emit('groupMessageLength', []);
                    }
            
                    const groupIds = groups.map(group => group.group_id);
            
                    // Find all unread messages for these groups
                    const messages = await Message.findAll({
                        where: {
                            group_id: groupIds,
                            status: 'uncheck',
                            sender_id: { [Op.ne]: userId }  // Exclude the messages sent by the user
                        }
                    });
            
                    if (!messages.length) {
                        return socket.emit('groupMessageLength', []);
                    }
            
                    // Find the read messages for the user in these groups
                    const readMessages = await GroupMessageRead.findAll({
                        where: {
                            group_id: groupIds,
                            user_id: userId,
                            status: 'check'  // Messages that are marked as read
                        }
                    });
            
                    // Create a Set of read message IDs for quick lookup
                    const readMessageIds = new Set(readMessages.map(read => read.message_id));
            
                    // Determine which messages are unread and group them by group_id
                    const messageDetails = messages.map(message => {
                        const isRead = readMessageIds.has(message.message_id);
                        return {
                            group_id: message.group_id,
                            sender_id: message.sender_id,
                            message_id: message.message_id,  // Include message_id in the result
                            unread: isRead ? 0 : 1  // Mark as unread if the message is not in the read list
                        };
                    });
            
                    // Group messages by group_id and calculate the total unread count for each group
                    const groupedMessageDetails = messageDetails.reduce((acc, msg) => {
                        const group = acc.find(g => g.group_id === msg.group_id);
                        if (group) {
                            group.unread += msg.unread;
                            if (msg.unread === 1) {
                                group.unreadMessages.push(msg.message_id);  // Collect unread message_ids
                            }
                        } else {
                            acc.push({
                                group_id: msg.group_id,
                                unread: msg.unread,
                                unreadMessages: msg.unread === 1 ? [msg.message_id] : []  // Initialize unread messages array
                            });
                        }
                        return acc;
                    }, []);
            
                    // Emit the result back to the client
                    socket.emit('groupMessageLength', groupedMessageDetails);
                } catch (error) {
                    console.error('Error fetching messages length:', error);
                    socket.emit('error', 'Failed to retrieve message length');
                }
            });
            


            // Listen for typing events
            socket.on('typing', (data) => {
                const { userId, groupId, typing, type, receiverId, username } = data;
                if (type === 'group') {
                    // Emit to the group
                    socket.to(groupId).emit('userTyping', { 
                        userId, 
                        groupId, 
                        typing, 
                        type: 'group',
                        username
                    });
                } else if (type === 'user') {
                    // Check if the receiver's socket is connected
                    const receiverSocket = clients[receiverId];
                    if (receiverSocket) {
                        
                        receiverSocket.emit('userTyping', { 
                            userId, 
                            receiverId, 
                            typing, 
                            type: 'user', 
                            username
                        });
                    } else {
                        console.log(`Receiver ${receiverId} is not connected.`);
                       
                    }
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
