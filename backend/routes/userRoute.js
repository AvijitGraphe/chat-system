const express = require("express");
const User = require("../models/User");
const Message = require("../models/Message");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op, where } = require('sequelize');
const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');


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
        const fullName = `${user.user_name}`;
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
        const { user_name, email, password } = req.body;
        const user = await User.findOne({ where: { email: email } });
        if (user) {
            return res.status(400).json({ error: "User already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            user_name,
            email,
            password: hashedPassword,
        });
        const fullName = `${newUser.user_name}`;
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
        // Fetch all users except the one matching the userId
        const users = await User.findAll({
            where: {
                user_id: { [Sequelize.Op.ne]: userId } // Exclude the current user
            }
        });
        // Return the list of users excluding the current user
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
            order: [['createdAt', 'desc']],
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
        // Fetch messages between the two users
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
                    attributes: ['user_id', 'user_name']
                },
                {
                    model: User,
                    as: 'receiver',
                    attributes: ['user_id', 'user_name']
                }
            ],
            order: [['message_id', 'ASC']] 
        });

        // If no messages are found, return 404
        if (messages.length === 0) {
            return res.status(200).json([]);
        }
        
        // Fetch associated files for each message asynchronously
        const messagesWithFiles = await Promise.all(
            messages.map(async (msg) => {
                // Fetch the files related to this message
                const files = await ChatFile.findAll({
                    where: { message_id: msg.message_id }
                });

                // Enrich the message data with the file info
                return {
                    message_id: msg.message_id,
                    sender_id: msg.sender_id,
                    receiver_id: msg.receiver_id,
                    sender_name: msg.sender.user_name,
                    receiver_name: msg.receiver.user_name,
                    content: msg.content,
                    timestamp: msg.created_at,
                    prevContent: msg.prevContent,
                    prevMessageId: msg.prevMessageId,
                    rebackName: msg.rebackName,
                    files: files.map(file => ({
                        file_id: file.file_id,
                        file_name: file.file_name
                    }))
                };
            })
        );

        // Return the enriched messages with files
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
            attributes: ['user_id', 'user_name'],
        });
        const groupMembersWithGroupId = users.map(user => ({
            user_id: user.user_id,
            user_name: user.user_name,
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
                    attributes: ['user_id', 'user_name'] 
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
                    sender_name: msg.sender ? msg.sender.user_name : null, 
                    group_id: msg.group_id,
                    content: msg.content,
                    prevContent: msg.prevContent,
                    prevMessageId: msg.prevMessageId,
                    rebackName: msg.rebackName,
                    timestamp: msg.createdAt, 
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
 
 
 router.get('/getClearMessage', async (req, res) => {
    try {
        const { userId } = req.query;
        // Fetch all unchecked messages for the sender
        const messages = await Message.findAll({
            where: {
                sender_id: userId,
                status: 'uncheck',  
            }
        });
        if (messages.length === 0) {
            return res.status(404).json({ message: 'No unchecked messages found' });
        }
        const [updatedCount] = await Message.update(
            { status: 'check' },
            {
                where: {
                    sender_id: userId,
                    status: 'uncheck',
                }
            }
        );
        if (updatedCount === 0) {
            return res.status(400).json({ message: 'No messages were updated' });
        }
        res.status(200).json({ message: 'Messages unchecked successfully', updatedCount });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to clear messages" });
    }
});



  




module.exports = router;
