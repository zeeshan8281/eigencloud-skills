const express = require('express');
const path = require('path');
const { EigenCompute } = require('./index');

const app = express();
const PORT = process.env.PORT || 4200;

app.use(express.static(path.join(__dirname, 'ui')));
app.use(express.json());

const compute = new EigenCompute();

// API endpoint for health check
app.get('/api/health', (req, res) => {
    res.json(compute.healthCheck());
});

// API endpoint for whoami
app.get('/api/whoami', (req, res) => {
    try {
        const result = compute.whoami();
        res.json({ success: true, data: result });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// API endpoint for list apps
app.get('/api/apps', (req, res) => {
    try {
        const result = compute.listApps();
        res.json({ success: true, data: result });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`eigen-skills landing page at http://localhost:${PORT}`);
});
