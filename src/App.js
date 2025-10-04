import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import './App.css';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from "@ffmpeg/util";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faPaperPlane, faMicrophone, faStop, faBars, faPlus, faEllipsisV, faTimes, faMessage, faTrash, faEdit, faUser, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import RenameModal from './RenameModal';
import AuthModal from './AuthModal';

let tempchatmsg = []
const App = () => {
  const ffmpeg = new FFmpeg();
  const [userMessage, setUserMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [ischathistoryshow, setIschatHistoryShow] = useState(true);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverChartName, setPopoverchartNmae] = useState(null);
  const [modalShow, setModalShow] = React.useState(false);
  const [shortChatName, setshortChatName] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const waveformRef = useRef(null);
  const intervalRef = useRef(null);
  const waveSurferInstance = useRef(null);
  const audioUrlsRef = useRef(new Set());

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const recorder = new MediaRecorder(stream);
          
          // Set up the data available handler
          recorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
              const blob = event.data;
              setAudioBlob(blob);

              try {
                // Try to convert WebM to WAV using FFmpeg
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
                
                // Track the URL for cleanup
                audioUrlsRef.current.add(audioUrl);

                setChatMessages((prevMessages) => [
                  ...prevMessages,
                  { role: 'user', message: '', audio: audioUrl },
                ]);

                sendMessage('', wavBlob);
              } catch (error) {
                console.error('Error processing audio with FFmpeg:', error);
                // Fallback: use the original blob without conversion
                console.log('Using fallback: original audio blob');
                const audioUrl = URL.createObjectURL(blob);
                
                // Track the URL for cleanup
                audioUrlsRef.current.add(audioUrl);
                
                setChatMessages((prevMessages) => [
                  ...prevMessages,
                  { role: 'user', message: '', audio: audioUrl },
                ]);
                sendMessage('', blob);
              }
            }
          };
          
          setMediaRecorder(recorder);
        })
        .catch((error) => console.error('Error accessing microphone:', error));
    } else {
      console.error('Browser does not support audio recording.');
    }
  }, []);

  // Cleanup effect for blob URLs
  useEffect(() => {
    return () => {
      // Clean up all blob URLs when component unmounts
      audioUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Load user's chat history when user logs in
  useEffect(() => {
    const loadUserChats = async () => {
      if (user && user.token) {
        try {
          const response = await axios.get('http://localhost:5000/api/chats', {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          setChatHistory(response.data);
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      } else {
        setChatHistory([]);
      }
    };

    loadUserChats();
  }, [user]);

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

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(intervalRef.current);
    }
  };

  const sendMessage = async (message = '', audio = null) => {
    if (!message?.trim() && !audio) return;

    let audioUrl = null;
    if (audio) {
      audioUrl = URL.createObjectURL(audio);
      audioUrlsRef.current.add(audioUrl);
    }

    setChatMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', message, audio: audioUrl },
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
    if(chatMessages?.length === 0 && e.target.value.trim()){
      setshortChatName(e.target.value.substring(0, 30) + (e.target.value.length > 30 ? '...' : ''));
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

  const newChat = async () => {
    // Save current chat to history if it has messages
    if (chatMessages.length > 0 && shortChatName && user) {
      const newChatItem = {
        id: currentChatId || Date.now(),
        name: shortChatName,
        messages: [...chatMessages],
        timestamp: new Date().toISOString()
      };
      
      try {
        if (currentChatId) {
          // Update existing chat
          await axios.put(`http://localhost:5000/api/chats/${currentChatId}`, {
            chat: newChatItem
          }, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
        } else {
          // Create new chat
          await axios.post('http://localhost:5000/api/chats', {
            chat: newChatItem
          }, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
        }
        
        // Update local state
        setChatHistory(prev => {
          const existingIndex = prev.findIndex(chat => chat.id === currentChatId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newChatItem;
            return updated;
          } else {
            return [newChatItem, ...prev];
          }
        });
      } catch (error) {
        console.error('Error saving chat:', error);
      }
    }
    
    // Start new chat
    setChatMessages([]);
    setUserMessage('');
    setshortChatName('');
    setCurrentChatId(Date.now());
  };

  const loadChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setChatMessages(chat.messages);
      setshortChatName(chat.name);
      setCurrentChatId(chatId);
    }
  };

  const deleteChat = async (chatId) => {
    if (user && user.token) {
      try {
        await axios.delete(`http://localhost:5000/api/chats/${chatId}`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
      } catch (error) {
        console.error('Error deleting chat:', error);
      }
    }
    
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      newChat();
    }
    setShowPopover(false);
  };

  const renameChat = (chatId, newName) => {
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, name: newName } : chat
      )
    );
    if (currentChatId === chatId) {
      setshortChatName(newName);
    }
    setModalShow(false);
  };

  const handlePopoverToggle = (chartname, e) => {
    setPopoverchartNmae(chartname);
    setShowPopover(!showPopover);
    e.stopPropagation(); // Prevent triggering popover on other elements
  };

  const renameCallback = useCallback((type, value='')=>{
    if(type === 'save'){
      if (currentChatId) {
        renameChat(currentChatId, value);
      } else {
        setshortChatName(value);
        setModalShow(false);
      }
    }
    else{
      setModalShow(false)
    }
  },[currentChatId])

  return (
    <>
      <div className="chat-container">
        {/* Mobile Overlay */}
        {!sidebarCollapsed && (
          <div 
            className="mobile-overlay"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Enhanced Sidebar */}
        <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-title">
              <FontAwesomeIcon icon={faMessage} className="title-icon" />
              {!sidebarCollapsed && <span>Chat History</span>}
            </div>
            <button 
              className="sidebar-toggle" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <FontAwesomeIcon icon={sidebarCollapsed ? faBars : faTimes} />
            </button>
          </div>
          
          {!sidebarCollapsed && (
            <div className="sidebar-content">
              <button className="new-chat-btn" onClick={newChat}>
                <FontAwesomeIcon icon={faPlus} />
                <span>New Chat</span>
              </button>
              
              <div className="chat-history-list">
                {chatHistory.map((chat) => (
                  <div 
                    key={chat.id} 
                    className={`chat-history-item ${currentChatId === chat.id ? 'active' : ''}`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="chat-item-content">
                      <div className="chat-item-name">
                        {chat.name || 'Untitled Chat'}
                      </div>
                      <div className="chat-item-time">
                        {new Date(chat.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="chat-item-actions">
                      <button
                        className="chat-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPopoverchartNmae(chat.id);
                          setShowPopover(!showPopover);
                        }}
                      >
                        <FontAwesomeIcon icon={faEllipsisV} />
                      </button>
                      
                      {(showPopover && popoverChartName === chat.id) && (
                        <div className="chat-popover">
                          <button onClick={() => {
                            setModalShow(true);
                            setShowPopover(false);
                          }}>
                            <FontAwesomeIcon icon={faEdit} />
                            Rename
                          </button>
                          <button onClick={() => deleteChat(chat.id)}>
                            <FontAwesomeIcon icon={faTrash} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Current chat if it has messages but isn't saved yet */}
                {chatMessages.length > 0 && !currentChatId && (
                  <div className="chat-history-item current-unsaved">
                    <div className="chat-item-content">
                      <div className="chat-item-name">
                        {shortChatName || 'New Chat'}
                      </div>
                      <div className="chat-item-time">Now</div>
                    </div>
                    <div className="chat-item-actions">
                      <button
                        className="chat-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPopoverchartNmae('current');
                          setShowPopover(!showPopover);
                        }}
                      >
                        <FontAwesomeIcon icon={faEllipsisV} />
                      </button>
                      
                      {(showPopover && popoverChartName === 'current') && (
                        <div className="chat-popover">
                          <button onClick={() => {
                            setModalShow(true);
                            setShowPopover(false);
                          }}>
                            <FontAwesomeIcon icon={faEdit} />
                            Rename
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Chat App */}
        <div className="chat-app" style={{ backgroundColor: theme.background, color: theme.color }}>
          <div className="chat-header">
            <div className="chat-header-left">
              <button 
                className="mobile-menu-btn"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                <FontAwesomeIcon icon={faBars} />
              </button>
              <h2 style={{ color: theme.color }}>✨ AI Chat Assistant ✨</h2>
              {shortChatName && (
                <div className="current-chat-name">
                  {shortChatName}
                </div>
              )}
            </div>
            <div className="chat-header-actions">
              {user ? (
                <div className="user-info">
                  <div className="user-avatar">
                    <FontAwesomeIcon icon={faUser} />
                  </div>
                  <span className="user-name">{user.name}</span>
                  <button 
                    className="logout-btn" 
                    onClick={logout}
                    title="Sign Out"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} />
                  </button>
                </div>
              ) : (
                <button 
                  className="signin-btn" 
                  onClick={() => setShowAuthModal(true)}
                >
                  <FontAwesomeIcon icon={faUser} />
                  Sign In
                </button>
              )}
              <button 
                className="theme-toggle-btn" 
                onClick={toggleTheme}
                title="Toggle theme"
              >
                <FontAwesomeIcon icon={faMoon} />
              </button>
            </div>
          </div>
          
          <div className="chat-messages-container">
            {chatMessages.length === 0 ? (
              <div className="welcome-message">
                <div className="welcome-content">
                  <FontAwesomeIcon icon={faMessage} className="welcome-icon" />
                  <h3>Welcome to AI Chat Assistant!</h3>
                  <p>Start a conversation by typing a message below.</p>
                </div>
              </div>
            ) : (
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
                    <div className="bubble-content">
                      {msg.audio && (
                        <div className="audio-message">
                          <audio controls src={msg.audio}></audio>
                        </div>
                      )}
                      {msg.message && (
                        <div className="text-message">
                          <p>{msg.message}</p>
                        </div>
                      )}
                    </div>
                    <div className="bubble-time">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="typing-indicator">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="typing-text">AI is typing...</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="input-container">
            <div className="message-input-wrapper">
              <div className="message-input">
                <input
                  type="text"
                  value={userMessage}
                  onChange={handleInputChange}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage(userMessage)}
                />
                <div className="input-actions">
                  <button
                    className="voice-btn"
                    onClick={isRecording ? stopRecording : startRecording}
                    title={isRecording ? "Stop recording" : "Start voice recording"}
                  >
                    <FontAwesomeIcon icon={isRecording ? faStop : faMicrophone} />
                  </button>
                  <button
                    className="send-button"
                    onClick={() => sendMessage(userMessage)}
                    disabled={!userMessage.trim()}
                  >
                    <FontAwesomeIcon icon={faPaperPlane} />
                  </button>
                </div>
              </div>
              {isRecording && (
                <div className="recording-indicator">
                  <div className="recording-dot"></div>
                  <span>Recording... {recordingDuration}s</span>
                </div>
              )}
            </div>
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

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};

export default App;
