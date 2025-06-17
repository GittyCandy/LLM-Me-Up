const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.render('researcher');
});

// API endpoint for generating content
app.post('/api/generate', (req, res) => {
    const { prompt, agent_type, mode } = req.body;
    const validAgentTypes = ['generate', 'search', 'web', 'analyze', 'reflect', 'report', 'quickread', 'local-research'];

    if (!validAgentTypes.includes(agent_type)) {
        return res.status(400).json({ error: 'Invalid agent type' });
    }

    const pythonProcess = spawn('python', ['generate_agent.py', prompt, agent_type, mode || 'standard']);

    let responseData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
        responseData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0 || errorData) {
            console.error(`Agent error: ${errorData}`);
            return res.status(500).json({
                error: 'Agent process failed',
                details: errorData
            });
        }

        try {
            const result = JSON.parse(responseData);
            res.json(result);
        } catch (e) {
            res.status(500).json({
                error: 'Failed to parse agent response',
                response: responseData
            });
        }
    });
});

// API endpoint for local research (no web search)
app.post('/api/local-research', (req, res) => {
    const { prompt, mode } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt parameter is required' });
    }

    const pythonProcess = spawn('python', ['generate_agent.py', prompt, 'local-research', mode || 'standard']);

    let responseData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
        responseData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0 || errorData) {
            console.error(`Local research error: ${errorData}`);
            return res.status(500).json({
                error: 'Local research process failed',
                details: errorData
            });
        }

        try {
            const result = JSON.parse(responseData);
            res.json(result);
        } catch (e) {
            res.status(500).json({
                error: 'Failed to parse local research response',
                response: responseData
            });
        }
    });
});

// API endpoint for web searches using SerpAPI
app.post('/api/search', async (req, res) => {
    const { query, mode } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const apiKey = 'fbda3e1231c66ca5d55f6df45e4fd770af8a9fd06bf4d5db030eb7b0ec81bf47';
        const numResults = mode === 'quick' ? 1 : 1;

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
        const results = response.data.organic_results.map(result => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet
        }));

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