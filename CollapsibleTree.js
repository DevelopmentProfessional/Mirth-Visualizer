// Global variables
let graphData = null;
let treeData = null;
let svg = null;
let g = null;
let zoom = null;
let simulation = null;
let collapsedNodes = new Set();
let comments = {};
let statuses = {};

// View state preservation
let currentTransform = null;
let isPreservingView = false;

// Control variables
let nodeSeparation = 100;
let levelSeparation = 150;
let nodeSize = 22;
let treeOrientation = 'vertical';

// Status options with Bootstrap icons
const STATUS_OPTIONS = [
    { value: 'reception-0', text: 'Dev', icon: 'bi-gear' },
    { value: 'reception-1', text: 'Test', icon: 'bi-patch-check' },
    { value: 'reception-2', text: 'UAT', icon: 'bi-shield-check' },
    { value: 'reception-3', text: 'Ready', icon: 'bi-check-circle' },
    { value: 'reception-4', text: 'Prod', icon: 'bi-play-circle' }
];

// Default values for localStorage
const DEFAULT_VALUES = {
    nodeSeparation: 100,
    levelSeparation: 150,
    nodeSize: 22,
    treeOrientation: 'vertical'
};

// Color scale for node types
const color = d3.scaleOrdinal()
    .domain(['Channel', 'Destination', 'Transformer', 'Custom', 'Root'])
    .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']);

// --- Load Data from JSON ---
async function loadDataFromJson() {
    try {
        const response = await fetch('/load-data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data && data.nodes && data.links) {
            graphData = data;
            
            // Load collapsed nodes state
            if (data.collapsedNodes && Array.isArray(data.collapsedNodes)) {
                collapsedNodes = new Set(data.collapsedNodes);
            } else {
                collapsedNodes = new Set();
            }
            
            // Load comments
            if (data.comments && typeof data.comments === 'object') {
                comments = data.comments;
            } else {
                comments = {};
            }
            
            // Load statuses
            if (data.statuses && typeof data.statuses === 'object') {
                statuses = data.statuses;
            } else {
                statuses = {};
            }
            
            console.log('Loaded data:', data);
            convertToHierarchicalData();
        } else {
            console.error('Invalid data structure');
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// --- Handle Load Button ---
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

        // Send processed data to backend
        const response = await fetch('/save-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes, links })
        });

        if (response.ok) {
            loadDataFromJson();
        } else {
            console.error('Error saving data');
        }
    } catch (error) {
        console.error('Error processing XML files:', error);
    }
}
window.handleLoadButton = handleLoadButton;

// --- Reset JSON Data ---
async function resetJsonData() {
    try {
        const response = await fetch('/reset-data', { method: 'POST' });
        if (response.ok) {
            graphData = { nodes: [], links: [] };
            treeData = null;
            collapsedNodes.clear();
            comments = {}; // Reset comments on reset
            statuses = {}; // Reset statuses on reset
            renderCollapsibleTree(null);
        }
    } catch (error) {
        console.error('Error resetting data:', error);
    }
}
window.resetJsonData = resetJsonData;

// --- Convert to Hierarchical Data ---
function convertToHierarchicalData() {
    if (!graphData || !graphData.nodes || !graphData.links) return;
    
    // Create a map of node IDs to nodes
    const nodeMap = new Map();
    graphData.nodes.forEach(node => {
        nodeMap.set(node.id, { ...node, children: [] });
    });
    
    // Build the hierarchy
    const rootNodes = [];
    const childrenSet = new Set();
    
    graphData.links.forEach(link => {
        const sourceNode = nodeMap.get(link.source);
        const targetNode = nodeMap.get(link.target);
        
        if (sourceNode && targetNode) {
            sourceNode.children.push(targetNode);
            childrenSet.add(targetNode.id);
        }
    });
    
    // Find root nodes (nodes that are not children of any other node)
    graphData.nodes.forEach(node => {
        if (!childrenSet.has(node.id)) {
            const rootNode = nodeMap.get(node.id);
            if (rootNode) {
                rootNodes.push(rootNode);
            }
        }
    });
    
    // If no root nodes found, create a virtual root
    if (rootNodes.length === 0 && graphData.nodes.length > 0) {
        const virtualRoot = {
            id: 'virtual-root',
            name: 'Root',
            type: 'Root',
            children: Array.from(nodeMap.values())
        };
        treeData = d3.hierarchy(virtualRoot);
    } else if (rootNodes.length === 1) {
        treeData = d3.hierarchy(rootNodes[0]);
    } else {
        // Multiple root nodes - create a virtual root
        const virtualRoot = {
            id: 'virtual-root',
            name: 'Root',
            type: 'Root',
            children: rootNodes
        };
        treeData = d3.hierarchy(virtualRoot);
    }
    
    console.log('Tree data:', treeData);
    renderCollapsibleTree(treeData);
}

// --- Render Collapsible Tree ---
function renderCollapsibleTree(data) {
    if (!data) {
        d3.select('#graph').selectAll('*').remove();
        return;
    }

    // Store current transform if preserving view
    if (isPreservingView && svg && g) {
        const transform = d3.zoomTransform(svg.node());
        currentTransform = transform;
    }

    const width = document.getElementById('graph').clientWidth;
    const height = document.getElementById('graph').clientHeight;

    // Clear existing content
    d3.select('#graph').selectAll('*').remove();

    // Create SVG
    svg = d3.select('#graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Create zoom group
    g = svg.append('g');

    // Add zoom behavior
    zoom = d3.zoom()
        .scaleExtent([0.1, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
            document.getElementById('zoomValue').value = event.transform.k.toFixed(1);
        });

    svg.call(zoom);

    // Restore previous transform if preserving view
    if (isPreservingView && currentTransform) {
        svg.call(zoom.transform, currentTransform);
    }

    // Create tree layout
    let tree;
    if (treeOrientation === 'radial') {
        tree = d3.tree()
            .size([2 * Math.PI, Math.min(width, height) / 2 - 100])
            .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);
    } else if (treeOrientation === 'horizontal') {
        tree = d3.tree()
            .size([height - 100, width - 100])
            .nodeSize([levelSeparation, nodeSeparation]);
    } else {
        tree = d3.tree()
            .size([width - 100, height - 100])
            .nodeSize([nodeSeparation, levelSeparation]);
    }

    // Create hierarchy
    const root = d3.hierarchy(data);
    
    // Apply collapse/expand logic
    root.descendants().forEach(d => {
        if (collapsedNodes.has(d.data.id)) {
            d.children = null;
        }
    });

    // Apply tree layout
    tree(root);

    // Create links
    const link = g.selectAll('.link')
        .data(root.links())
        .enter().append('path')
        .attr('class', 'link')
        .attr('d', d => {
            if (treeOrientation === 'radial') {
                return d3.linkRadial()
                    .angle(d => d.x)
                    .radius(d => d.y)(d);
            } else if (treeOrientation === 'horizontal') {
                return d3.linkHorizontal()
                    .x(d => d.y)
                    .y(d => d.x)(d);
            } else {
                return d3.linkHorizontal()
                    .x(d => d.x)
                    .y(d => d.y)(d);
            }
        });

    // Create nodes
    const node = g.selectAll('.node')
        .data(root.descendants())
        .enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => {
            if (treeOrientation === 'radial') {
                return `translate(${d.y * Math.cos(d.x - Math.PI / 2)},${d.y * Math.sin(d.x - Math.PI / 2)})`;
            } else if (treeOrientation === 'horizontal') {
                return `translate(${d.y},${d.x})`;
            } else {
                return `translate(${d.x},${d.y})`;
            }
        });

    console.log('Created nodes:', node.size());

    // Add circles for nodes
    node.append('circle')
        .attr('r', nodeSize / 2)
        .style('fill', d => color(d.data.type));

    // Debug: Log node types
    console.log('Node types:', root.descendants().map(d => ({ id: d.data.id, name: d.data.name, type: d.data.type })));
    console.log('Destination nodes:', root.descendants().filter(d => d.data.type === 'Destination').map(d => d.data.name));
    console.log('Nodes with comments:', Object.keys(comments));
    console.log('Nodes with statuses:', Object.keys(statuses));
    console.log('Sample node data:', root.descendants().slice(0, 3).map(d => d.data));

    // Add text labels with background for better visibility
    const textGroup = node.append('g');
    
    // Add child count badge in center of node
    node.append('text')
        .attr('class', 'child-count-badge')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', '#fff')
        .style('pointer-events', 'none')
        .style('text-shadow', '0 1px 2px rgba(0,0,0,0.5)')
        .text(d => {
            // Count visible children (not collapsed)
            if (d.data.children && d.data.children.length > 0) {
                return d.data.children.length.toString();
            }
            return '';
        });
    
    textGroup.append('rect')
        .attr('class', 'text-background')
        .attr('x', d => {
            if (treeOrientation === 'horizontal') {
                return 10; // Slightly before text
            }
            return -20; // Center around text for vertical
        })
        .attr('y', d => {
            if (treeOrientation === 'radial') {
                return d.x < Math.PI ? -8 : -12;
            } else if (treeOrientation === 'horizontal') {
                return -8;
            } else {
                return 0.3; // Below node
            }
        })
        .attr('width', d => {
            // Estimate width based on text length
            const textLength = d.data.name.length;
            return Math.max(textLength * 6, 40); // Minimum width of 40px
        })
        .attr('height', 16)
        .attr('rx', 3) // Rounded corners
        .style('fill', 'rgba(255,255,255,0.9)')
        .style('stroke', '#ccc')
        .style('stroke-width', '1px');

    textGroup.append('text')
        .text(d => {
            console.log('Adding text label for node:', d.data.name, 'type:', d.data.type);
            return d.data.name;
        })
        .attr('text-anchor', d => {
            if (treeOrientation === 'radial') {
                return d.x < Math.PI ? 'start' : 'end';
            } else if (treeOrientation === 'horizontal') {
                return 'start';
            } else {
                return 'middle';
            }
        })
        .attr('dy', d => {
            if (treeOrientation === 'radial') {
                return d.x < Math.PI ? '0.35em' : '-0.35em';
            } else if (treeOrientation === 'horizontal') {
                return '0.35em';
            } else {
                return '1.5em'; // Increased distance below node for better visibility
            }
        })
        .attr('x', d => {
            if (treeOrientation === 'horizontal') {
                return 15; // Increased offset from node for horizontal
            }
            return 0;
        })
        .style('font-size', '11px') // Slightly smaller for better fit
        .style('fill', '#333') // Dark gray for better readability
        .style('font-weight', '600')
        .style('pointer-events', 'none') // Prevent text from interfering with node clicks
        .style('opacity', '1') // Ensure text is visible
        .style('visibility', 'visible'); // Ensure text is visible

        // Add comment icon if node has a comment
        if (comments[d.data.id]) {
            console.log('Adding comment icon for node:', d.data.name);
            const commentIcon = node.append('text')
                .attr('class', 'comment-icon')
                .attr('text-anchor', 'end')
                .attr('dy', '0.35em')
                .attr('x', -15) // Position relative to node center
                .style('font-size', '14px')
                .style('fill', '#ffc107')
                .style('cursor', 'pointer')
                .style('font-weight', 'bold')
                .style('opacity', '1')
                .style('visibility', 'visible')
                .text('💬')
                .on('click', function(event) {
                    event.stopPropagation();
                    openCommentModal(d.data.id, d.data.name);
                });
        }

        // Add status indicator if node has a status (only for destination nodes)
        if (d.data.type === 'Destination' && statuses[d.data.id]) {
            console.log('Adding status icon for destination node:', d.data.name);
            const statusInfo = getStatusDisplay(statuses[d.data.id]);
            const statusIcon = node.append('text')
                .attr('class', 'status-icon')
                .attr('text-anchor', 'end')
                .attr('dy', '0.35em')
                .attr('x', -30) // Position relative to node center, further left than comment
                .style('font-size', '16px')
                .style('fill', '#007bff')
                .style('cursor', 'pointer')
                .style('font-weight', 'bold')
                .style('opacity', '1')
                .style('visibility', 'visible')
                .text('⚡') // Status indicator
                .on('click', function(event) {
                    event.stopPropagation();
                    showStatusDropdown(d.data.id, d.data.name, event);
                });
        } else if (d.data.type === 'Destination') {
            console.log('Adding status trigger for destination node:', d.data.name);
            // Add status dropdown trigger for destination nodes without status
            const statusTrigger = node.append('text')
                .attr('class', 'status-trigger')
                .attr('text-anchor', 'end')
                .attr('dy', '0.35em')
                .attr('x', -30) // Position relative to node center, further left than comment
                .style('font-size', '14px')
                .style('fill', '#6c757d')
                .style('cursor', 'pointer')
                .style('font-weight', 'bold')
                .style('opacity', '1')
                .style('visibility', 'visible')
                .text('⚡')
                .on('click', function(event) {
                    event.stopPropagation();
                    showStatusDropdown(d.data.id, d.data.name, event);
                });
        }

        // Add click handler for expand/collapse
        node.on('click', function(event, d) {
            if (d.children && d.children.length > 0) {
                // Set flag to preserve view state
                isPreservingView = true;
                
                if (collapsedNodes.has(d.data.id)) {
                    collapsedNodes.delete(d.data.id);
                } else {
                    collapsedNodes.add(d.data.id);
                }
                saveCollapsedState();
                renderCollapsibleTree(treeData);
                
                // Reset flag after rendering
                setTimeout(() => {
                    isPreservingView = false;
                }, 100);
            }
        });

        // Add right-click handler for comment
        node.on('contextmenu', function(event, d) {
            event.preventDefault();
            openCommentModal(d.data.id, d.data.name);
        });

    // Add cursor style
    node.style('cursor', 'pointer');
}

// --- Expand All ---
function expandAll() {
    // Set flag to preserve view state
    isPreservingView = true;
    
    collapsedNodes.clear();
    saveCollapsedState();
    renderCollapsibleTree(treeData);
    
    // Reset flag after rendering
    setTimeout(() => {
        isPreservingView = false;
    }, 100);
}
window.expandAll = expandAll;

// --- Collapse All ---
function collapseAll() {
    // Set flag to preserve view state
    isPreservingView = true;
    
    // Get all nodes with children
    const nodesWithChildren = [];
    function traverse(node) {
        if (node.children && node.children.length > 0) {
            nodesWithChildren.push(node.data.id);
            node.children.forEach(traverse);
        }
    }
    
    if (treeData) {
        traverse(treeData);
        collapsedNodes = new Set(nodesWithChildren);
        saveCollapsedState();
        renderCollapsibleTree(treeData);
    }
    
    // Reset flag after rendering
    setTimeout(() => {
        isPreservingView = false;
    }, 100);
}
window.collapseAll = collapseAll;

// --- Control Update Functions ---
function updateNodeSeparation(val) {
    nodeSeparation = parseInt(val);
    document.getElementById('nodeSeparationInput').value = val;
    document.getElementById('nodeSeparationSlider').value = val;
    if (treeData) {
        renderCollapsibleTree(treeData);
    }
    saveControlValues();
}
window.updateNodeSeparation = updateNodeSeparation;

function updateLevelSeparation(val) {
    levelSeparation = parseInt(val);
    document.getElementById('levelSeparationInput').value = val;
    document.getElementById('levelSeparationSlider').value = val;
    if (treeData) {
        renderCollapsibleTree(treeData);
    }
    saveControlValues();
}
window.updateLevelSeparation = updateLevelSeparation;

function updateNodeSize(val) {
    nodeSize = parseInt(val);
    document.getElementById('nodeSizeInput').value = val;
    document.getElementById('nodeSizeSlider').value = val;
    if (treeData) {
        renderCollapsibleTree(treeData);
    }
    saveControlValues();
}
window.updateNodeSize = updateNodeSize;

function updateTreeOrientation(val) {
    treeOrientation = val;
    if (treeData) {
        renderCollapsibleTree(treeData);
    }
    saveControlValues();
}
window.updateTreeOrientation = updateTreeOrientation;

// --- Zoom Functions ---
function zoomIn() {
    svg.transition().call(zoom.scaleBy, 1.3);
}
window.zoomIn = zoomIn;

function zoomOut() {
    svg.transition().call(zoom.scaleBy, 1 / 1.3);
}
window.zoomOut = zoomOut;

function centerGraph() {
    if (svg && g) {
        const width = document.getElementById('graph').clientWidth;
        const height = document.getElementById('graph').clientHeight;
        svg.transition().call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));
    }
}
window.centerGraph = centerGraph;

function fitToScreen() {
    if (svg && g) {
        const width = document.getElementById('graph').clientWidth;
        const height = document.getElementById('graph').clientHeight;
        const bounds = g.node().getBBox();
        const scale = Math.min(width / bounds.width, height / bounds.height) * 0.8;
        const x = width / 2 - (bounds.x + bounds.width / 2) * scale;
        const y = height / 2 - (bounds.y + bounds.height / 2) * scale;
        svg.transition().call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
    }
}
window.fitToScreen = fitToScreen;

// --- Add Node Handler ---
function handleAddNode() {
    const type = document.getElementById('nodeType').value;
    const name = document.getElementById('nodeName').value.trim();
    const parentId = document.getElementById('parentNode').value;
    
    if (!name) {
        alert('Please enter a node name.');
        return;
    }
    
    const id = `${type}-${name}-${Date.now()}`;
    const newNode = { id, name, type };
    
    // Add to graph data
    graphData.nodes.push(newNode);
    
    // Add link if parent is selected
    if (parentId) {
        graphData.links.push({ source: parentId, target: id });
    }
    
    // Rebuild tree data and render
    convertToHierarchicalData();
    renderCollapsibleTree(treeData);
    updateParentNodeOptions();
    
    // Clear the form and close modal
    document.getElementById('nodeName').value = '';
    
    // Close the modal using Bootstrap
    const modal = bootstrap.Modal.getInstance(document.getElementById('addNodeModal'));
    if (modal) {
        modal.hide();
    }
}
window.handleAddNode = handleAddNode;

// --- Update Parent Node Options ---
function updateParentNodeOptions() {
    const parentSelect = document.getElementById('parentNode');
    const currentValue = parentSelect.value;
    
    // Clear existing options except "None (Root)"
    parentSelect.innerHTML = '<option value="">None (Root)</option>';
    
    // Add all existing nodes as options
    graphData.nodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.id;
        option.textContent = `${node.type}: ${node.name}`;
        parentSelect.appendChild(option);
    });
    
    // Restore previous selection if it still exists
    if (currentValue) {
        parentSelect.value = currentValue;
    }
}

// Save collapsed state to JSON
async function saveCollapsedState() {
    if (!graphData) return;
    
    try {
        // Update the collapsedNodes array in graphData
        graphData.collapsedNodes = Array.from(collapsedNodes);
        graphData.comments = comments;
        graphData.statuses = statuses;
        
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
        
        console.log('State saved successfully');
        
        // Also save to user data file
        await saveUserData();
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

// Open comment modal
function openCommentModal(nodeId, nodeName) {
    document.getElementById('commentNodeNameDisplay').textContent = nodeName;
    document.getElementById('commentText').value = comments[nodeId] || '';
    
    // Store the current node ID for saving
    document.getElementById('commentModal').setAttribute('data-node-id', nodeId);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('commentModal'));
    modal.show();
}
window.openCommentModal = openCommentModal;

// Save comment
function saveComment() {
    const nodeId = document.getElementById('commentModal').getAttribute('data-node-id');
    const commentText = document.getElementById('commentText').value.trim();
    
    if (commentText) {
        comments[nodeId] = commentText;
    } else {
        delete comments[nodeId];
    }
    
    // Save to JSON and re-render
    saveCollapsedState();
    renderCollapsibleTree(treeData);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('commentModal'));
    modal.hide();
}
window.saveComment = saveComment;

// Save user data to separate file
async function saveUserData() {
    try {
        const userData = {
            comments: comments,
            statuses: statuses,
            collapsedNodes: Array.from(collapsedNodes),
            lastUpdated: new Date().toISOString(),
            version: "1.0"
        };
        
        const response = await fetch('/save-user-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        console.log('User data saved successfully');
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// Save comments to JSON
async function saveComments() {
    if (!graphData) return;
    
    try {
        // Update the comments object in graphData
        graphData.comments = comments;
        
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
        
        console.log('Comments saved successfully');
        
        // Also save to user data file
        await saveUserData();
    } catch (error) {
        console.error('Error saving comments:', error);
    }
}

// Save status to JSON
async function saveStatus() {
    if (!graphData) return;
    
    try {
        // Update the statuses object in graphData
        graphData.statuses = statuses;
        
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
        
        console.log('Status saved successfully');
        
        // Also save to user data file
        await saveUserData();
    } catch (error) {
        console.error('Error saving status:', error);
    }
}

// Update node status
function updateNodeStatus(nodeId, statusValue) {
    if (statusValue) {
        statuses[nodeId] = statusValue;
    } else {
        delete statuses[nodeId];
    }
    
    saveStatus();
    renderCollapsibleTree(treeData); // Re-render to show status indicator
}

// Get status display info
function getStatusDisplay(statusValue) {
    const status = STATUS_OPTIONS.find(s => s.value === statusValue);
    return status || { value: '', text: 'No Status', icon: 'bi-question-circle' };
}

// Show status dropdown
function showStatusDropdown(nodeId, nodeName, event) {
    event.stopPropagation();
    
    const dropdown = document.getElementById('statusDropdown');
    const dropdownMenu = document.getElementById('statusDropdownMenu');
    const nodeNameDisplay = document.getElementById('statusNodeName');
    
    // Update node name display
    nodeNameDisplay.textContent = nodeName;
    
    // Clear existing menu items
    dropdownMenu.innerHTML = '';
    
    // Add status options
    STATUS_OPTIONS.forEach(option => {
        const item = document.createElement('a');
        item.className = 'dropdown-item d-flex align-items-center';
        item.href = '#';
        item.innerHTML = `
            <i class="bi ${option.icon} me-2"></i>
            ${option.text}
        `;
        item.onclick = (e) => {
            e.preventDefault();
            updateNodeStatus(nodeId, option.value);
            bootstrap.Dropdown.getInstance(dropdown).hide();
        };
        dropdownMenu.appendChild(item);
    });
    
    // Add "Remove Status" option if node has a status
    if (statuses[nodeId]) {
        const removeItem = document.createElement('a');
        removeItem.className = 'dropdown-item d-flex align-items-center text-danger';
        removeItem.href = '#';
        removeItem.innerHTML = `
            <i class="bi bi-trash me-2"></i>
            Remove Status
        `;
        removeItem.onclick = (e) => {
            e.preventDefault();
            updateNodeStatus(nodeId, '');
            bootstrap.Dropdown.getInstance(dropdown).hide();
        };
        dropdownMenu.appendChild(removeItem);
    }
    
    // Show dropdown
    const bsDropdown = new bootstrap.Dropdown(dropdown);
    bsDropdown.show();
}

// --- localStorage Functions ---
function saveControlValues() {
    const values = {
        nodeSeparation,
        levelSeparation,
        nodeSize,
        treeOrientation
    };
    localStorage.setItem('collapsibleTreeControls', JSON.stringify(values));
}

function loadControlValues() {
    const saved = localStorage.getItem('collapsibleTreeControls');
    if (saved) {
        const values = JSON.parse(saved);
        updateNodeSeparation(values.nodeSeparation || DEFAULT_VALUES.nodeSeparation);
        updateLevelSeparation(values.levelSeparation || DEFAULT_VALUES.levelSeparation);
        updateNodeSize(values.nodeSize || DEFAULT_VALUES.nodeSize);
        updateTreeOrientation(values.treeOrientation || DEFAULT_VALUES.treeOrientation);
    } else {
        // Set defaults
        updateNodeSeparation(DEFAULT_VALUES.nodeSeparation);
        updateLevelSeparation(DEFAULT_VALUES.levelSeparation);
        updateNodeSize(DEFAULT_VALUES.nodeSize);
        updateTreeOrientation(DEFAULT_VALUES.treeOrientation);
    }
}

function updateControlDisplays() {
    document.getElementById('nodeSeparationInput').value = nodeSeparation;
    document.getElementById('nodeSeparationSlider').value = nodeSeparation;
    document.getElementById('levelSeparationInput').value = levelSeparation;
    document.getElementById('levelSeparationSlider').value = levelSeparation;
    document.getElementById('nodeSizeInput').value = nodeSize;
    document.getElementById('nodeSizeSlider').value = nodeSize;
    document.getElementById('treeOrientation').value = treeOrientation;
}

// --- Initialize ---
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
            // Get the directory path from the first file
            const path = this.files[0].webkitRelativePath.split('/')[0];
            directoryButton.textContent = path;
            // Save to localStorage
            localStorage.setItem('selectedDirectory', path);
        } else {
            directoryButton.textContent = 'Directory';
            localStorage.removeItem('selectedDirectory');
        }
    });
    
    // Automatically load existing JSON data on page load
    loadDataFromJson();

    // Load control values on page load
    loadControlValues();
});

// --- Test Function for Debugging ---
function addTestData() {
    // Add some test comments
    comments['test-channel-1'] = 'Test comment for channel 1';
    comments['test-destination-1'] = 'Test comment for destination 1';
    
    // Add some test statuses for destination nodes
    statuses['test-destination-1'] = 'reception-0';
    statuses['test-destination-2'] = 'reception-1';
    
    console.log('Added test data:', { comments, statuses });
}

// Call test function on load for debugging
// addTestData();