document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('uploadBtn');
  const pdfUpload = document.getElementById('pdfUpload');
  const dropZone = document.getElementById('dropZone');
  const fileInfo = document.getElementById('fileInfo');
  const fileName = document.getElementById('fileName');
  const chatSection = document.getElementById('chatSection');
  const chatContainer = document.getElementById('chatContainer');
  const questionInput = document.getElementById('questionInput');
  const sendBtn = document.getElementById('sendBtn');
  
  let currentFilename = '';

  // Handle file selection via button
  uploadBtn.addEventListener('click', () => {
    pdfUpload.click();
  });

  pdfUpload.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  });

  // Drag and drop functionality
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#4361ee';
    dropZone.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#ccc';
    dropZone.style.backgroundColor = 'transparent';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#ccc';
    dropZone.style.backgroundColor = 'transparent';
    
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  // Send question when button is clicked or Enter is pressed
  sendBtn.addEventListener('click', sendQuestion);
  questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendQuestion();
    }
  });

  async function handleFileUpload(file) {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        currentFilename = data.filename;
        fileName.textContent = currentFilename;
        fileInfo.style.display = 'block';
        chatSection.style.display = 'flex';
        
        // Scroll to chat section
        chatSection.scrollIntoView({ behavior: 'smooth' });
        
        // Add welcome message
        addMessage('assistant', 'Hello! I\'ve loaded the PDF. Ask me anything about its content.');
      } else {
        throw new Error(data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file: ' + error.message);
    }
  }

  function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${role}-message`);
    
    if (role === 'assistant' && content === '...') {
      // Show loading animation
      messageDiv.innerHTML = `
        <div class="loading-dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      `;
    } else {
      messageDiv.textContent = content;
    }
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

// Add this helper function
function cleanResponse(text) {
  // Remove <think> tags and any other processing elements
  return text.replace(/<think>.*?<\/think>/gs, '').trim();
}

async function sendQuestion() {
  const question = questionInput.value.trim();
  if (!question || !currentFilename) return;

  // Add user message to chat
  addMessage('user', question);
  questionInput.value = '';

  // Add loading indicator for assistant
  addMessage('assistant', '...');

  try {
    const response = await fetch('/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: question,
        filename: currentFilename
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Remove loading indicator and add actual response
      chatContainer.removeChild(chatContainer.lastChild);
      const cleanAnswer = cleanResponse(data.answer);
      addMessage('assistant', cleanAnswer);
    } else {
      throw new Error(data.error || 'Failed to get answer');
    }
  } catch (error) {
    console.error('Error:', error);
    chatContainer.removeChild(chatContainer.lastChild);
    addMessage('assistant', 'Sorry, I encountered an error processing your question.');
  }
}

});