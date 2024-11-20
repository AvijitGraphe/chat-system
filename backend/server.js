const express = require("express");
const sequelize = require("./config/database");
const cors = require("cors");
const http = require("http");
const WebSocket = require("./routes/socketRoute");
const userRoutes = require("./routes/userRoute");
const chatRoute = require("./routes/chatRoute");
require("dotenv").config();
const path = require("path");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, "./dist")));

// CORS configuration
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST"],
  credentials: true,
};

// Middleware setup
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// WebSocket setup
WebSocket(server); // Initialize WebSocket

// Use routes
app.use("/api", userRoutes);
app.use("/chat", chatRoute);

// Serve static files from the 'uploads' folder
app.use(
  "/routes/uploads",
  express.static(path.join(__dirname, "routes/uploads"))
);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Sync the Sequelize models
sequelize
  .sync()
  .then(() => {
    console.log("Database connected and models synced.");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
