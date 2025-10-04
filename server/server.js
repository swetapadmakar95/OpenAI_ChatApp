require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const port = 5000;
const MyAPIKey = process.env.MyAPI_Key;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// In-memory storage (replace with database in production)
const users = [];
const userChats = new Map(); // userId -> chatHistory
app.use(cors({
    origin: '*', // Update this for production with specific domains
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});
app.use(bodyParser.json({ limit: '50mb' })); // Increase to 50MB
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    userChats.set(user.id, []);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(user => user.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// Chat history routes
app.get('/api/chats', authenticateToken, (req, res) => {
  const chats = userChats.get(req.user.userId) || [];
  res.json(chats);
});

app.post('/api/chats', authenticateToken, (req, res) => {
  const { chat } = req.body;
  const userId = req.user.userId;
  
  let chats = userChats.get(userId) || [];
  chats.push(chat);
  userChats.set(userId, chats);
  
  res.json({ success: true });
});

app.put('/api/chats/:chatId', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const { chat } = req.body;
  const userId = req.user.userId;
  console.log('PUT /api/chats', { chatId, userId });
  let chats = userChats.get(userId) || [];
  const index = chats.findIndex(c => c.id === chatId);
  
  if (index !== -1) {
    chats[index] = chat;
    userChats.set(userId, chats);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Chat not found' });
  }
});

app.delete('/api/chats/:chatId', authenticateToken, (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.userId;
  
  let chats = userChats.get(userId) || [];
  chats = chats.filter(c => c.id !== chatId);
  userChats.set(userId, chats);
  
  res.json({ success: true });
});

const Base_url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${MyAPIKey}`
const audiourl = ''
app.post('/', async (req, res) => {
    try {
      const { type, content } = req.body;
  
      if (type === 'text') {
        if (!content || typeof content !== 'string') {
          return res.status(400).json({ error: 'Invalid content for text type.' });
        }
  
        const textResponse = await axios.post(
          Base_url,
          {
            contents: [{ parts: [{ text: content }] }],
          },
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
  
        res.status(200).json(
          textResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'
        );
      } else if (type === 'audio') {
        if (!content) {
          return res.status(400).json({ error: 'Invalid content for audio type.' });
        }
        const audioBlob = Buffer.from(content, 'base64');
        const startResponse = await axios.post(
          Base_url,
          {
            file: { display_name: 'AudioFile' },
          },
          {
            headers: {
              'X-Goog-Upload-Protocol': 'resumable',
              'X-Goog-Upload-Command': 'start',
              'X-Goog-Upload-Header-Content-Length': audioBlob.length,
              'X-Goog-Upload-Header-Content-Type': 'audio/wav',
              'Content-Type': 'application/json',
            },
          }
        );
  
        const uploadUrl = startResponse.headers['x-goog-upload-url'];
        const uploadResponse = await axios.put(uploadUrl, audioBlob, {
          headers: { 'Content-Type': 'audio/wav' },
        });
  
        res.json({ fileUri: uploadResponse.data.file.uri });
      } else {
        res.status(400).json({ error: 'Invalid type. Must be "text" or "audio".' });
      }
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  

app.listen(port, ()=>{
    console.log('server listening on port ' + port);
})