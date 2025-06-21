const express = require('express');
const fileUpload = require('express-fileupload');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const tmp = require('tmp');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
app.use(express.static('public'));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const server = http.createServer(app);
const io = socketIo(server);

// Conversation storage
const CONVERSATIONS_DIR = path.join(__dirname, 'conversations');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const DOCUMENTS_DIR = path.join(__dirname, 'documents');

// Create directories if they don't exist
[CONVERSATIONS_DIR, UPLOADS_DIR, DOCUMENTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Models data
const MODELS = [
  { value: 'deepseek-r1:8b', name: 'DeepSeek R1' },
  { value: 'dolphin-llama3:8b', name: 'Dolphin Llama3 8B' },
  { value: 'llama2', name: 'Llama2' },
  { value: 'mistral', name: 'Mistral' },
  { value: 'gemma:7b', name: 'Gemma 7B' }
];

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chatbot', (req, res) => {
  const conversations = fs.readdirSync(CONVERSATIONS_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(CONVERSATIONS_DIR, file);
      const data = fs.readFileSync(filePath, 'utf8');
      const conversation = JSON.parse(data);
      return {
        id: file.replace('.json', ''),
        name: conversation.name || `Chat ${file.replace('.json', '').slice(0, 8)}`,
        updatedAt: conversation.updatedAt || fs.statSync(filePath).mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  res.render('chatbot', {
    title: 'Advanced AI Chat',
    conversations,
    models: MODELS
  });
});

app.get('/api/conversation/:id', (req, res) => {
  const filePath = path.join(CONVERSATIONS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data));
  } else {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

app.delete('/api/conversation/:id', (req, res) => {
  const filePath = path.join(CONVERSATIONS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

app.post('/api/conversation/rename', (req, res) => {
  const { conversationId, newName } = req.body;
  const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  try {
    const conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    conversation.name = newName;
    conversation.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error renaming conversation:', error);
    res.status(500).json({ error: 'Failed to rename conversation' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, model, conversationId, documentId } = req.body;

    let conversation = {
      messages: [],
      name: generateChatTitle(message),
      updatedAt: new Date().toISOString()
    };
    let convId = conversationId || uuidv4();
    const filePath = path.join(CONVERSATIONS_DIR, `${convId}.json`);

    if (conversationId && fs.existsSync(filePath)) {
      conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      conversation.updatedAt = new Date().toISOString();
    }

    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      ...(documentId && { documentId })
    });

    // Save conversation with user message
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));

    // Get conversation history for context
    const conversationHistory = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.documentId && { documentId: msg.documentId })
    }));

    // If document is referenced, include its content
    let documentContent = '';
    if (documentId) {
      const docPath = path.join(DOCUMENTS_DIR, `${documentId}.txt`);
      if (fs.existsSync(docPath)) {
        documentContent = fs.readFileSync(docPath, 'utf8');
      }
    }

    const aiResponse = await processAIRequest({
      prompt: message,
      model,
      conversationHistory,
      documentContent
    });

    // Add AI response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });

    // Save conversation with AI response
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));

    res.json({
      response: aiResponse,
      conversationId: convId
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

app.post('/api/upload', async (req, res) => {
  if (!req.files || !req.files.document) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const document = req.files.document;
  const fileExt = path.extname(document.name).toLowerCase();
  const allowedTypes = ['.pdf', '.txt', '.docx', '.pptx', '.xlsx', '.csv', '.md'];

  if (!allowedTypes.includes(fileExt)) {
    return res.status(400).json({ error: 'Unsupported file type' });
  }

  try {
    // Generate a unique ID for the document
    const docId = uuidv4();
    const uploadPath = path.join(DOCUMENTS_DIR, `${docId}${fileExt}`);
    const textPath = path.join(DOCUMENTS_DIR, `${docId}.txt`);

    // Move the file to documents directory
    await document.mv(uploadPath);

    // Process the document to extract text
    const content = await processDocument(uploadPath);

    // Save extracted text
    fs.writeFileSync(textPath, content);

    res.json({
      documentId: docId,
      filename: document.name,
      size: document.size,
      type: mime.lookup(fileExt) || 'application/octet-stream',
      content: content.length > 500 ? content.substring(0, 500) + '...' : content
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File processing failed' });
  }
});

app.get('/api/document/:id', (req, res) => {
  const docPath = path.join(DOCUMENTS_DIR, `${req.params.id}.txt`);
  if (fs.existsSync(docPath)) {
    const content = fs.readFileSync(docPath, 'utf8');
    res.json({
      content: content.length > 1000 ? content.substring(0, 1000) + '...' : content
    });
  } else {
    res.status(404).json({ error: 'Document not found' });
  }
});

// AI Processing Functions
async function processAIRequest({ prompt, model = 'dolphin-llama3:8b', conversationHistory = [], documentContent = '' }) {
  return new Promise((resolve, reject) => {
    const data = {
      prompt,
      model,
      conversationHistory,
      documentContent
    };

    const pythonProcess = spawn('python', [
      '-u',
      path.join(__dirname, 'aiProcessor.py'),
      JSON.stringify(data)
    ]);

    let response = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      response += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0 || error) {
        console.error(`AI processing error: ${error}`);
        reject(new Error(`AI process failed: ${error}`));
      } else {
        resolve(response);
      }
    });
  });
}

async function processDocument(filePath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      '-u',
      path.join(__dirname, 'documentProcessor.py'),
      filePath
    ]);

    let content = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      content += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0 || error) {
        reject(new Error(`Document processing failed: ${error}`));
      } else {
        resolve(content);
      }
    });
  });
}



function generateChatTitle(firstMessage) {
  if (!firstMessage) return `Chat ${new Date().toLocaleString()}`;

  // Clean the message
  const cleaned = firstMessage.trim().replace(/[\n\r]+/g, ' ');
  const words = cleaned.split(' ').filter(word => word.length > 0);

  // Take first 5 words or less
  const shortMessage = words.slice(0, 5).join(' ');
  return shortMessage.length > 30 ? shortMessage.slice(0, 30) + '...' : shortMessage;
}

// WebSocket for real-time updates
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3040;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});