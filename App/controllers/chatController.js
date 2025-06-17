const { processAIRequest } = require('../services/aiService');
const conversationService = require('../services/conversationService');
const { MODELS } = require('../config/constants');

exports.renderChat = (req, res) => {
  const conversations = conversationService.getAllConversations();
  res.render('chatbot', {
    title: 'Advanced AI Chat',
    conversations,
    models: MODELS
  });
};

exports.handleChat = async (req, res) => {
  try {
    const { message, model, conversationId } = req.body;
    let convId = conversationId || crypto.randomUUID();

    let conversation = {
      messages: [],
      name: conversationService.generateChatTitle(message)
    };

    if (conversationId) {
      const existing = conversationService.getConversation(conversationId);
      if (existing) conversation = existing;
    }

    // Add user message
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Save conversation
    conversationService.saveConversation(convId, conversation);

    // Get conversation history for context
    const conversationHistory = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const aiResponse = await processAIRequest(message, model, conversationHistory);

    // Add AI response
    conversation.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });

    // Save again
    conversationService.saveConversation(convId, conversation);

    res.json({
      response: aiResponse,
      conversationId: convId
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'AI processing failed' });
  }
};