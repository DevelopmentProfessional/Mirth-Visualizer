// Global variables for force simulation
let linkDistance = 150;
let forceStrength = -30;
let centerStrength = 1.5;
let collisionRadius = 40;
let nodeSize = 22;
let gravityStrength = 0.8;

// Graph data and simulation
let graphData = { nodes: [], links: [] };
let simulation = null;
let svg = null;
let g = null;
let zoom = null;

// Color scale for node types
const color = d3.scaleOrdinal()
    .domain(['Channel', 'Destination', 'Transformer', 'Custom'])
    .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']);

// Default values for localStorage
const DEFAULT_VALUES = {
    linkDistance: 150,
    forceStrength: -30,
    centerStrength: 1.5,
    collisionRadius: 40,
    nodeSize: 22,
    gravityStrength: 0.8
};

// Load data from JSON file
async function loadDataFromJson() {
    try {
        const response = await fetch('/load-data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data && data.nodes && data.links) {
            graphData = data;
            console.log('Loaded data:', data);
            renderGraph();
        } else {
            console.log('No data found or error loading data');
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Handle load button click
async function handleLoadButton() {
    const fileInput = document.getElementById('channelDir');
    if (!fileInput.files.length) {
        alert('Please select a directory first.');
        return;
    }

    try {
        const files = Array.from(fileInput.files);
        const nodes = [];
        const links = [];

        for (const file of files) {
            if (file.name.endsWith('.xml') && !file.name.includes('index.xml')) {
                const text = await file.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(text, 'text/xml');

                // Extract channel name
                const channelName = xmlDoc.querySelector('name')?.textContent || 'Unknown Channel';
                const channelId = `Channel-${channelName}-${Date.now()}`;
                nodes.push({ id: channelId, name: channelName, type: 'Channel' });

                // Extract destination connectors
                const destinations = xmlDoc.querySelectorAll('destinationConnector');
                destinations.forEach((dest, index) => {
                    const destName = dest.querySelector('name')?.textContent || `Destination ${index + 1}`;
                    const destId = `Destination-${destName}-${Date.now()}-${index}`;
                    nodes.push({ id: destId, name: destName, type: 'Destination' });
                    links.push({ source: channelId, target: destId });

                    // Extract transformers for this destination
                    const transformers = dest.querySelectorAll('transformer');
                    transformers.forEach((trans, transIndex) => {
                        const transName = trans.querySelector('name')?.textContent || `Transformer ${transIndex + 1}`;
                        const transId = `Transformer-${transName}-${Date.now()}-${index}-${transIndex}`;
                        nodes.push({ id: transId, name: transName, type: 'Transformer' });
                        links.push({ source: destId, target: transId });
                    });
                });
            }
        }

        // Save to JSON file
        graphData = { nodes, links };
        await saveDataToJson();
        renderGraph();
        
    } catch (error) {
        console.error('Error processing XML files:', error);
        alert('Error processing XML files. Please check the console for details.');
    }
}

// Save data to JSON file
async function saveDataToJson() {
    try {
        const response = await fetch('/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(graphData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('Data saved successfully');
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Reset JSON data
async function resetJsonData() {
    try {
        const response = await fetch('/reset-data', {
            method: 'POST'
        });
        
        if (response.ok) {
            graphData = { nodes: [], links: [] };
            renderGraph();
            console.log('Data reset successfully');
        } else {
            console.error('Error resetting data');
        }
    } catch (error) {
        console.error('Error resetting data:', error);
    }
}

// Render the force-directed graph
function renderGraph() {
    if (!graphData || !graphData.nodes.length) {
        console.log('No data to render');
        return;
    }

    // Clear existing graph
    d3.select('#graph').selectAll('*').remove();

    // Set up SVG
    const width = document.getElementById('graph').clientWidth;
    const height = document.getElementById('graph').clientHeight;

    svg = d3.select('#graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add arrow marker
    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#999');

    // Set up zoom
    zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            document.getElementById('zoomValue').value = event.transform.k.toFixed(1);
        });

    svg.call(zoom);

    // Create main group
    g = svg.append('g');

    // Create force simulation with improved forces
    simulation = d3.forceSimulation(graphData.nodes)
        .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(linkDistance))
        .force('charge', d3.forceManyBody().strength(forceStrength))
        .force('center', d3.forceCenter(width / 2, height / 2).strength(centerStrength))
        .force('collision', d3.forceCollide().radius(collisionRadius))
        .force('gravity', d3.forceCenter(width / 2, height / 2).strength(gravityStrength))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1));

    // Create links
    const link = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(graphData.links)
        .enter().append('line')
        .attr('class', 'link')
        .attr('marker-end', 'url(#arrowhead)');

    // Create nodes
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(graphData.nodes)
        .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add circles to nodes
    node.append('circle')
        .attr('r', nodeSize / 2)
        .style('fill', d => color(d.type))
        .style('stroke', '#fff')
        .style('stroke-width', 2);

    // Add text labels with improved positioning
    node.append('text')
        .text(d => d.name)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('fill', '#333')
        .style('font-weight', '500')
        .style('text-shadow', '0 1px 2px rgba(255,255,255,0.8)')
        .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        node
            .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Add hover effects
    node.on('mouseover', function(event, d) {
        d3.select(this).select('circle').style('stroke-width', 3);
        d3.select(this).select('text').style('font-weight', 'bold');
    })
    .on('mouseout', function(event, d) {
        d3.select(this).select('circle').style('stroke-width', 2);
        d3.select(this).select('text').style('font-weight', '500');
    });

    console.log('Graph rendered with', graphData.nodes.length, 'nodes and', graphData.links.length, 'links');
}

// Drag functions
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// Control update functions
function updateLinkDistance(val) {
    linkDistance = parseInt(val);
    document.getElementById('linkDistanceInput').value = val;
    document.getElementById('linkDistanceSlider').value = val;
    if (simulation) {
        simulation.force('link').distance(linkDistance);
        simulation.alpha(0.3).restart();
    }
    saveControlValues();
}
window.updateLinkDistance = updateLinkDistance;

function updateForceStrength(val) {
    forceStrength = parseInt(val);
    document.getElementById('forceInput').value = val;
    document.getElementById('forceSlider').value = val;
    if (simulation) {
        simulation.force('charge').strength(forceStrength);
        simulation.alpha(0.3).restart();
    }
    saveControlValues();
}
window.updateForceStrength = updateForceStrength;

function updateCenterStrength(val) {
    centerStrength = parseFloat(val);
    document.getElementById('centerInput').value = val;
    document.getElementById('centerSlider').value = val;
    if (simulation) {
        simulation.force('center').strength(centerStrength);
        simulation.alpha(0.3).restart();
    }
    saveControlValues();
}
window.updateCenterStrength = updateCenterStrength;

function updateCollisionRadius(val) {
    collisionRadius = parseInt(val);
    document.getElementById('collisionInput').value = val;
    document.getElementById('collisionSlider').value = val;
    if (simulation) {
        simulation.force('collision').radius(collisionRadius);
        simulation.alpha(0.3).restart();
    }
    saveControlValues();
}
window.updateCollisionRadius = updateCollisionRadius;

function updateNodeSize(val) {
    nodeSize = parseInt(val);
    document.getElementById('nodeSizeInput').value = val;
    document.getElementById('nodeSizeSlider').value = val;
    if (simulation) {
        d3.selectAll('.node circle').attr('r', nodeSize / 2);
    }
    saveControlValues();
}
window.updateNodeSize = updateNodeSize;

function updateGravityStrength(val) {
    gravityStrength = parseFloat(val);
    document.getElementById('gravityInput').value = val;
    document.getElementById('gravitySlider').value = val;
    if (simulation) {
        simulation.force('gravity').strength(gravityStrength);
        simulation.alpha(0.3).restart();
    }
    saveControlValues();
}
window.updateGravityStrength = updateGravityStrength;

// Zoom and navigation functions
function zoomIn() {
    svg.transition().duration(300).call(zoom.scaleBy, 1.3);
}

function zoomOut() {
    svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.3);
}

function centerGraph() {
    if (simulation) {
        simulation.force('center', d3.forceCenter(svg.node().clientWidth / 2, svg.node().clientHeight / 2));
        simulation.alpha(0.3).restart();
    }
}

function fitToScreen() {
    if (graphData.nodes.length > 0) {
        const width = svg.node().clientWidth;
        const height = svg.node().clientHeight;
        
        // Calculate bounds
        const xExtent = d3.extent(graphData.nodes, d => d.x);
        const yExtent = d3.extent(graphData.nodes, d => d.y);
        
        const scale = Math.min(
            width / (xExtent[1] - xExtent[0]),
            height / (yExtent[1] - yExtent[0])
        ) * 0.8;
        
        const transform = d3.zoomIdentity
            .translate(width / 2, height / 2)
            .scale(scale);
        
        svg.transition().duration(750).call(zoom.transform, transform);
    }
}

// Add node functionality
function handleAddNode() {
    const nodeType = document.getElementById('nodeType').value;
    const nodeName = document.getElementById('nodeName').value.trim();
    
    if (!nodeName) {
        alert('Please enter a node name.');
        return;
    }
    
    const newNode = {
        id: `${nodeType}-${nodeName}-${Date.now()}`,
        name: nodeName,
        type: nodeType
    };
    
    graphData.nodes.push(newNode);
    saveDataToJson();
    renderGraph();
    
    // Clear form
    document.getElementById('nodeName').value = '';
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addNodeModal'));
    modal.hide();
}

// localStorage functions
function saveControlValues() {
    const values = {
        linkDistance,
        forceStrength,
        centerStrength,
        collisionRadius,
        nodeSize,
        gravityStrength
    };
    localStorage.setItem('disjointForceDirectedControls', JSON.stringify(values));
}

function loadControlValues() {
    const saved = localStorage.getItem('disjointForceDirectedControls');
    if (saved) {
        const values = JSON.parse(saved);
        updateLinkDistance(values.linkDistance || DEFAULT_VALUES.linkDistance);
        updateForceStrength(values.forceStrength || DEFAULT_VALUES.forceStrength);
        updateCenterStrength(values.centerStrength || DEFAULT_VALUES.centerStrength);
        updateCollisionRadius(values.collisionRadius || DEFAULT_VALUES.collisionRadius);
        updateNodeSize(values.nodeSize || DEFAULT_VALUES.nodeSize);
        updateGravityStrength(values.gravityStrength || DEFAULT_VALUES.gravityStrength);
    } else {
        // Set defaults
        updateLinkDistance(DEFAULT_VALUES.linkDistance);
        updateForceStrength(DEFAULT_VALUES.forceStrength);
        updateCenterStrength(DEFAULT_VALUES.centerStrength);
        updateCollisionRadius(DEFAULT_VALUES.collisionRadius);
        updateNodeSize(DEFAULT_VALUES.nodeSize);
        updateGravityStrength(DEFAULT_VALUES.gravityStrength);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('channelDir');
    const directoryButton = document.getElementById('directoryButton');
    
    // Load saved directory from localStorage
    const savedDirectory = localStorage.getItem('selectedDirectory');
    if (savedDirectory) {
        directoryButton.textContent = savedDirectory;
    }
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            const path = this.files[0].webkitRelativePath.split('/')[0];
            directoryButton.textContent = path;
            localStorage.setItem('selectedDirectory', path);
        } else {
            directoryButton.textContent = 'Directory';
            localStorage.removeItem('selectedDirectory');
        }
    });
    
    // Load control values
    loadControlValues();
    
    // Automatically load existing JSON data
    loadDataFromJson();
});

// Make functions globally available
window.handleLoadButton = handleLoadButton;
window.resetJsonData = resetJsonData;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.centerGraph = centerGraph;
window.fitToScreen = fitToScreen;
window.handleAddNode = handleAddNode; 