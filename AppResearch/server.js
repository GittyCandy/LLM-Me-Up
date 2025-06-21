const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');
const tmp = require('tmp');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.render('researcher');
});

// Helper function to run Python script with input file
function runPythonScript(scriptName, inputData, callback) {
    tmp.file({ postfix: '.json' }, (err, inputPath, fd, cleanup) => {
        if (err) return callback(err);

        fs.writeFile(inputPath, JSON.stringify(inputData), (err) => {
            if (err) {
                cleanup();
                return callback(err);
            }

            const pythonProcess = spawn('python', [scriptName, inputPath]);
            let responseData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', (data) => {
                responseData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                cleanup();
                if (code !== 0 || errorData) {
                    return callback(new Error(`Process failed: ${errorData}`));
                }
                try {
                    const result = JSON.parse(responseData);
                    callback(null, result);
                } catch (e) {
                    callback(new Error('Failed to parse response'));
                }
            });
        });
    });
}

// API endpoint for generating content
app.post('/api/generate', (req, res) => {
    const { prompt, agent_type, mode, intensity } = req.body;
    const validAgentTypes = ['generate', 'search', 'web', 'analyze', 'reflect', 'report', 'quickread', 'local-research'];

    if (!validAgentTypes.includes(agent_type)) {
        return res.status(400).json({ error: 'Invalid agent type' });
    }

    const inputData = {
        prompt,
        agent_type,
        mode: mode || 'standard',
        intensity: mode === 'deep' ? (intensity || 3) : undefined
    };

    runPythonScript('generate_agent.py', inputData, (err, result) => {
        if (err) {
            console.error(`Agent error: ${err.message}`);
            return res.status(500).json({
                error: 'Agent process failed',
                details: err.message
            });
        }
        res.json(result);
    });
});

// API endpoint for local research (no web search)
app.post('/api/local-research', (req, res) => {
    const { prompt, mode, intensity } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt parameter is required' });
    }

    const inputData = {
        prompt,
        agent_type: 'local-research',
        mode: mode || 'standard',
        intensity: mode === 'deep' ? (intensity || 3) : undefined
    };

    runPythonScript('generate_agent.py', inputData, (err, result) => {
        if (err) {
            console.error(`Local research error: ${err.message}`);
            return res.status(500).json({
                error: 'Local research process failed',
                details: err.message
            });
        }
        res.json(result);
    });
});

// API endpoint for web searches using SerpAPI
app.post('/api/search', async (req, res) => {
    const { query, mode, intensity } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const apiKey = 'fbda3e1231c66ca5d55f6df45e4fd770af8a9fd06bf4d5db030eb7b0ec81bf47';
        const numResults = mode === 'quick' ? 3 : mode === 'deep' ? Math.min(5 + (intensity || 3), 10) : 5;

        const response = await axios.get('https://serpapi.com/search', {
            params: {
                q: query,
                api_key: apiKey,
                num: numResults,
                hl: 'en',
                gl: 'us'
            }
        });

        // Process the SerpAPI response
        let results = response.data.organic_results.map(result => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet
        }));

        // For deep mode, add credibility assessment
        if (mode === 'deep') {
            results = results.map(result => {
                // Simple heuristic for credibility - in a real app you'd use a more sophisticated approach
                let credibility = 'Medium';
                if (result.link.includes('.edu') || result.link.includes('.gov') || result.link.includes('academic')) {
                    credibility = 'High';
                } else if (result.link.includes('blogspot') || result.link.includes('wordpress')) {
                    credibility = 'Low';
                }
                return { ...result, credibility };
            });
        }

        res.json({ results });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            error: 'Search failed',
            details: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});