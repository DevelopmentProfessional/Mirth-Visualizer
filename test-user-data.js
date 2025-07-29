// Test script to demonstrate user data preservation
const fs = require('fs');

// Simulate the ProcessXmlFiles.ps1 workflow
function simulateXmlProcessing() {
    console.log('=== Simulating XML Processing ===');
    
    // 1. Load existing user data
    let userData = { comments: {}, statuses: {}, collapsedNodes: [] };
    if (fs.existsSync('UserData.json')) {
        userData = JSON.parse(fs.readFileSync('UserData.json', 'utf8'));
        console.log('Loaded existing user data:');
        console.log(`  - Comments: ${Object.keys(userData.comments).length}`);
        console.log(`  - Statuses: ${Object.keys(userData.statuses).length}`);
        console.log(`  - Collapsed nodes: ${userData.collapsedNodes.length}`);
    }
    
    // 2. Simulate new XML data (this would come from ProcessXmlFiles.ps1)
    const newData = {
        nodes: [
            { id: "Channel-Test-1", name: "Test Channel", type: "Channel" },
            { id: "Destination-Test-Dest-2", name: "Test Destination", type: "Destination" },
            { id: "Transformer-Test-Trans-3", name: "Test Transformer", type: "Transformer" }
        ],
        links: [
            { source: "Channel-Test-1", target: "Destination-Test-Dest-2" },
            { source: "Destination-Test-Dest-2", target: "Transformer-Test-Trans-3" }
        ]
    };
    
    // 3. Merge with user data (this is what ProcessXmlFiles.ps1 now does)
    const mergedData = {
        ...newData,
        comments: userData.comments,
        statuses: userData.statuses,
        collapsedNodes: userData.collapsedNodes
    };
    
    // 4. Save merged data
    fs.writeFileSync('LoadedData.json', JSON.stringify(mergedData, null, 2));
    console.log('\nSaved merged data to LoadedData.json');
    console.log(`  - Nodes: ${mergedData.nodes.length}`);
    console.log(`  - Links: ${mergedData.links.length}`);
    console.log(`  - Comments preserved: ${Object.keys(mergedData.comments).length}`);
    console.log(`  - Statuses preserved: ${Object.keys(mergedData.statuses).length}`);
    console.log(`  - Collapsed nodes preserved: ${mergedData.collapsedNodes.length}`);
}

// Test the workflow
if (require.main === module) {
    simulateXmlProcessing();
}

module.exports = { simulateXmlProcessing }; 