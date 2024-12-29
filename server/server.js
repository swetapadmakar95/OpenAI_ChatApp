const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require ('body-parser');
const app = express();
const port = 5000;
app.use(cors({
    origin: '*', // Update this for production with specific domains
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});
app.use(bodyParser.json({ limit: '50mb' })); // Increase to 50MB
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const Base_url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDb2bQrx4BNd4evhMw6d3nZXbS3yDX0_5A'
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
  
  
  
// app.post('/', async (req, res) => {
//     const { type, content } = req.body; // `type` can be "text" or "audio", `content` holds the data
  
//     try {
//       if (type === 'text') {
//         // Handle Text Upload
//         const response = await axios.post(
//           'https://www.googleapis.com/upload/v1beta/files?key=YOUR_API_KEY',
//           {
//             file: { display_name: 'TextFile', content: content },
//           },
//           {
//             headers: {
//               'Content-Type': 'application/json',
//             },
//           }
//         );
//         res.json({ fileUri: response.data.uri });
//       } else if (type === 'audio') {
//         // Handle Audio Upload
//         const audioBlob = Buffer.from(content, 'base64'); // Decode base64 audio blob
  
//         // Step 1: Start Upload Request
//         const startResponse = await axios.post(
//           'https://www.googleapis.com/upload/v1beta/files?key=YOUR_API_KEY',
//           {
//             file: { display_name: 'AudioFile' },
//           },
//           {
//             headers: {
//               'X-Goog-Upload-Protocol': 'resumable',
//               'X-Goog-Upload-Command': 'start',
//               'X-Goog-Upload-Header-Content-Length': audioBlob.length,
//               'X-Goog-Upload-Header-Content-Type': 'audio/wav',
//               'Content-Type': 'application/json',
//             },
//           }
//         );
  
//         const uploadUrl = startResponse.headers['x-goog-upload-url'];
  
//         // Step 2: Upload File Data
//         const uploadResponse = await axios.put(uploadUrl, audioBlob, {
//           headers: {
//             'Content-Type': 'audio/wav',
//           },
//         });
  
//         res.json({ fileUri: uploadResponse.data.file.uri });
//       } else {
//         res.status(400).json({ error: 'Invalid type. Must be "text" or "audio".' });
//       }
//     } catch (error) {
//       console.error('Error uploading file:', error.response?.data || error.message);
//       res.status(500).json({ error: 'Failed to upload file' });
//     }
//   });
  

app.listen(port, ()=>{
    console.log('server listening on port ' + port);
})