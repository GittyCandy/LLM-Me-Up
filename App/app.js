const express = require('express');
const configureMiddleware = require('./config/middleware');
const apiRoutes = require('./routes/apiRoutes');

const app = express();

// Configure middleware
configureMiddleware(app);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes
app.use('/', apiRoutes);

module.exports = app;