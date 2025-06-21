const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const conversationController = require('../controllers/conversationController');
const uploadController = require('../controllers/uploadController');

// Chat routes
router.get('/chatbot', chatController.renderChat);
router.get('/researchbot', chatController.renderChat);
router.get('/download', chatController.renderChat);

router.post('/api/chat', chatController.handleChat);

// Conversation routes
router.get('/api/conversation/:id', conversationController.getConversation);
router.delete('/api/conversation/:id', conversationController.deleteConversation);
router.post('/api/conversation/rename', conversationController.renameConversation);

// Upload route
router.post('/api/upload', uploadController.handleUpload);

module.exports = router;