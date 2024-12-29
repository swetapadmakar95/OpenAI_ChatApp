import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useTheme } from './ThemeContext';
import './App.css';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from "@ffmpeg/util";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faPaperPlane, faMicrophone, faStop, faBars, faPlus, faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import RenameModal from './RenameModal';

let tempchatmsg = []
const App = () => {
  const ffmpeg = new FFmpeg();
  const [userMessage, setUserMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [ischathistoryshow, setIschatHistoryShow] = useState(true);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverChartName, setPopoverchartNmae] = useState(null);
  const [modalShow, setModalShow] = React.useState(false);
  const [shortChatName, setshortChatName] = useState('');
  const waveformRef = useRef(null);
  const intervalRef = useRef(null);
  const waveSurferInstance = useRef(null);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const recorder = new MediaRecorder(stream);
          setMediaRecorder(recorder);
        })
        .catch((error) => console.error('Error accessing microphone:', error));
    } else {
      console.error('Browser does not support audio recording.');
    }
  }, []);

  const startRecording = () => {
    if (mediaRecorder) {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }

      setIsRecording(true);
      setRecordingDuration(0);
      setAudioBlob(null);

      mediaRecorder.start();

      if (waveSurferInstance.current) {
        waveSurferInstance.current.empty();
      }

      intervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(intervalRef.current);

      mediaRecorder.ondataavailable = async (event) => {
        const blob = event.data;
        setAudioBlob(blob);

        if (!ffmpeg.loaded) {
          await ffmpeg.load({
            coreURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.wasm`, "application/wasm"),
            workerURL: await toBlobURL(`https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm/ffmpeg-core.worker.js`, "text/javascript"),
          });
        }

        const webmArrayBuffer = await blob.arrayBuffer();
        await ffmpeg.FS('writeFile', 'input.webm', new Uint8Array(webmArrayBuffer));

        await ffmpeg.run('-i', 'input.webm', 'output.wav');

        const wavData = ffmpeg.FS('readFile', 'output.wav');
        const wavBlob = new Blob([wavData.buffer], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(wavBlob);

        setChatMessages((prevMessages) => [
          ...prevMessages,
          { role: 'user', message: '', audio: audioUrl },
        ]);

        sendMessage('', wavBlob);
      };
    }
  };

  const sendMessage = async (message = '', audio = null) => {
    if (!message?.trim() && !audio) return;

    setChatMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', message, audio: audio ? URL.createObjectURL(audio) : null },
    ]);
    setUserMessage('');
    setLoading(true);

    try {
      await generateContent(message || audio);
    } catch (error) {
      console.error('Error during message send:', error);
    }

    setLoading(false);
  };

  const generateContent = async (message) => {
    try {
      const response = await axios.post('http://localhost:5000/', {
        type: 'text',
        content: message,
      });

      setChatMessages((prevMessages) => [
        ...prevMessages,
        { role: 'bot', message: response.data },
      ]);
    } catch (error)      {
      console.error('Error generating content:', error);
    }
  };

  const handleInputChange = (e) => {
    setUserMessage(e.target.value);
    if(chatMessages?.length === 0){
      setshortChatName(e.target.value)
    }
  };

  const handleEditMessage = (index) => {
    setShowPopover(false); 
    setModalShow(true)
  };

  const handleDeleteMessage = (index) => {
    setshortChatName('')
    setShowPopover(false); 
  };

  const togglemenu = () => {
    setIschatHistoryShow(!ischathistoryshow);
  };

  const newChat = () => {
    setChatMessages([]);
    setUserMessage('');
  };

  const handlePopoverToggle = (chartname, e) => {
    setPopoverchartNmae(chartname);
    setShowPopover(!showPopover);
    e.stopPropagation(); // Prevent triggering popover on other elements
  };

  const renameCallback = useCallback((type, value='')=>{
    if(type === 'save'){
      setshortChatName(value)
      setModalShow(false)
    }
    else{
      setModalShow(false)
    }
  },[])

  return (
    <>
      <div className="chat-container">
        {/* Chat History on the Left */}
        <div className="chat-history">
          <div className="chat-history-header">
            <button className="menubar" onClick={togglemenu}>
              <FontAwesomeIcon icon={faBars} />
            </button>
          </div>
          <div className={`toggle-menu ${ischathistoryshow ? 'active' : ''}`}>
            <button className="new-chat" onClick={newChat}>
              <FontAwesomeIcon icon={faPlus} /> New Chat
            </button>
            {chatMessages.length > 0 && (
              <div className="history-list">
                {/* Only show the first message */}
                <div className="history-item">
                  <div className="history-item-text">
                    <span>{shortChatName || 'New Chart'}</span>
                  </div>
                  <div className="history-item-actions">
                    <button
                      className="dot-menu"
                      onClick={(e) => handlePopoverToggle(shortChatName, e)}
                    >
                      <FontAwesomeIcon icon={faEllipsisV} />
                    </button>

                    {(showPopover && popoverChartName ===  shortChatName) && (
                      <div className="popover-menu active">
                        <button onClick={() => handleEditMessage()}>Rename</button>
                        <button onClick={() => handleDeleteMessage()}>Delete</button>
                        <button onClick={() => console.log('Open Option')}>Open</button>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat App on the Right */}
        <div className="chat-app" style={{ backgroundColor: theme.background, color: theme.color }}>
          <div className="chat-header">
            <h2 style={{ color: theme.color }}>✨ AI Chat Assistant ✨</h2>
            <button onClick={toggleTheme}><FontAwesomeIcon icon={faMoon} /></button>
          </div>
          <div className="chat-box">
            {chatMessages.map((msg, index) => (
              <div
                key={index}
                className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}
                style={{
                  backgroundColor:
                    msg.role === 'user' ? theme.userBubbleColor : theme.botBubbleColor,
                }}
              >
                {msg.audio && <audio controls src={msg.audio}></audio>}
                {msg.message && <p>{msg.message}</p>}
              </div>
            ))}
            {loading && <div className="typing-indicator"><div className="typing-dots"><span></span><span></span><span></span></div></div>}
          </div>
          <div className="input-container">
            <div className="message-input">
              <input
                type="text"
                value={userMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
              />
              <button
                className="send-button"
                onClick={() => sendMessage(userMessage)}
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </div>
            {/* <div className="voice-control">
              {isRecording ? (
                <button onClick={stopRecording}>
                  <FontAwesomeIcon icon={faStop} />
                </button>
              ) : (
                <button onClick={startRecording}>
                  <FontAwesomeIcon icon={faMicrophone} />
                </button>
              )}
            </div> */}
          </div>
        </div>
      </div>

      {modalShow && (
        <RenameModal
          show={modalShow}
          onHide={renameCallback}
          editedMessage={shortChatName} // Pass this only to the custom RenameModal component
        />
      )}
    </>
  );
};

export default App;
