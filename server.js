const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Meeting rooms
const rooms = {};

io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    // Join meeting
    socket.on("join-room", ({ roomId, userName }) => {

        socket.join(roomId);

        socket.roomId = roomId;
        socket.userName = userName;

        if (!rooms[roomId]) {
            rooms[roomId] = [];
        }

        rooms[roomId].push({
            socketId: socket.id,
            userName: userName
        });

        // Send existing users to new user
        const existingUsers = rooms[roomId].filter(
            user => user.socketId !== socket.id
        );

        socket.emit("existing-users", existingUsers);

        // Notify others
        socket.to(roomId).emit("user-joined", {
            socketId: socket.id,
            userName: userName
        });

        console.log(
            `${userName} joined room: ${roomId}`
        );
    });

    // WebRTC Offer
    socket.on("offer", ({ target, offer }) => {

        io.to(target).emit("offer", {
            sender: socket.id,
            offer
        });

    });

    // WebRTC Answer
    socket.on("answer", ({ target, answer }) => {

        io.to(target).emit("answer", {
            sender: socket.id,
            answer
        });

    });

    // ICE Candidate
    socket.on("ice-candidate", ({ target, candidate }) => {

        io.to(target).emit("ice-candidate", {
            sender: socket.id,
            candidate
        });

    });

    // Chat Message
    socket.on("chat-message", ({ roomId, userName, message }) => {

        io.to(roomId).emit("chat-message", {
            userName,
            message
        });

    });

    // Leave room
    socket.on("leave-room", () => {
        removeUser(socket);
    });

    // Disconnect
    socket.on("disconnect", () => {

        removeUser(socket);

        console.log(
            "User disconnected:",
            socket.id
        );

    });

});

function removeUser(socket) {

    const roomId = socket.roomId;

    if (!roomId || !rooms[roomId]) {
        return;
    }

    rooms[roomId] = rooms[roomId].filter(
        user => user.socketId !== socket.id
    );

    socket.to(roomId).emit(
        "user-left",
        socket.id
    );

    if (rooms[roomId].length === 0) {
        delete rooms[roomId];
    }

    socket.leave(roomId);

}

app.use((req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});

server.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});