const express = require('express');
const fileUpload = require('express-fileupload');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static('public'));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Conversation storage
const CONVERSATIONS_DIR = path.join(__dirname, 'conversations');
if (!fs.existsSync(CONVERSATIONS_DIR)) {
  fs.mkdirSync(CONVERSATIONS_DIR);
}

// Models data
const MODELS = [
  { value: 'deepseek-r1:8b', name: 'DeepSeek R1' },
  { value: 'dolphin-llama3:8b', name: 'Dolphin Llama3 8B' },
  { value: 'llama2', name: 'Llama2' }
];

// Routes
// Serve index.html from public folder as homepage
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
        name: conversation.name || `Chat ${file.replace('.json', '').slice(0, 8)}`
      };
    });

  res.render('chatbot', {
    title: 'Advanced AI Chat',
    conversations,
    models: MODELS
  });
});


// Get conversation history
app.get('/api/conversation/:id', (req, res) => {
  const filePath = path.join(CONVERSATIONS_DIR, `${req.params.id}.json`);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data));
  } else {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

// Delete conversation
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
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error renaming conversation:', error);
    res.status(500).json({ error: 'Failed to rename conversation' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, model, conversationId } = req.body;

    let conversation = {
      messages: [],
      name: generateChatTitle(message)
    };
    let convId = conversationId || crypto.randomUUID();
    const filePath = path.join(CONVERSATIONS_DIR, `${convId}.json`);

    if (conversationId && fs.existsSync(filePath)) {
      conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Save conversation with user message
    fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));

    // Get conversation history for context
    const conversationHistory = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const aiResponse = await processAIRequest(message, model, conversationHistory);

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

app.post('/api/upload', (req, res) => {
  if (!req.files || !req.files.document) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const document = req.files.document;
  const uploadPath = path.join(__dirname, 'public', 'uploads', document.name);

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(path.dirname(uploadPath))) {
    fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
  }

  document.mv(uploadPath, (err) => {
    if (err) {
      console.error('File upload error:', err);
      return res.status(500).json({ error: 'File upload failed' });
    }

    // Process the document (PDF, TXT, etc.)
    processDocument(uploadPath, (err, content) => {
      if (err) {
        console.error('Document processing error:', err);
        return res.status(500).json({ error: 'Document processing failed' });
      }
      res.json({
        content: content.toString(),
        filename: document.name
      });
    });
  });
});

// AI Processing Functions
async function processAIRequest(prompt, model = 'dolphin-llama3:8b', conversationHistory = []) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      '-u',  // Unbuffered output
      path.join(__dirname, 'aiProcessor.py'),
      JSON.stringify({  // Send as JSON
        prompt,
        model,
        conversationHistory
      })
    ]);

    let response = '';

    pythonProcess.stdout.on('data', (data) => {
      response += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`AI processing error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`AI process exited with code ${code}`));
      } else {
        resolve(response);
      }
    });
  });
}

function processDocument(filePath, callback) {
  const pythonProcess = spawn('python', [
    '-u',
    path.join(__dirname, 'documentProcessor.py'),
    filePath
  ]);

  let content = '';

  pythonProcess.stdout.on('data', (data) => {
    content += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Document processing error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      callback(new Error(`Document processing failed with code ${code}`));
    } else {
      callback(null, content);
    }
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


app.get('/researcherAgent', (req, res) => {
    res.render('researcher');
});

app.post('/api/local-research', async (req, res) => {
    const { prompt, mode } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt parameter is required' });
    }

    try {
        const pythonProcess = spawn('python', ['generate_agent.py', prompt, 'local-research', mode || 'standard']);

        let responseData = '';
        let errorData = '';

        pythonProcess.stdout.on('data', (data) => {
            responseData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0 || errorData) {
                console.error(`Local research error: ${errorData}`);
                return res.status(500).json({
                    error: 'Local research process failed',
                    details: errorData
                });
            }

            try {
                const result = JSON.parse(responseData);
                res.json(result);
            } catch (e) {
                res.status(500).json({
                    error: 'Failed to parse local research response',
                    response: responseData
                });
            }
        });
    } catch (error) {
        console.error('Local research error:', error);
        res.status(500).json({
            error: 'Local research failed',
            details: error.message
        });
    }
});

// Enhanced API endpoint
app.post('/api/generate', (req, res) => {
    const { prompt, agent_type, mode } = req.body;
    const validAgentTypes = ['generate', 'search', 'web', 'analyze', 'reflect', 'report', 'quickread'];
    const validModes = ['standard', 'quick'];

    if (!validAgentTypes.includes(agent_type)) {
        return res.status(400).json({ error: 'Invalid agent type' });
    }

    if (mode && !validModes.includes(mode)) {
        return res.status(400).json({ error: 'Invalid mode' });
    }

    const pythonProcess = spawn('python', ['generate_agent.py', prompt, agent_type, mode || 'standard']);

    let responseData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
        responseData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0 || errorData) {
            console.error(`Agent error: ${errorData}`);
            return res.status(500).json({
                error: 'Agent process failed',
                details: errorData
            });
        }

        try {
            const result = JSON.parse(responseData);
            res.json(result);
        } catch (e) {
            res.status(500).json({
                error: 'Failed to parse agent response',
                response: responseData
            });
        }
    });
});

// Start server
const PORT = process.env.PORT || 3040;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});