const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CONVERSATIONS_DIR } = require('../config/constants');

function generateChatTitle(firstMessage) {
  if (!firstMessage) return `Chat ${new Date().toLocaleString()}`;
  const cleaned = firstMessage.trim().replace(/[\n\r]+/g, ' ');
  const words = cleaned.split(' ').filter(word => word.length > 0);
  const shortMessage = words.slice(0, 5).join(' ');
  return shortMessage.length > 30 ? shortMessage.slice(0, 30) + '...' : shortMessage;
}

function getAllConversations() {
  return fs.readdirSync(CONVERSATIONS_DIR)
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
}

function getConversation(id) {
  const filePath = path.join(CONVERSATIONS_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return null;
}

function saveConversation(id, conversation) {
  const filePath = path.join(CONVERSATIONS_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
}

function deleteConversation(id) {
  const filePath = path.join(CONVERSATIONS_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

function renameConversation(id, newName) {
  const filePath = path.join(CONVERSATIONS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return false;

  const conversation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  conversation.name = newName;
  fs.writeFileSync(filePath, JSON.stringify(conversation, null, 2));
  return true;
}

module.exports = {
  generateChatTitle,
  getAllConversations,
  getConversation,
  saveConversation,
  deleteConversation,
  renameConversation
};