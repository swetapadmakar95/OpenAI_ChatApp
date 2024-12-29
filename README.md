# OpenAI_ChatApp
AI Chat App
A simple and interactive AI-powered chat assistant app built with React.js, integrating voice and text inputs. The app allows users to have conversations with an AI assistant, send messages via text or voice, and manage multiple chat sessions.

Features
Text Input: Users can type messages to interact with the AI assistant.
Chat History: Keep track of multiple chat sessions, switch between them, and view messages.
Dark/Light Theme: Toggle between dark and light themes to customize the user interface.
Message Actions: Rename or delete chat sessions.
AI-generated Responses: The assistant generates text responses based on the user's input.
Prerequisites
Before running this app, make sure you have the following installed:

Node.js (Recommended version: >=16.x)
npm or yarn
Getting Started
1. Clone the Repository
Clone the repository to your local machine using:

bash
Copy code
git clone https://github.com/your-username/ai-chat-assistant.git
2. Install Dependencies
Navigate to the project directory and install the required dependencies:

bash
Copy code
cd ai-chat-assistant
npm install
Or, if you are using yarn:

bash
Copy code
yarn install
3. Run the Development Server
Once the dependencies are installed, start the development server:

bash
Copy code
npm start
Or, with yarn:

bash
Copy code
yarn start
The app should now be running on http://localhost:3000.

Usage
Start a New Chat: Click the "New Chat" button in the sidebar to start a new chat session.
Switch Sessions: Click on the chat history item in the sidebar to switch between active chat sessions.
Send Text Message: Type your message into the input field and press the "Send" button.
Send Voice Message: Click the microphone icon to start recording your voice. Click the stop button to stop recording and send the audio message.
Manage Chat Sessions: Click the ellipsis (three dots) next to a chat session to rename or delete it.
Toggle Theme: Click the moon icon to toggle between light and dark themes.
Folder Structure
bash
Copy code
/src
  /components
    App.js            # Main app component
    RenameModal.js    # Modal for renaming chat sessions
  /context
    ThemeContext.js   # Context for managing theme state
  /assets
    logo.png          # App logo (optional)
  /utils
    ffmpegUtils.js    # Utility functions for handling audio processing
  /App.css            # Main styles for the app
  index.js            # Entry point of the app
  App.js              # Main app component
Built With
React - Frontend library for building the UI.
FFmpeg - Used for handling audio file conversion (WebM to WAV).
Axios - For making HTTP requests to the backend API.
Font Awesome - For icons used in the UI.
Backend
This app interacts with a backend API to generate AI responses. The backend can be set up using any server-side framework (e.g., Express.js). You can implement the backend yourself or integrate with an existing service like OpenAI's GPT models.

Example Backend (Node.js + Express):
js
Copy code
const express = require('express');
const app = express();
const port = 5000;

app.use(express.json());

app.post('/', async (req, res) => {
  const { type, content } = req.body;
  if (type === 'text') {
    const aiResponse = 'This is a generated response from the AI assistant.';
    res.json(aiResponse);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
Make sure to replace http://localhost:5000/ with the actual URL of your backend if different.

Contributing
Feel free to fork the project, make changes, and submit pull requests. If you have any bug reports or feature requests, please open an issue in the GitHub repository.

License
This project is licensed under the MIT License - see the LICENSE file for details.