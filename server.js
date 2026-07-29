// ==========================================
// EXPRESS
// ==========================================

const express = require("express");


// ==========================================
// HTTP
// ==========================================

const http = require("http");


// ==========================================
// SOCKET.IO
// ==========================================

const { Server } = require("socket.io");


// ==========================================
// PATH
// ==========================================

const path = require("path");


// ==========================================
// APP
// ==========================================

const app =
    express();


// ==========================================
// HTTP SERVER
// ==========================================

const server =
    http.createServer(
        app
    );


// ==========================================
// SOCKET.IO SERVER
// ==========================================

const io =
    new Server(
        server
    );


// ==========================================
// PORT
// ==========================================

const PORT =
    process.env.PORT ||
    3000;


// ==========================================
// SERVE FRONTEND
// ==========================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// ==========================================
// MEETING ROOMS
// ==========================================

const rooms = {};


// ==========================================
// SOCKET CONNECTION
// ==========================================

io.on(
    "connection",
    (socket) => {

        console.log(
            "User connected:",
            socket.id
        );


        // ==================================
        // JOIN MEETING ROOM
        // ==================================

        socket.on(
            "join-room",
            ({
                roomId,
                userName
            }) => {

                // Validate

                if (
                    !roomId ||
                    !userName
                ) {

                    return;

                }


                // Join Socket.IO Room

                socket.join(
                    roomId
                );


                // Save User Info

                socket.roomId =
                    roomId;

                socket.userName =
                    userName;


                // Create Room

                if (
                    !rooms[
                        roomId
                    ]
                ) {

                    rooms[
                        roomId
                    ] = [];

                }


                // ==================================
                // PREVENT DUPLICATE USER
                // ==================================

                const alreadyExists =
                    rooms[
                        roomId
                    ].some(
                        user =>
                            user.socketId ===
                            socket.id
                    );


                if (
                    !alreadyExists
                ) {

                    rooms[
                        roomId
                    ].push({

                        socketId:
                            socket.id,

                        userName:
                            userName

                    });

                }


                // ==================================
                // GET EXISTING USERS
                // ==================================

                const existingUsers =
                    rooms[
                        roomId
                    ].filter(
                        user =>
                            user.socketId !==
                            socket.id
                    );


                // ==================================
                // SEND EXISTING USERS
                // ==================================

                socket.emit(
                    "existing-users",
                    existingUsers
                );


                // ==================================
                // NOTIFY OTHER USERS
                // ==================================

                socket
                    .to(
                        roomId
                    )
                    .emit(
                        "user-joined",
                        {

                            socketId:
                                socket.id,

                            userName:
                                userName

                        }
                    );


                console.log(
                    `${userName} joined room: ${roomId}`
                );

            }
        );


        // ==========================================
        // WEBRTC OFFER
        // IMPORTANT: FORWARD USER NAME
        // ==========================================

        socket.on(
            "offer",
            ({
                target,
                offer,
                userName
            }) => {

                console.log(
                    "Offer from:",
                    socket.id,
                    "Name:",
                    userName,
                    "To:",
                    target
                );


                io.to(
                    target
                ).emit(
                    "offer",
                    {

                        sender:
                            socket.id,

                        offer:
                            offer,

                        // Send actual name
                        userName:
                            userName ||
                            socket.userName ||
                            "Participant"

                    }
                );

            }
        );


        // ==========================================
        // WEBRTC ANSWER
        // ==========================================

        socket.on(
            "answer",
            ({
                target,
                answer
            }) => {

                console.log(
                    "Answer from:",
                    socket.id,
                    "To:",
                    target
                );


                io.to(
                    target
                ).emit(
                    "answer",
                    {

                        sender:
                            socket.id,

                        answer:
                            answer

                    }
                );

            }
        );


        // ==========================================
        // ICE CANDIDATE
        // ==========================================

        socket.on(
            "ice-candidate",
            ({
                target,
                candidate
            }) => {

                if (
                    !target ||
                    !candidate
                ) {

                    return;

                }


                io.to(
                    target
                ).emit(
                    "ice-candidate",
                    {

                        sender:
                            socket.id,

                        candidate:
                            candidate

                    }
                );

            }
        );


        // ==========================================
        // CHAT MESSAGE
        // ==========================================

        socket.on(
            "chat-message",
            ({
                roomId,
                userName,
                message
            }) => {

                if (
                    !roomId ||
                    !message
                ) {

                    return;

                }


                io.to(
                    roomId
                ).emit(
                    "chat-message",
                    {

                        userName:
                            userName ||
                            socket.userName ||
                            "Participant",

                        message:
                            message

                    }
                );

            }
        );


        // ==========================================
        // LEAVE ROOM
        // ==========================================

        socket.on(
            "leave-room",
            () => {

                removeUser(
                    socket
                );

            }
        );


        // ==========================================
        // DISCONNECT
        // ==========================================

        socket.on(
            "disconnect",
            () => {

                removeUser(
                    socket
                );


                console.log(
                    "User disconnected:",
                    socket.id
                );

            }
        );

    }
);


// ==========================================
// REMOVE USER
// ==========================================

function removeUser(
    socket
) {

    const roomId =
        socket.roomId;


    // No Room

    if (
        !roomId ||
        !rooms[
            roomId
        ]
    ) {

        return;

    }


    // ==================================
    // REMOVE USER FROM ROOM
    // ==================================

    rooms[
        roomId
    ] =
        rooms[
            roomId
        ].filter(
            user =>
                user.socketId !==
                socket.id
        );


    // ==================================
    // NOTIFY OTHER USERS
    // ==================================

    socket
        .to(
            roomId
        )
        .emit(
            "user-left",
            socket.id
        );


    // ==================================
    // DELETE EMPTY ROOM
    // ==================================

    if (
        rooms[
            roomId
        ].length === 0
    ) {

        delete rooms[
            roomId
        ];

    }


    // ==================================
    // LEAVE SOCKET ROOM
    // ==================================

    socket.leave(
        roomId
    );


    // ==================================
    // RESET SOCKET DATA
    // ==================================

    socket.roomId =
        null;

    socket.userName =
        null;

}


// ==========================================
// HOME PAGE
// ==========================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


// ==========================================
// START SERVER
// ==========================================

server.listen(
    PORT,
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);
