// ==========================================
// SOCKET.IO
// ==========================================

const socket = io();


// ==========================================
// DOM ELEMENTS
// ==========================================

const joinScreen = document.getElementById("joinScreen");
const meetingScreen = document.getElementById("meetingScreen");

const userNameInput = document.getElementById("userName");
const roomIdInput = document.getElementById("roomId");

const joinBtn = document.getElementById("joinBtn");
const joinError = document.getElementById("joinError");

const localVideo = document.getElementById("localVideo");
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
// WEBRTC CONFIG
// ==========================================

const rtcConfiguration = {

    iceServers: [

        {
            urls: "stun:stun.l.google.com:19302"
        },

        {
            urls: "stun:stun1.l.google.com:19302"
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


    // Validate name

    if (!userName) {

        joinError.textContent =
            "Please enter your name.";

        userNameInput.focus();

        return;

    }


    // Validate room ID

    if (!roomId) {

        joinError.textContent =
            "Please enter Meeting ID.";

        roomIdInput.focus();

        return;

    }


    joinError.textContent = "";


    try {

        // Get camera and microphone

        localStream =
            await navigator.mediaDevices.getUserMedia({

                video: true,

                audio: true

            });


        // Save user information

        currentUserName =
            userName;

        currentRoomId =
            roomId;


        // Show local video

        localVideo.srcObject =
            localStream;


        // Update UI

        myParticipantName.textContent =
            userName;

        currentRoom.textContent =
            roomId;


        // Hide join screen

        joinScreen.classList.add(
            "hidden"
        );


        // Show meeting screen

        meetingScreen.classList.remove(
            "hidden"
        );


        // Join Socket.IO room

        socket.emit(
            "join-room",
            {
                roomId: roomId,
                userName: userName
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

        if (event.key === "Enter") {

            joinMeeting();

        }

    }
);


roomIdInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

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

            await createOffer(
                user.socketId,
                user.userName
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


        addParticipant(
            user.socketId,
            user.userName
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
            await peerConnection.createOffer();


        await peerConnection.setLocalDescription(
            offer
        );


        socket.emit(
            "offer",
            {

                target:
                    targetSocketId,

                offer:
                    offer

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
        offer
    }) => {

        try {

            const peerConnection =
                createPeerConnection(
                    sender,
                    "Participant"
                );


            await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                    offer
                )
            );


            const answer =
                await peerConnection.createAnswer();


            await peerConnection.setLocalDescription(
                answer
            );


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


            await peerConnection.setRemoteDescription(
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

                await peerConnection.addIceCandidate(
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

    // Return existing connection

    if (
        peerConnections[
            socketId
        ]
    ) {

        return peerConnections[
            socketId
        ];

    }


    const peerConnection =
        new RTCPeerConnection(
            rtcConfiguration
        );


    // Save connection

    peerConnections[
        socketId
    ] =
        peerConnection;


    // Add local tracks

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                track => {

                    peerConnection.addTrack(
                        track,
                        localStream
                    );

                }
            );

    }


    // Receive remote tracks

    peerConnection.ontrack =
        function (event) {

            addRemoteVideo(
                socketId,
                event.streams[0],
                userName
            );

        };


    // ICE Candidate

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


    // Connection State

    peerConnection.onconnectionstatechange =
        function () {

            console.log(
                "Connection:",
                socketId,
                peerConnection.connectionState
            );


            if (
                peerConnection.connectionState ===
                "failed"
            ) {

                peerConnection.restartIce();

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

    // Already exists

    if (
        document.getElementById(
            `video-${socketId}`
        )
    ) {

        const existingVideo =
            document.querySelector(
                `#video-${socketId} video`
            );


        if (
            existingVideo &&
            existingVideo.srcObject !== stream
        ) {

            existingVideo.srcObject =
                stream;

        }


        return;

    }


    // Container

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "video-container";


    container.id =
        `video-${socketId}`;


    // Video

    const video =
        document.createElement(
            "video"
        );


    video.autoplay =
        true;

    video.playsInline =
        true;

    video.srcObject =
        stream;


    // Name

    const nameLabel =
        document.createElement(
            "div"
        );


    nameLabel.className =
        "video-name";


    nameLabel.textContent =
        userName || "Participant";


    // Add elements

    container.appendChild(
        video
    );

    container.appendChild(
        nameLabel
    );


    videoGrid.appendChild(
        container
    );


    // Add participant

    addParticipant(
        socketId,
        userName || "Participant"
    );

}


// ==========================================
// ADD PARTICIPANT
// ==========================================

function addParticipant(
    socketId,
    userName
) {

    if (
        document.getElementById(
            `participant-${socketId}`
        )
    ) {

        return;

    }


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

        <span>
            ${escapeHtml(
                userName || "Participant"
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


        // Remove video

        const videoContainer =
            document.getElementById(
                `video-${socketId}`
            );


        if (
            videoContainer
        ) {

            videoContainer.remove();

        }


        // Remove participant

        const participant =
            document.getElementById(
                `participant-${socketId}`
            );


        if (
            participant
        ) {

            participant.remove();

        }


        // Close connection

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
            await navigator.mediaDevices.getDisplayMedia({

                video: true,

                audio: false

            });


        const screenTrack =
            screenStream.getVideoTracks()[0];


        // Replace video track in all peers

        for (
            const socketId in peerConnections
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

                await sender.replaceTrack(
                    screenTrack
                );

            }

        }


        // Show screen locally

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
            .getVideoTracks()[0];


    for (
        const socketId in peerConnections
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

            await sender.replaceTrack(
                cameraTrack
            );

        }

    }


    screenStream
        .getTracks()
        .forEach(
            track =>
                track.stop()
        );


    localVideo.srcObject =
        localStream;


    isScreenSharing =
        false;


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

            await navigator.clipboard.writeText(
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


    // Notify server

    socket.emit(
        "leave-room"
    );


    // Stop camera and microphone

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


    // Stop screen share

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


    // Close peers

    for (
        const socketId in peerConnections
    ) {

        peerConnections[
            socketId
        ].close();

    }


    // Reset

    Object.keys(
        peerConnections
    ).forEach(
        key =>
            delete peerConnections[
                key
            ]
    );


    // Reload page

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
// SOCKET CONNECTION
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


socket.on(
    "disconnect",
    () => {

        console.log(
            "Socket disconnected"
        );

    }
);