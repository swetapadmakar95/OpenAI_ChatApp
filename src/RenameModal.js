import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import EmojiPicker from 'emoji-picker-react';
// import 'emoji-mart/css/emoji-mart.css'; 

const RenameModal = (props) => {
  const { editedMessage, onHide } = props;

  const [inputValue, setInputValue] = useState(editedMessage || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); 

  const handleInput = (event) => {
    setInputValue(event.target.value);
  };

  const handleCancel = () => {
    onHide('cancel');
    setInputValue('');
  };

  const handleSave = () => {
    onHide('save', inputValue);
    setInputValue('');
  };

  const handleEmojiSelect = (emoji) => {
    setInputValue(inputValue + emoji.emoji);
    setShowEmojiPicker(false);
  };
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  return (
    <Modal
      {...props} 
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          Rename this chat
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={handleInput}
            className='modalInput'
            placeholder="Enter new name"
          />
          {/* Plus button to toggle the emoji picker */}
          <button
            className="emoji-button"
            onClick={toggleEmojiPicker}
            style={{ fontSize: '20px', marginLeft: '10px' }}
          >
            +
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker">
              {/* <Picker onSelect={handleEmojiSelect} /> */}
              <EmojiPicker onEmojiClick={handleEmojiSelect}/>
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSave}>Rename</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RenameModal;
