const path = require('path');
const fs = require('fs');

const CONVERSATIONS_DIR = path.join(__dirname, '../conversations');
if (!fs.existsSync(CONVERSATIONS_DIR)) {
  fs.mkdirSync(CONVERSATIONS_DIR);
}

const MODELS = [
  { value: 'dolphin-llama3:8b', name: 'Dolphin Llama3 8B' },
  { value: 'llama2', name: 'Llama2' }
];

module.exports = {
  CONVERSATIONS_DIR,
  MODELS
};