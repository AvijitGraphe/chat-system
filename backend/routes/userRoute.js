const express = require("express");
const User = require("../models/User");
const Message = require("../models/Message");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op, where } = require('sequelize');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const GroupMessageRead = require('../models/GroupMessageRead');


require("dotenv").config();
const { authenticateToken } = require('../middleware/authMiddleware');


const { Sequelize } = require('sequelize');
const ChatFile = require("../models/ChatFile");

const JWT_SECRET = process.env.JWT_SECRET;

const generateAccessToken = (user) => {
    return jwt.sign(user, JWT_SECRET, { expiresIn: "10h" });
};

// Login Route
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email: email } });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const userPayload = { id: user.user_id, email: user.email };
        const accessToken = generateAccessToken(userPayload);
        const fullName = `${user.username}`;
        res.status(201).json({
            message: "Login successful",
            userId: user.user_id,
            userName: fullName,
            accessToken,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Signup Route
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = await User.findOne({ where: { email: email } });
        if (user) {
            return res.status(400).json({ error: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
        });
        const fullName = `${newUser.username}`;
        res.status(201).json({ message: "User registered successfully", name: fullName });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get User List
router.get('/getUser', authenticateToken, async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    try {
        const users = await User.findAll({
            where: {
                user_id: { [Sequelize.Op.ne]: userId } 
            }
        });
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Send Message
router.post('/messages', async (req, res) => {
    const { senderId, receiverId, groupId, content } = req.body;
    try {
        const newMessage = await Message.create({
            sender_id: senderId,
            receiver_id: receiverId,
            group_id: groupId,
            content,
            timestamp: new Date(),
            is_read: false,
        });
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get Messages
router.get('/messages', async (req, res) => {
    const { userId, groupId } = req.query;
    try {
        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { sender_id: userId },
                    { receiver_id: userId },
                    { group_id: groupId },
                ],
            },
            order: [['create_at', 'desc']],
        });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve messages' });
    }
});

router.get('/getMessages', async (req, res) => {
    const { userId, otherUserId } = req.query;
    if (!userId || !otherUserId) {
        return res.status(400).json({ error: 'Both userId and otherUserId are required' });
    }
    try {
        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { sender_id: userId, receiver_id: otherUserId },
                    { sender_id: otherUserId, receiver_id: userId }
                ]
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['user_id', 'username']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: ['user_id', 'username']
                }
            ],
            order: [['message_id', 'ASC']] 
        });

        // If no messages are found, return 404
        if (messages.length === 0) {
            return res.status(200).json([]);
        }
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
                    status: msg.status,
                    files: files.map(file => ({
                        file_id: file.file_id,
                        file_name: file.file_name
                    }))
                };
            })
        );
        res.json(messagesWithFiles);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Create Group
router.post('/createGroup', async (req, res) => {
    const { groupName, selectedUsers, userId } = req.body;
    try {
        const group = await Group.create({
            group_name: groupName,
            created_by: userId,
        });
        const groupCreator = { group_id: group.group_id, user_id: userId };
        const userIds = selectedUsers.map(user => user.user_id);
        const groupMembers = userIds.map(userId => {
            return { group_id: group.group_id, user_id: userId , group_name:group.group_name};
        });
        groupMembers.push(groupCreator);
        await GroupMember.bulkCreate(groupMembers);
        res.status(201).json({ message: 'Group created successfully' });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Get Groups
router.get('/getGroups', async (req, res) => {
    const { userId } = req.query;
    try {
        const groupMembers = await GroupMember.findAll({
            where: { user_id: userId },
            attributes: ['group_id'],
        });
        const groupIds = groupMembers.map(member => member.group_id);
        if (groupIds.length === 0) {
            return res.status(202).json([]);
        }
        const groups = await Group.findAll({
            where: { group_id: groupIds },
        });
        res.status(200).json(groups);
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//get api through which the group members can be fetched
router.get('/getGroupMembers', async (req, res) => {
    const { groupId } = req.query;
    try {
        const groupMembers = await GroupMember.findAll({
            where: { group_id: groupId },
            attributes: ['user_id'],
        });
        const userIds = groupMembers.map(member => member.user_id);
        const users = await User.findAll({
            where: { user_id: userIds },
            attributes: ['user_id', 'username'],
        });
        const groupMembersWithGroupId = users.map(user => ({
            user_id: user.user_id,
            username: user.username,
            group_id: groupId, 
        }));
        res.status(200).json(groupMembersWithGroupId);
    } catch (error) {
        console.error('Error fetching group members:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Get Group Messages
router.get('/getGroupMessages', async (req, res) => {
    const { groupId } = req.query;
    try {
        const messages = await Message.findAll({
            where: { group_id: groupId },
            include: [
                {
                    model: User,
                    as: 'sender', 
                    attributes: ['user_id', 'username'] 
                }
            ],
            order: [['message_id', 'ASC']],
        });
        // If no messages are found, return 404
        if (messages.length === 0) {
            return res.status(202).json([]);
        }
        const messagesWithFiles = await Promise.all(
            messages.map(async (msg) => {
                const files = await ChatFile.findAll({
                    where: { message_id: msg.message_id },
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
                    status:msg.status,
                    files: files.map(file => ({
                        file_id: file.file_id,
                        file_name: file.file_name,
                    })),
                };
            })
        );
        res.status(200).json(messagesWithFiles);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: 'Failed to retrieve messages' });
    }
});


//get api through which the message length can be fetched
router.get('/getMessageLength', async (req, res) => {
    try {
       const { userId } = req.query;
       const messages = await Message.findAll({
           where: {
               receiver_id: userId,  
               status: 'uncheck',    
           }
       });
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
       const resultArray = Object.entries(messageCounts).map(([key, value]) => {
           const [sender, receiver] = key.split(" to ");  
           return { [sender]: value };  
       });
       res.status(200).json(resultArray)
    } catch (error) {
       console.error("Error fetching messages:", error);
       res.status(500).json({ error: "Failed to retrieve messages" });
    }
 });
 



//get api through which the group message length can be fetched
router.get('/getGroupMessageLength', async (req, res) => {
    try {
        const { userId } = req.query;
        // Find all groups the user is a member of
        const groups = await GroupMember.findAll({
            where: { user_id: userId }
        });
        if (!groups.length) {
            return res.status(202).json([]);
        }
        const groupIds = groups.map(group => group.group_id);
        const messages = await Message.findAll({
            where: {
                group_id: groupIds,
                status: 'uncheck',
                sender_id: {
                    [Op.ne]: userId  
                }
            }
        });


        if (!messages.length) {
            return res.status(202).json([]);
        }
        const readMessages = await GroupMessageRead.findAll({
            where: {
                group_id: groupIds,
                user_id: userId,
                status: 'check'  
            }
        });
        const readMessageIds = new Set(readMessages.map(read => read.message_id));
        const messageDetails = messages.map(message => {
            const isRead = readMessageIds.has(message.message_id);
            return {
                group_id: message.group_id,
                sender_id: message.sender_id,
                unread: isRead ? 0 : 1 
            };
        });
        const groupedMessageDetails = messageDetails.reduce((acc, msg) => {
            const group = acc.find(g => g.group_id === msg.group_id);
            if (group) {
                group.unread += msg.unread;
            } else {
                acc.push({
                    group_id: msg.group_id,
                    unread: msg.unread,
                });
            }
            return acc;
        }, []);

        res.json(groupedMessageDetails);

    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to retrieve messages" });
    }
});


//get api through which the user name can be fetched
router.post('/getGroupMessageRead', async (req, res) => {
    try {
        const { userId, groupId } = req.body; 
        // Check if the user is a member of the group
        const groupMember = await GroupMember.findOne({
            where: {
                user_id: userId,
                group_id: groupId
            }
        });
        if (!groupMember) {
            return res.status(202).json([]);
        }

        const messages = await Message.findAll({
            where: {
                group_id: groupId, 
                status: 'uncheck',   
                sender_id: {          
                    [Op.ne]: userId   
                }
            }
        });

        // If no messages are found
        if (!messages.length) {
            return res.status(202).json([]);
        }

        // Mark messages as read for the user
        const data = await Promise.all(messages.map(async (msg) => {
            // Upsert read status for each message
            const readResponse = await GroupMessageRead.upsert({
                user_id: userId,
                group_id: groupId,
                message_id: msg.message_id,
                status: 'check', // Mark as read
            });
            return readResponse;
        }));

        // Send response with data
        res.status(200).json(data);
    } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ error: "Failed to mark messages as read" });
    }
});

//get api through which the last messages can be fetched
router.get('/getLastMessagesByUser', async (req, res) => {
    try {
        const { userId, user_ids } = req.query;
        const userIdsArray = Array.isArray(user_ids) ? user_ids : JSON.parse(user_ids);
        if (!userId || !userIdsArray || userIdsArray.length === 0) {
            return res.status(202).json([]);
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
                limit: 1  
            });

            if (messages.length > 0) {
                lastMessages.push(messages[0]);  
            }
        }

        res.json(lastMessages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch last messages" });
    }
});

//get api through 
router.get('/getUserName', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const user = await User.findOne({
            where: { user_id: userId }
        });
        if (!user) {
            return res.status(202).json([]);
        }
        res.status(200).json(user.username);
    } catch (error) {
        console.error('Error fetching user name:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//get last group message
router.get('/getLastGroupMessage', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        const groupMembers = await GroupMember.findAll({
            where: { user_id: userId }
        });
        const groupIds = groupMembers.map(group => group.group_id);

        if (groupIds.length === 0) {
            return res.status(202).json([]);
        }
        const lastMessagesPromises = groupIds.map(async (groupId) => {
            const messages = await Message.findAll({
                where: { group_id: groupId },
                order: [['created_at', 'DESC']],
                limit: 1
            });
            return {
                groupId,
                content: messages.length > 0 ? messages[0].content : null
            };
        });
        const lastMessages = await Promise.all(lastMessagesPromises);
        res.json(lastMessages);
    } catch (error) {
        console.error('Error fetching last group message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;
