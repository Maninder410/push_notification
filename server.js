const express = require('express');
const admin = require('firebase-admin');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config(); 

const serviceAccount = {
    "type": "service_account",
    "project_id": process.env.GOOGLE_PROJECT_ID,
    "private_key_id": process.env.GOOGLE_PRIVATE_KEY_ID,
    "private_key": process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines
    "client_email": process.env.GOOGLE_CLIENT_EMAIL,
    "client_id": process.env.GOOGLE_CLIENT_ID,
    "auth_uri": process.env.GOOGLE_AUTH_URI,
    "token_uri": process.env.GOOGLE_TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
    "client_x509_cert_url": process.env.GOOGLE_CLIENT_CERT_URL,
    "universe_domain": "googleapis.com" // Not sure what this field is, but you can add it as necessary
};
let registrationTokens = [];
// Set up the Express app and server
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount), // replace with your service account credentials
});
const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
const rooms = {};
const meetingLogs = {};
// Route to store roomName and sid


const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // your React app's URL
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.send('<h1>notification added</h1>');
});
app.post('/save-token', (req, res) => {
  const { token } = req.body;

  if (token && !registrationTokens.includes(token)) {
    registrationTokens.push(token);
    console.log('Token saved:', token);
    res.status(200).send('Token saved successfully');
  } else {
    res.status(400).send('Invalid token or token already exists');
  }
});
app.post('/send-notification', async (req, res) => {
  
  const message = {
      data: {
        score: 'testing',
        time: 'work'
      },
      token: registrationTokens
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log('Notification sent successfully:', response);
      res.status(200).send('Notification sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).send('Error sending notification');
    }
});
app.post('/getDetails', (req, res) => {
  res.status(200).json(meetingLogs);
});

app.post('/getDetail/:meetingid',(req,res)=>{
  const {meetingid} = req.params;
    console.log(meetingid);
 
  return res.status(201).json(meetingLogs[meetingid]);
});
app.post('/:meetingid/log-meeting', (req, res) => {
  const { meetingid } = req.params;
  const { meetingStart, meetingEnd, recordingStart, recordingEnd, totalTime, recordingTime, users, len } = req.body;

  // Create a log entry
  const logs = [
    `Meeting started at ${meetingStart}`,
    `Meeting ended at ${meetingEnd}`,
    `Recording started at ${recordingStart}`,
    `Recording ended at ${recordingEnd}`,
    `Total meeting time was ${totalTime.hours} hours ${totalTime.minutes} minutes ${totalTime.seconds} seconds`,
    `Total recording time was ${recordingTime.hours} hours ${recordingTime.minutes} minutes ${recordingTime.seconds} seconds`,
    `Users joined: ${users}`,
    `User count: ${len}`,
  ];
 

  // Store the log entry using meeting ID as key
  console.log(meetingid);

  meetingLogs[meetingid] = logs;
console.log(logs);
  res.status(201).json({ message: 'Meeting log saved successfully', logs });
});
app.post('/store', (req, res) => {
  const { roomName, sid } = req.body;

  if (!roomName || !sid) {
    return res.status(400).json({ message: 'roomName and sid are required' });
  }

  rooms[roomName] = sid;
  console.log("room is " ,roomName);
  console.log("sid is " ,sid);

  res.status(200).json({ message: 'Room and SID stored successfully' });
});

// Route to fetch sid by roomName
app.get('/fetch/:roomName', (req, res) => {
  const roomName = req.params.roomName;

  if (!rooms[roomName]) {
    return res.status(404).json({ message: 'Room not found' });
  }

  res.status(200).json({ sid: rooms[roomName] });
});

const PORT = 3000;

io.on('connection', (socket) => {
  console.log('New client connected');

  // Example event to send notification
  socket.on('sendNotification', (message) => {
    console.log('Notification received: ', message);
    // Emit notification to all connected clients
    io.emit('receiveNotification', message);
  });
  socket.on('sendDetails', (message) => {
    console.log('message received: ', message);
    // Emit notification to all connected clients
    io.emit('hangup', message);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
