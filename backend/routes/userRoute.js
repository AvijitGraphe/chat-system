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
// router.get('/getUser', authenticateToken, async (req, res) => {
//     const userId = req.query.userId;
//     if (!userId) {
//         return res.status(400).json({ error: 'userId is required' });
//     }
//     try {
//         const users = await User.findAll({
//             where: {
//                 user_id: { [Sequelize.Op.ne]: userId } 
//             }
//         });
//         res.status(200).json(users);
//     } catch (error) {
//         console.error('Error fetching users:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });



module.exports = router;
