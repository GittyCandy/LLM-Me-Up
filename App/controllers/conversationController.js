const conversationService = require('../services/conversationService');

exports.getConversation = (req, res) => {
  const conversation = conversationService.getConversation(req.params.id);
  if (conversation) {
    res.json(conversation);
  } else {
    res.status(404).json({ error: 'Conversation not found' });
  }
};

exports.deleteConversation = (req, res) => {
  const success = conversationService.deleteConversation(req.params.id);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Conversation not found' });
  }
};

exports.renameConversation = (req, res) => {
  const { conversationId, newName } = req.body;
  const success = conversationService.renameConversation(conversationId, newName);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Conversation not found' });
  }
};