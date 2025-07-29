const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = 4567;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve specific pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/force-directed', (req, res) => {
    res.sendFile(path.join(__dirname, 'ForceDirectedGraph.html'));
});

app.get('/disjoint-force-directed', (req, res) => {
    res.sendFile(path.join(__dirname, 'DisjointForceDirectedGraph.html'));
});

app.get('/hierarchical', (req, res) => {
    res.sendFile(path.join(__dirname, 'HierarchicalGraph.html'));
});

app.get('/collapsible-tree', (req, res) => {
    res.sendFile(path.join(__dirname, 'CollapsibleTree.html'));
});

// Static file middleware - moved after specific routes
app.use(express.static(__dirname));

// Endpoint to process XML files using PowerShell script
app.post('/process-channels', async (req, res) => {
    try {
        const { channelsDirectory } = req.body;
        
        if (!channelsDirectory) {
            return res.status(400).json({ error: 'Channels directory path is required' });
        }

        // Check if PowerShell script exists
        const scriptPath = path.join(__dirname, 'ProcessXmlFiles.ps1');
        if (!fs.existsSync(scriptPath)) {
            return res.status(500).json({ error: 'PowerShell script not found' });
        }

        // Check if channels directory exists
        if (!fs.existsSync(channelsDirectory)) {
            return res.status(400).json({ error: 'Channels directory does not exist' });
        }

        console.log(`Processing channels directory: ${channelsDirectory}`);

        // Execute PowerShell script
        const command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}" -ChannelsDirectory "${channelsDirectory}"`;
        
        exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                console.error('PowerShell execution error:', error);
                return res.status(500).json({ 
                    error: 'Error executing PowerShell script',
                    details: error.message 
                });
            }

            if (stderr) {
                console.error('PowerShell stderr:', stderr);
            }

            console.log('PowerShell output:', stdout);

            // Check if JSON file was created
            const jsonPath = path.join(__dirname, 'LoadedData.json');
            if (fs.existsSync(jsonPath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                    res.json({ 
                        success: true, 
                        message: `Processed ${data.nodes.length} nodes and ${data.links.length} links`,
                        data: data
                    });
                } catch (parseError) {
                    res.status(500).json({ 
                        error: 'Error parsing generated JSON file',
                        details: parseError.message 
                    });
                }
            } else {
                res.status(500).json({ 
                    error: 'JSON file was not created by PowerShell script' 
                });
            }
        });

    } catch (error) {
        console.error('Error processing channels:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoints
app.post('/save-data', (req, res) => {
    try {
        const data = req.body;
        fs.writeFileSync('LoadedData.json', JSON.stringify(data, null, 2));
        res.json({ success: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/load-data', (req, res) => {
    try {
        if (fs.existsSync('LoadedData.json')) {
            const data = JSON.parse(fs.readFileSync('LoadedData.json', 'utf8'));
            res.json(data);
        } else {
            res.json({ nodes: [], links: [] });
        }
    } catch (error) {
        console.error('Error loading data:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/reset-data', (req, res) => {
    try {
        if (fs.existsSync('LoadedData.json')) {
            fs.unlinkSync('LoadedData.json');
        }
        res.json({ success: true, message: 'Data reset successfully' });
    } catch (error) {
        console.error('Error resetting data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// User data endpoints for preserving comments, statuses, etc.
app.post('/save-user-data', (req, res) => {
    try {
        const userData = req.body;
        userData.lastUpdated = new Date().toISOString();
        fs.writeFileSync('UserData.json', JSON.stringify(userData, null, 2));
        res.json({ success: true, message: 'User data saved successfully' });
    } catch (error) {
        console.error('Error saving user data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/load-user-data', (req, res) => {
    try {
        if (fs.existsSync('UserData.json')) {
            const userData = JSON.parse(fs.readFileSync('UserData.json', 'utf8'));
            res.json(userData);
        } else {
            // Return default user data structure
            res.json({
                comments: {},
                statuses: {},
                collapsedNodes: [],
                lastUpdated: null,
                version: "1.0"
            });
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/merge-user-data', (req, res) => {
    try {
        const { mainData, userData } = req.body;
        
        // Merge user data with main data
        const mergedData = {
            ...mainData,
            comments: userData.comments || {},
            statuses: userData.statuses || {},
            collapsedNodes: userData.collapsedNodes || []
        };
        
        // Save merged data
        fs.writeFileSync('LoadedData.json', JSON.stringify(mergedData, null, 2));
        
        res.json({ success: true, message: 'Data merged successfully' });
    } catch (error) {
        console.error('Error merging data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});