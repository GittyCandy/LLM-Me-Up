const express = require('express');
const fileUpload = require('express-fileupload');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

// Ensure PDF directory exists
const pdfDir = path.join(__dirname, 'PDFChat/pdfs');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'PDF Chat Assistant' });
});

app.post('/upload', (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ error: 'No files were uploaded.' });
  }

  const pdfFile = req.files.pdf;
  const uploadPath = path.join(pdfDir, pdfFile.name);

  pdfFile.mv(uploadPath, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'File uploaded successfully', filename: pdfFile.name });
  });
});

app.post('/ask', (req, res) => {
  const { question, filename } = req.body;

  if (!question || !filename) {
    return res.status(400).json({ error: 'Question and filename are required' });
  }

  const pythonProcess = spawn('python', [
    path.join(__dirname, 'pdf.py'),
    '--question', question,
    '--filename', filename
  ]);

  let answer = '';
  let error = '';

  pythonProcess.stdout.on('data', (data) => {
    answer += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    error += data.toString();
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0 || error) {
      return res.status(500).json({ error: error || 'Python script failed' });
    }

    // Remove <think> tags and similar processing elements
    const cleanAnswer = answer.replace(/<think>.*?<\/think>/gs, '').trim();
    res.json({ answer: cleanAnswer });
  });
});

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});