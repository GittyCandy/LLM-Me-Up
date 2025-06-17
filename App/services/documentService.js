const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function processDocument(filePath, callback) {
  const pythonProcess = spawn('python', [
    '-u',
    path.join(__dirname, '../documentProcessor.py'),
    filePath
  ]);

  let content = '';
  pythonProcess.stdout.on('data', (data) => content += data.toString());
  pythonProcess.stderr.on('data', (data) => console.error(`Document processing error: ${data}`));
  pythonProcess.on('close', (code) => code !== 0
    ? callback(new Error(`Document processing failed with code ${code}`))
    : callback(null, content));
}

function handleFileUpload(file, uploadPath) {
  return new Promise((resolve, reject) => {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(path.dirname(uploadPath))) {
      fs.mkdirSync(path.dirname(uploadPath), { recursive: true });
    }

    file.mv(uploadPath, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = {
  processDocument,
  handleFileUpload
};