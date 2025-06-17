const { processDocument, handleFileUpload } = require('../services/documentService');
const path = require('path');

exports.handleUpload = async (req, res) => {
  if (!req.files || !req.files.document) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const document = req.files.document;
  const uploadPath = path.join(__dirname, '../public', 'uploads', document.name);

  try {
    await handleFileUpload(document, uploadPath);

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
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'File upload failed' });
  }
};