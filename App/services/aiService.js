const { spawn } = require('child_process');
const path = require('path');

async function processAIRequest(prompt, model = 'dolphin-llama3:8b', conversationHistory = []) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [
      '-u',
      path.join(__dirname, '../aiProcessor.py'),
      JSON.stringify({
        prompt,
        model,
        conversationHistory
      })
    ]);

    let response = '';
    pythonProcess.stdout.on('data', (data) => response += data.toString());
    pythonProcess.stderr.on('data', (data) => console.error(`AI processing error: ${data}`));
    pythonProcess.on('close', (code) => code !== 0
      ? reject(new Error(`AI process exited with code ${code}`))
      : resolve(response));
  });
}

module.exports = {
  processAIRequest
};