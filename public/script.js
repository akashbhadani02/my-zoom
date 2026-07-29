// ==========================================
// SOCKET.IO
// ==========================================

const socket = io();


// ==========================================
// DOM ELEMENTS
// ==========================================

const joinScreen =
    document.getElementById("joinScreen");

const meetingScreen =
    document.getElementById("meetingScreen");

const userNameInput =
    document.getElementById("userName");

const roomIdInput =
    document.getElementById("roomId");

const joinBtn =
    document.getElementById("joinBtn");

const joinError =
    document.getElementById("joinError");

const localVideo =
    document.getElementById("localVideo");

const localVideoContainer =
    document.getElementById("localVideoContainer");

const videoGrid =
    document.getElementById("videoGrid");

const currentRoom =
    document.getElementById("currentRoom");

const myParticipantName =
    document.getElementById("myParticipantName");

const micBtn =
    document.getElementById("micBtn");

const cameraBtn =
    document.getElementById("cameraBtn");

const screenShareBtn =
    document.getElementById("screenShareBtn");

const participantsBtn =
    document.getElementById("participantsBtn");

const chatBtn =
    document.getElementById("chatBtn");

const leaveBtn =
    document.getElementById("leaveBtn");

const sidePanel =
    document.getElementById("sidePanel");

const panelTitle =
    document.getElementById("panelTitle");

const closePanelBtn =
    document.getElementById("closePanelBtn");

const participantsPanel =
    document.getElementById("participantsPanel");

const chatPanel =
    document.getElementById("chatPanel");

const messages =
    document.getElementById("messages");

const chatInput =
    document.getElementById("chatInput");

const sendChatBtn =
    document.getElementById("sendChatBtn");

const copyRoomBtn =
    document.getElementById("copyRoomBtn");


// ==========================================
// GLOBAL VARIABLES
// ==========================================

let localStream = null;

let screenStream = null;

let currentUserName = "";

let currentRoomId = "";

let isScreenSharing = false;


// ==========================================
// PEER CONNECTIONS
// ==========================================

const peerConnections = {};


// ==========================================
// STORE REMOTE USER NAMES
// ==========================================

const remoteUserNames = {};


// ==========================================
// WEBRTC CONFIG
// ==========================================

const rtcConfiguration = {

    iceServers: [

        {
            urls:
                "stun:stun.l.google.com:19302"
        },

        {
            urls:
                "stun:stun1.l.google.com:19302"
        }

    ]

};


// ==========================================
// JOIN MEETING
// ==========================================

joinBtn.addEventListener(
    "click",
    joinMeeting
);


async function joinMeeting() {

    const userName =
        userNameInput.value.trim();

    const roomId =
        roomIdInput.value.trim();


    // Validate Name

    if (!userName) {

        joinError.textContent =
            "Please enter your name.";

        userNameInput.focus();

        return;

    }


    // Validate Room

    if (!roomId) {

        joinError.textContent =
            "Please enter Meeting ID.";

        roomIdInput.focus();

        return;

    }


    joinError.textContent = "";


    try {

        // ==================================
        // GET CAMERA + MICROPHONE
        // ==================================

        localStream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: true,

                    audio: true

                });


        // ==================================
        // SAVE USER DATA
        // ==================================

        currentUserName =
            userName;

        currentRoomId =
            roomId;


        // ==================================
        // LOCAL VIDEO
        // ==================================

        localVideo.srcObject =
            localStream;


        // ==================================
        // LOCAL USER NAME
        // ==================================

        myParticipantName.textContent =
            currentUserName;


        const localNameLabel =
            localVideoContainer
                .querySelector(
                    ".video-name"
                );


        if (localNameLabel) {

            localNameLabel.textContent =
                currentUserName;

        }


        // ==================================
        // ROOM ID
        // ==================================

        currentRoom.textContent =
            currentRoomId;


        // ==================================
        // SHOW MEETING
        // ==================================

        joinScreen.classList.add(
            "hidden"
        );


        meetingScreen.classList.remove(
            "hidden"
        );


        // ==================================
        // JOIN SOCKET ROOM
        // ==================================

        socket.emit(
            "join-room",
            {

                roomId:
                    currentRoomId,

                userName:
                    currentUserName

            }
        );


    } catch (error) {

        console.error(
            "Camera/Microphone Error:",
            error
        );


        joinError.textContent =
            "Camera અથવા Microphone permission આપો.";

    }

}


// ==========================================
// ENTER KEY JOIN
// ==========================================

userNameInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            joinMeeting();

        }

    }
);


roomIdInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            joinMeeting();

        }

    }
);


// ==========================================
// EXISTING USERS
// ==========================================

socket.on(
    "existing-users",
    async (users) => {

        console.log(
            "Existing Users:",
            users
        );


        for (
            const user of users
        ) {

            if (
                !user ||
                !user.socketId
            ) {

                continue;

            }


            const userName =
                user.userName ||
                "Participant";


            // Save Name

            remoteUserNames[
                user.socketId
            ] =
                userName;


            // Add participant

            addParticipant(
                user.socketId,
                userName
            );


            // Create Offer

            await createOffer(
                user.socketId,
                userName
            );

        }

    }
);


// ==========================================
// NEW USER JOINED
// ==========================================

socket.on(
    "user-joined",
    (user) => {

        console.log(
            "New User:",
            user
        );


        if (
            !user ||
            !user.socketId
        ) {

            return;

        }


        const userName =
            user.userName ||
            "Participant";


        // Save Name

        remoteUserNames[
            user.socketId
        ] =
            userName;


        // Add Participant

        addParticipant(
            user.socketId,
            userName
        );

    }
);


// ==========================================
// CREATE OFFER
// ==========================================

async function createOffer(
    targetSocketId,
    targetUserName
) {

    try {

        const peerConnection =
            createPeerConnection(
                targetSocketId,
                targetUserName
            );


        const offer =
            await peerConnection
                .createOffer();


        await peerConnection
            .setLocalDescription(
                offer
            );


        // ==================================
        // SEND OFFER WITH MY NAME
        // ==================================

        socket.emit(
            "offer",
            {

                target:
                    targetSocketId,

                offer:
                    offer,

                userName:
                    currentUserName

            }
        );


    } catch (error) {

        console.error(
            "Offer Error:",
            error
        );

    }

}


// ==========================================
// RECEIVE OFFER
// ==========================================

socket.on(
    "offer",
    async ({
        sender,
        offer,
        userName
    }) => {

        try {

            // ==================================
            // GET REAL USER NAME
            // ==================================

            const remoteName =
                userName ||
                remoteUserNames[
                    sender
                ] ||
                "Participant";


            // Save Name

            remoteUserNames[
                sender
            ] =
                remoteName;


            // Add Participant

            addParticipant(
                sender,
                remoteName
            );


            // ==================================
            // CREATE PEER
            // ==================================

            const peerConnection =
                createPeerConnection(
                    sender,
                    remoteName
                );


            await peerConnection
                .setRemoteDescription(
                    new RTCSessionDescription(
                        offer
                    )
                );


            // ==================================
            // CREATE ANSWER
            // ==================================

            const answer =
                await peerConnection
                    .createAnswer();


            await peerConnection
                .setLocalDescription(
                    answer
                );


            // ==================================
            // SEND ANSWER
            // ==================================

            socket.emit(
                "answer",
                {

                    target:
                        sender,

                    answer:
                        answer

                }
            );


        } catch (error) {

            console.error(
                "Offer Receive Error:",
                error
            );

        }

    }
);


// ==========================================
// RECEIVE ANSWER
// ==========================================

socket.on(
    "answer",
    async ({
        sender,
        answer
    }) => {

        try {

            const peerConnection =
                peerConnections[
                    sender
                ];


            if (!peerConnection) {

                return;

            }


            await peerConnection
                .setRemoteDescription(
                    new RTCSessionDescription(
                        answer
                    )
                );


        } catch (error) {

            console.error(
                "Answer Error:",
                error
            );

        }

    }
);


// ==========================================
// ICE CANDIDATE
// ==========================================

socket.on(
    "ice-candidate",
    async ({
        sender,
        candidate
    }) => {

        try {

            const peerConnection =
                peerConnections[
                    sender
                ];


            if (
                peerConnection &&
                candidate
            ) {

                await peerConnection
                    .addIceCandidate(
                        new RTCIceCandidate(
                            candidate
                        )
                    );

            }

        } catch (error) {

            console.error(
                "ICE Candidate Error:",
                error
            );

        }

    }
);


// ==========================================
// CREATE PEER CONNECTION
// ==========================================

function createPeerConnection(
    socketId,
    userName
) {

    // ==================================
    // ALWAYS KEEP NAME
    // ==================================

    const finalUserName =
        userName ||
        remoteUserNames[
            socketId
        ] ||
        "Participant";


    // Save Name

    remoteUserNames[
        socketId
    ] =
        finalUserName;


    // ==================================
    // EXISTING CONNECTION
    // ==================================

    if (
        peerConnections[
            socketId
        ]
    ) {

        return peerConnections[
            socketId
        ];

    }


    // ==================================
    // CREATE PEER
    // ==================================

    const peerConnection =
        new RTCPeerConnection(
            rtcConfiguration
        );


    // Save Connection

    peerConnections[
        socketId
    ] =
        peerConnection;


    // ==================================
    // ADD LOCAL TRACKS
    // ==================================

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track => {

                    peerConnection
                        .addTrack(
                            track,
                            localStream
                        );

                }
            );

    }


    // ==================================
    // RECEIVE REMOTE TRACKS
    // ==================================

    peerConnection.ontrack =
        function (event) {

            const remoteName =
                remoteUserNames[
                    socketId
                ] ||
                finalUserName ||
                "Participant";


            addRemoteVideo(
                socketId,
                event.streams[0],
                remoteName
            );

        };


    // ==================================
    // ICE CANDIDATE
    // ==================================

    peerConnection.onicecandidate =
        function (event) {

            if (
                event.candidate
            ) {

                socket.emit(
                    "ice-candidate",
                    {

                        target:
                            socketId,

                        candidate:
                            event.candidate

                    }
                );

            }

        };


    // ==================================
    // CONNECTION STATE
    // ==================================

    peerConnection
        .onconnectionstatechange =
        function () {

            console.log(
                "Connection:",
                socketId,
                peerConnection
                    .connectionState
            );


            if (
                peerConnection
                    .connectionState ===
                "failed"
            ) {

                peerConnection
                    .restartIce();

            }

        };


    return peerConnection;

}


// ==========================================
// ADD REMOTE VIDEO
// ==========================================

function addRemoteVideo(
    socketId,
    stream,
    userName
) {

    // ==================================
    // GET FINAL NAME
    // ==================================

    const finalUserName =
        userName ||
        remoteUserNames[
            socketId
        ] ||
        "Participant";


    // Save Name

    remoteUserNames[
        socketId
    ] =
        finalUserName;


    // ==================================
    // CHECK EXISTING CAMERA
    // ==================================

    const existingContainer =
        document.getElementById(
            `video-${socketId}`
        );


    if (
        existingContainer
    ) {

        // Update Video

        const existingVideo =
            existingContainer
                .querySelector(
                    "video"
                );


        if (
            existingVideo &&
            existingVideo.srcObject !==
            stream
        ) {

            existingVideo.srcObject =
                stream;

        }


        // ==================================
        // UPDATE NAME
        // ==================================

        const existingName =
            existingContainer
                .querySelector(
                    ".video-name"
                );


        if (
            existingName
        ) {

            existingName.textContent =
                finalUserName;

        }


        return;

    }


    // ==================================
    // CREATE VIDEO CONTAINER
    // ==================================

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "video-container";


    container.id =
        `video-${socketId}`;


    // ==================================
    // VIDEO
    // ==================================

    const video =
        document.createElement(
            "video"
        );


    video.autoplay =
        true;


    video.playsInline =
        true;


    video.muted =
        false;


    video.srcObject =
        stream;


    // ==================================
    // NAME
    // ==================================

    const nameLabel =
        document.createElement(
            "div"
        );


    nameLabel.className =
        "video-name";


    nameLabel.textContent =
        finalUserName;


    // ==================================
    // APPEND
    // ==================================

    container.appendChild(
        video
    );


    container.appendChild(
        nameLabel
    );


    videoGrid.appendChild(
        container
    );


    // ==================================
    // ADD PARTICIPANT
    // ==================================

    addParticipant(
        socketId,
        finalUserName
    );

}


// ==========================================
// ADD PARTICIPANT
// ==========================================

function addParticipant(
    socketId,
    userName
) {

    const finalUserName =
        userName ||
        remoteUserNames[
            socketId
        ] ||
        "Participant";


    // Save Name

    remoteUserNames[
        socketId
    ] =
        finalUserName;


    // Already Exists

    if (
        document.getElementById(
            `participant-${socketId}`
        )
    ) {

        // Update Existing Name

        const existingParticipant =
            document.getElementById(
                `participant-${socketId}`
            );


        const nameSpan =
            existingParticipant
                .querySelector(
                    ".participant-name"
                );


        if (
            nameSpan
        ) {

            nameSpan.textContent =
                finalUserName;

        }


        return;

    }


    // ==================================
    // CREATE PARTICIPANT ITEM
    // ==================================

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "participant-item";


    item.id =
        `participant-${socketId}`;


    item.innerHTML = `

        <span class="participant-avatar">
            👤
        </span>

        <span class="participant-name">
            ${escapeHtml(
                finalUserName
            )}
        </span>

    `;


    participantsPanel.appendChild(
        item
    );

}


// ==========================================
// USER LEFT
// ==========================================

socket.on(
    "user-left",
    (socketId) => {

        console.log(
            "User left:",
            socketId
        );


        // Remove Video

        const videoContainer =
            document.getElementById(
                `video-${socketId}`
            );


        if (
            videoContainer
        ) {

            videoContainer.remove();

        }


        // Remove Participant

        const participant =
            document.getElementById(
                `participant-${socketId}`
            );


        if (
            participant
        ) {

            participant.remove();

        }


        // Close Peer

        if (
            peerConnections[
                socketId
            ]
        ) {

            peerConnections[
                socketId
            ].close();


            delete peerConnections[
                socketId
            ];

        }


        // Delete Name

        delete remoteUserNames[
            socketId
        ];

    }
);


// ==========================================
// MICROPHONE
// ==========================================

micBtn.addEventListener(
    "click",
    toggleMicrophone
);


function toggleMicrophone() {

    if (!localStream) {

        return;

    }


    const audioTracks =
        localStream.getAudioTracks();


    if (
        audioTracks.length === 0
    ) {

        return;

    }


    const audioTrack =
        audioTracks[0];


    audioTrack.enabled =
        !audioTrack.enabled;


    if (
        audioTrack.enabled
    ) {

        micBtn.classList.remove(
            "disabled"
        );


        micBtn.innerHTML = `

            <span>
                🎙️
            </span>

            <small>
                Mute
            </small>

        `;

    } else {

        micBtn.classList.add(
            "disabled"
        );


        micBtn.innerHTML = `

            <span>
                🔇
            </span>

            <small>
                Unmute
            </small>

        `;

    }

}


// ==========================================
// CAMERA
// ==========================================

cameraBtn.addEventListener(
    "click",
    toggleCamera
);


function toggleCamera() {

    if (!localStream) {

        return;

    }


    const videoTracks =
        localStream.getVideoTracks();


    if (
        videoTracks.length === 0
    ) {

        return;

    }


    const videoTrack =
        videoTracks[0];


    videoTrack.enabled =
        !videoTrack.enabled;


    if (
        videoTrack.enabled
    ) {

        cameraBtn.classList.remove(
            "disabled"
        );


        cameraBtn.innerHTML = `

            <span>
                📹
            </span>

            <small>
                Camera
            </small>

        `;

    } else {

        cameraBtn.classList.add(
            "disabled"
        );


        cameraBtn.innerHTML = `

            <span>
                🚫
            </span>

            <small>
                Camera Off
            </small>

        `;

    }

}


// ==========================================
// SCREEN SHARE
// ==========================================

screenShareBtn.addEventListener(
    "click",
    toggleScreenShare
);


async function toggleScreenShare() {

    if (
        isScreenSharing
    ) {

        await stopScreenShare();

        return;

    }


    try {

        screenStream =
            await navigator.mediaDevices
                .getDisplayMedia({

                    video: true,

                    audio: false

                });


        const screenTrack =
            screenStream
                .getVideoTracks()[0];


        // ==================================
        // REPLACE CAMERA WITH SCREEN
        // ==================================

        for (
            const socketId in
            peerConnections
        ) {

            const peerConnection =
                peerConnections[
                    socketId
                ];


            const sender =
                peerConnection
                    .getSenders()
                    .find(
                        sender =>
                            sender.track &&
                            sender.track.kind ===
                            "video"
                    );


            if (
                sender
            ) {

                await sender
                    .replaceTrack(
                        screenTrack
                    );

            }

        }


        // ==================================
        // SHOW LOCAL SCREEN
        // ==================================

        localVideo.srcObject =
            screenStream;


        isScreenSharing =
            true;


        screenShareBtn.innerHTML = `

            <span>
                🛑
            </span>

            <small>
                Stop Share
            </small>

        `;


        // ==================================
        // SCREEN SHARE ENDED
        // ==================================

        screenTrack.onended =
            function () {

                stopScreenShare();

            };


    } catch (error) {

        console.error(
            "Screen Share Error:",
            error
        );

    }

}


// ==========================================
// STOP SCREEN SHARE
// ==========================================

async function stopScreenShare() {

    if (
        !screenStream
    ) {

        return;

    }


    const cameraTrack =
        localStream
            ?.getVideoTracks()[0];


    // ==================================
    // RESTORE CAMERA
    // ==================================

    for (
        const socketId in
        peerConnections
    ) {

        const peerConnection =
            peerConnections[
                socketId
            ];


        const sender =
            peerConnection
                .getSenders()
                .find(
                    sender =>
                        sender.track &&
                        sender.track.kind ===
                        "video"
                );


        if (
            sender &&
            cameraTrack
        ) {

            await sender
                .replaceTrack(
                    cameraTrack
                );

        }

    }


    // ==================================
    // STOP SCREEN
    // ==================================

    screenStream
        .getTracks()
        .forEach(
            track =>
                track.stop()
        );


    // ==================================
    // RESTORE LOCAL VIDEO
    // ==================================

    localVideo.srcObject =
        localStream;


    screenStream =
        null;


    isScreenSharing =
        false;


    // ==================================
    // UPDATE BUTTON
    // ==================================

    screenShareBtn.innerHTML = `

        <span>
            🖥️
        </span>

        <small>
            Share Screen
        </small>

    `;

}


// ==========================================
// PARTICIPANTS PANEL
// ==========================================

participantsBtn.addEventListener(
    "click",
    function () {

        openPanel(
            "participants"
        );

    }
);


// ==========================================
// CHAT PANEL
// ==========================================

chatBtn.addEventListener(
    "click",
    function () {

        openPanel(
            "chat"
        );

    }
);


// ==========================================
// OPEN PANEL
// ==========================================

function openPanel(
    type
) {

    sidePanel.classList.remove(
        "hidden"
    );


    if (
        type === "participants"
    ) {

        panelTitle.textContent =
            "Participants";


        participantsPanel.classList.remove(
            "hidden"
        );


        chatPanel.classList.add(
            "hidden"
        );

    }


    if (
        type === "chat"
    ) {

        panelTitle.textContent =
            "Meeting Chat";


        participantsPanel.classList.add(
            "hidden"
        );


        chatPanel.classList.remove(
            "hidden"
        );


        setTimeout(
            () => {

                chatInput.focus();

            },
            100
        );

    }

}


// ==========================================
// CLOSE PANEL
// ==========================================

closePanelBtn.addEventListener(
    "click",
    function () {

        sidePanel.classList.add(
            "hidden"
        );

    }
);


// ==========================================
// SEND CHAT
// ==========================================

sendChatBtn.addEventListener(
    "click",
    sendChatMessage
);


chatInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            sendChatMessage();

        }

    }
);


function sendChatMessage() {

    const message =
        chatInput.value.trim();


    if (!message) {

        return;

    }


    socket.emit(
        "chat-message",
        {

            roomId:
                currentRoomId,

            userName:
                currentUserName,

            message:
                message

        }
    );


    chatInput.value = "";

}


// ==========================================
// RECEIVE CHAT
// ==========================================

socket.on(
    "chat-message",
    ({
        userName,
        message
    }) => {

        addChatMessage(
            userName,
            message
        );

    }
);


// ==========================================
// ADD CHAT MESSAGE
// ==========================================

function addChatMessage(
    userName,
    message
) {

    const messageDiv =
        document.createElement(
            "div"
        );


    messageDiv.className =
        "chat-message";


    messageDiv.innerHTML = `

        <div class="chat-message-name">
            ${escapeHtml(
                userName
            )}
        </div>

        <div class="chat-message-text">
            ${escapeHtml(
                message
            )}
        </div>

    `;


    messages.appendChild(
        messageDiv
    );


    messages.scrollTop =
        messages.scrollHeight;

}


// ==========================================
// COPY MEETING ID
// ==========================================

copyRoomBtn.addEventListener(
    "click",
    async function () {

        try {

            await navigator.clipboard
                .writeText(
                    currentRoomId
                );


            copyRoomBtn.textContent =
                "✓ Copied";


            setTimeout(
                () => {

                    copyRoomBtn.textContent =
                        "📋 Copy";

                },
                2000
            );


        } catch (error) {

            console.error(
                "Copy Error:",
                error
            );

        }

    }
);


// ==========================================
// LEAVE MEETING
// ==========================================

leaveBtn.addEventListener(
    "click",
    leaveMeeting
);


function leaveMeeting() {

    const confirmLeave =
        confirm(
            "Are you sure you want to leave the meeting?"
        );


    if (
        !confirmLeave
    ) {

        return;

    }


    // ==================================
    // NOTIFY SERVER
    // ==================================

    socket.emit(
        "leave-room"
    );


    // ==================================
    // STOP CAMERA + MIC
    // ==================================

    if (
        localStream
    ) {

        localStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

    }


    // ==================================
    // STOP SCREEN
    // ==================================

    if (
        screenStream
    ) {

        screenStream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

    }


    // ==================================
    // CLOSE PEERS
    // ==================================

    for (
        const socketId in
        peerConnections
    ) {

        peerConnections[
            socketId
        ].close();

    }


    // ==================================
    // RESET PEERS
    // ==================================

    Object.keys(
        peerConnections
    ).forEach(
        key =>
            delete peerConnections[
                key
            ]
    );


    // ==================================
    // RESET NAMES
    // ==================================

    Object.keys(
        remoteUserNames
    ).forEach(
        key =>
            delete remoteUserNames[
                key
            ]
    );


    // ==================================
    // RELOAD
    // ==================================

    window.location.reload();

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}


// ==========================================
// SOCKET CONNECT
// ==========================================

socket.on(
    "connect",
    () => {

        console.log(
            "Socket connected:",
            socket.id
        );

    }
);


// ==========================================
// SOCKET DISCONNECT
// ==========================================

socket.on(
    "disconnect",
    () => {

        console.log(
            "Socket disconnected"
        );

    }
);


// ==========================================
// DOUBLE CLICK CAMERA FULLSCREEN
// ==========================================

document.addEventListener(
    "dblclick",
    function (event) {

        const camera =
            event.target.closest(
                ".video-container"
            );


        if (!camera) {

            return;

        }


        camera.classList.toggle(
            "camera-fullscreen"
        );

    }
);
