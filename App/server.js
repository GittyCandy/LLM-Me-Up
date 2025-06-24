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

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));
app.use(express.static('public'));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const server = http.createServer(app);
const io = socketIo(server, {
  pingTimeout: 60000,
  pingInterval: 25000
});

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
  { value: 'deepseek-coder:6.7b', name: 'DeepSeek Coder' },
  { value: 'dolphin-llama3:8b', name: 'Dolphin (Uncensored)' },
  { value: 'llama2', name: 'Llama2' },
  { value: 'gemma3:4b', name: 'Gemma 3' }
];

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/chatbot', (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

app.get('/api/conversation/:id', (req, res, next) => {
  try {
    const filePath = path.join(CONVERSATIONS_DIR, `${req.params.id}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } catch (err) {
    next(err);
  }
});

app.delete('/api/conversation/:id', (req, res, next) => {
  try {
    const filePath = path.join(CONVERSATIONS_DIR, `${req.params.id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } catch (err) {
    next(err);
  }
});

app.post('/api/conversation/rename', (req, res, next) => {
  try {
    const { conversationId, newName } = req.body;
    if (!conversationId || !newName) {
      return res.status(400).json({ error: 'Missing conversationId or newName' });
    }

    const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    conversation.name = newName;
    conversation.updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post('/api/chat', async (req, res, next) => {
  try {
    const { message, model, conversationId, documentId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

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
      model: model || 'dolphin-llama3:8b',
      conversationHistory,
      documentContent
    });

    // Format numbers in response
    const formattedResponse = formatNumbersInText(aiResponse);

    // Add AI response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: formattedResponse,
      timestamp: new Date().toISOString()
    });

    // Save conversation with AI response
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));

    res.json({
      response: formattedResponse,
      conversationId: convId
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'AI processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/regenerate', async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    let conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Remove the last AI message if it exists
    if (conversation.messages.length > 0 &&
        conversation.messages[conversation.messages.length - 1].role === 'assistant') {
      conversation.messages.pop();
    }

    // Get the last user message
    const lastUserMessage = conversation.messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user');

    if (!lastUserMessage) {
      return res.status(400).json({ error: 'No user message to regenerate from' });
    }

    // Get conversation history for context
    const conversationHistory = conversation.messages
      .filter(msg => msg !== lastUserMessage)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.documentId && { documentId: msg.documentId })
      }));

    // If document is referenced, include its content
    let documentContent = '';
    if (lastUserMessage.documentId) {
      const docPath = path.join(DOCUMENTS_DIR, `${lastUserMessage.documentId}.txt`);
      if (fs.existsSync(docPath)) {
        documentContent = fs.readFileSync(docPath, 'utf8');
      }
    }

    const aiResponse = await processAIRequest({
      prompt: lastUserMessage.content,
      model: req.body.model || 'dolphin-llama3:8b',
      conversationHistory,
      documentContent
    });

    // Format numbers in response
    const formattedResponse = formatNumbersInText(aiResponse);

    // Add AI response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: formattedResponse,
      timestamp: new Date().toISOString()
    });

    // Save conversation with AI response
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));

    res.json({
      response: formattedResponse,
      conversationId
    });
  } catch (error) {
    console.error('Regenerate error:', error);
    res.status(500).json({
      error: 'AI processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/upload', async (req, res, next) => {
  try {
    if (!req.files || !req.files.document) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const document = req.files.document;
    const fileExt = path.extname(document.name).toLowerCase();
    const allowedTypes = ['.pdf', '.txt', '.docx', '.pptx', '.xlsx', '.csv', '.md'];

    if (!allowedTypes.includes(fileExt)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Generate a unique ID for the document
    const docId = uuidv4();
    const uploadPath = path.join(DOCUMENTS_DIR, `${docId}${fileExt}`);
    const textPath = path.join(DOCUMENTS_DIR, `${docId}.txt`);

    // Move the file to documents directory
    await document.mv(uploadPath);

    // Process the document to extract text
    const content = await processDocument(uploadPath);

    // Clean the content to remove any unknown characters
    const cleanedContent = content.replace(/[^\x00-\x7F]/g, '');

    // Save extracted text
    fs.writeFileSync(textPath, cleanedContent);

    res.json({
      documentId: docId,
      filename: document.name,
      size: document.size,
      type: mime.lookup(fileExt) || 'application/octet-stream',
      content: cleanedContent.length > 500 ?
        cleanedContent.substring(0, 500) + '...' : cleanedContent
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/document/:id', (req, res, next) => {
  try {
    const docPath = path.join(DOCUMENTS_DIR, `${req.params.id}.txt`);
    if (fs.existsSync(docPath)) {
      const content = fs.readFileSync(docPath, 'utf8');
      res.json({
        content: content.length > 1000 ?
          content.substring(0, 1000) + '...' : content
      });
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (err) {
    next(err);
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
      path.join(__dirname, 'aiProcessor.py')
    ]);

    // Write data to stdin
    pythonProcess.stdin.write(JSON.stringify(data));
    pythonProcess.stdin.end();

    let response = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      response += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    pythonProcess.on('error', (err) => {
      console.error('Python process error:', err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0 || error) {
        console.error(`AI processing error: ${error}`);
        reject(new Error(`AI process failed with code ${code}: ${error}`));
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

    pythonProcess.on('error', (err) => {
      console.error('Python process error:', err);
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0 || error) {
        reject(new Error(`Document processing failed with code ${code}: ${error}`));
      } else {
        resolve(content);
      }
    });
  });
}

function formatNumbersInText(text) {
  // Format large numbers with commas (e.g., 1000000 -> 1,000,000)
  return text.replace(/\b\d{4,}\b/g, num =>
    parseInt(num).toLocaleString()
  );
}

function generateChatTitle(firstMessage) {
  if (!firstMessage) return `Chat ${new Date().toLocaleString()}`;

  // Clean the message and remove any unknown characters
  const cleaned = firstMessage.trim()
    .replace(/[\n\r]+/g, ' ')
    .replace(/[^\x00-\x7F]/g, '');

  const words = cleaned.split(' ').filter(word => word.length > 0);

  // Take first 5 words or less
  const shortMessage = words.slice(0, 5).join(' ');
  return shortMessage.length > 30 ? shortMessage.slice(0, 30) + '...' : shortMessage;
}

// WebSocket for real-time updates
// Add this to your server.js after the WebSocket setup
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('start_stream', async ({ messageId, data }) => {
        try {
            const { message, model, conversationId, documentId } = data;

            // Get conversation history if conversationId exists
            let conversationHistory = [];
            let documentContent = '';

            if (conversationId) {
                const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);
                if (fs.existsSync(filePath)) {
                    const conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    conversationHistory = conversation.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        ...(msg.documentId && { documentId: msg.documentId })
                    }));
                }
            }

            // If document is referenced, include its content
            if (documentId) {
                const docPath = path.join(DOCUMENTS_DIR, `${documentId}.txt`);
                if (fs.existsSync(docPath)) {
                    documentContent = fs.readFileSync(docPath, 'utf8');
                }
            }

            // Create new conversation if needed
            let convId = conversationId || uuidv4();
            let conversation = {
                messages: [],
                name: generateChatTitle(message),
                updatedAt: new Date().toISOString()
            };
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

            // Process AI request with streaming
            const pythonProcess = spawn('python', [
                '-u',
                path.join(__dirname, 'aiProcessor.py')
            ]);

            // Write data to stdin
            pythonProcess.stdin.write(JSON.stringify({
                prompt: message,
                model: model || 'dolphin-llama3:8b',
                conversationHistory,
                documentContent
            }));
            pythonProcess.stdin.end();

            let fullResponse = '';
            let thoughtProcess = '';

            pythonProcess.stdout.on('data', (data) => {
                const chunk = data.toString();
                fullResponse += chunk;

                // Extract thought process if it exists
                const thoughtMatch = fullResponse.match(/<think>(.*?)<\/think>/s);
                if (thoughtMatch) {
                    thoughtProcess = thoughtMatch[1];
                    fullResponse = fullResponse.replace(thoughtMatch[0], '');
                }

                // Send chunk to client
                socket.emit(`stream_chunk_${messageId}`, chunk);
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`AI process error: ${data.toString()}`);
                socket.emit(`stream_error_${messageId}`, {
                    message: data.toString()
                });
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    socket.emit(`stream_error_${messageId}`, {
                        message: `AI process exited with code ${code}`
                    });
                    return;
                }

                // Format numbers in response
                const formattedResponse = formatNumbersInText(fullResponse);

                // Add AI response to conversation
                conversation.messages.push({
                    role: 'assistant',
                    content: formattedResponse,
                    timestamp: new Date().toISOString()
                });

                // Save conversation with AI response
                fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));

                // Send final data to client
                socket.emit(`stream_end_${messageId}`, {
                    conversationId: convId,
                    thoughtProcess: thoughtProcess
                });
            });

        } catch (error) {
            console.error('Stream processing error:', error);
            socket.emit(`stream_error_${messageId}`, {
                message: error.message
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Start server
const PORT = process.env.PORT || 3040;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});