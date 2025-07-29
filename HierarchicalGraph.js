// Global variables for hierarchical graph controls
let currentZoom = 1;
let svgSelection;
let treeData = null;
let nodeSeparation = 100;
let levelSeparation = 150;
let nodeSize = 22;
let treeOrientation = 'vertical';
let graphData = { nodes: [], links: [] };

// Default values for localStorage
const DEFAULT_VALUES = {
    nodeSeparation: 100,
    levelSeparation: 150,
    nodeSize: 22,
    treeOrientation: 'vertical'
};

// Function to save control values to localStorage
function saveControlValues() {
    const values = {
        nodeSeparation: nodeSeparation,
        levelSeparation: levelSeparation,
        nodeSize: nodeSize,
        treeOrientation: treeOrientation,
        zoomValue: currentZoom
    };
    localStorage.setItem('hierarchicalGraphControls', JSON.stringify(values));
}

// Function to load control values from localStorage
function loadControlValues() {
    try {
        const saved = localStorage.getItem('hierarchicalGraphControls');
        if (saved) {
            const values = JSON.parse(saved);
            nodeSeparation = values.nodeSeparation || DEFAULT_VALUES.nodeSeparation;
            levelSeparation = values.levelSeparation || DEFAULT_VALUES.levelSeparation;
            nodeSize = values.nodeSize || DEFAULT_VALUES.nodeSize;
            treeOrientation = values.treeOrientation || DEFAULT_VALUES.treeOrientation;
            currentZoom = values.zoomValue || DEFAULT_VALUES.zoomValue;
        } else {
            // Use defaults if no saved values
            nodeSeparation = DEFAULT_VALUES.nodeSeparation;
            levelSeparation = DEFAULT_VALUES.levelSeparation;
            nodeSize = DEFAULT_VALUES.nodeSize;
            treeOrientation = DEFAULT_VALUES.treeOrientation;
            currentZoom = DEFAULT_VALUES.zoomValue;
        }
        
        // Update UI elements
        updateControlDisplays();
    } catch (error) {
        console.error('Error loading control values:', error);
        // Use defaults on error
        nodeSeparation = DEFAULT_VALUES.nodeSeparation;
        levelSeparation = DEFAULT_VALUES.levelSeparation;
        nodeSize = DEFAULT_VALUES.nodeSize;
        treeOrientation = DEFAULT_VALUES.treeOrientation;
        currentZoom = DEFAULT_VALUES.zoomValue;
        updateControlDisplays();
    }
}

// Function to update control displays
function updateControlDisplays() {
    // Update sliders and inputs
    const elements = [
        { slider: 'nodeSeparationSlider', input: 'nodeSeparationInput', value: nodeSeparation },
        { slider: 'levelSeparationSlider', input: 'levelSeparationInput', value: levelSeparation },
        { slider: 'nodeSizeSlider', input: 'nodeSizeInput', value: nodeSize }
    ];
    
    elements.forEach(({ slider, input, value }) => {
        const sliderEl = document.getElementById(slider);
        const inputEl = document.getElementById(input);
        if (sliderEl) sliderEl.value = value;
        if (inputEl) inputEl.value = value;
    });
    
    // Update orientation dropdown
    const orientationSelect = document.getElementById('treeOrientation');
    if (orientationSelect) {
        orientationSelect.value = treeOrientation;
    }
    
    // Update zoom display
    const zoomDisplay = document.getElementById('zoomValue');
    if (zoomDisplay) {
        zoomDisplay.value = currentZoom.toFixed(1);
    }
}

function setZoom(zoomLevel) {
    currentZoom = zoomLevel;
    if (svgSelection) {
        svgSelection.call(
            d3.zoom().transform,
            d3.zoomIdentity.scale(zoomLevel)
        );
    }
    // Update zoom display
    const zoomDisplay = document.getElementById('zoomValue');
    if (zoomDisplay) {
        zoomDisplay.value = currentZoom.toFixed(1);
    }
    saveControlValues();
}
window.setZoom = setZoom;

function zoomIn() {
    setZoom(currentZoom * 1.2);
}
window.zoomIn = zoomIn;

function zoomOut() {
    setZoom(currentZoom / 1.2);
}
window.zoomOut = zoomOut;

function centerGraph() {
    if (svgSelection) {
        svgSelection.transition().duration(750)
            .call(
                d3.zoom().transform,
                d3.zoomIdentity
            );
    }
    currentZoom = 1;
    // Update zoom display
    const zoomDisplay = document.getElementById('zoomValue');
    if (zoomDisplay) {
        zoomDisplay.value = currentZoom.toFixed(1);
    }
}
window.centerGraph = centerGraph;

function fitToScreen() {
    if (svgSelection && treeData) {
        const graphElement = document.getElementById('graph');
        const width = graphElement.clientWidth;
        const height = graphElement.clientHeight;
        
        // Calculate bounds of all nodes
        const nodes = d3.selectAll('.node').nodes();
        if (nodes.length > 0) {
            const xExtent = d3.extent(nodes, d => d3.select(d).attr('transform').match(/translate\(([^,]+),/)[1]);
            const yExtent = d3.extent(nodes, d => d3.select(d).attr('transform').match(/translate\([^,]+,([^)]+)\)/)[1]);
            
            const scale = Math.min(
                width / (xExtent[1] - xExtent[0]),
                height / (yExtent[1] - yExtent[0])
            ) * 0.8;
            
            const centerX = (xExtent[0] + xExtent[1]) / 2;
            const centerY = (yExtent[0] + yExtent[1]) / 2;
            
            svgSelection.transition().duration(750)
                .call(
                    d3.zoom().transform,
                    d3.zoomIdentity
                        .translate(width / 2, height / 2)
                        .scale(scale)
                        .translate(-centerX, -centerY)
                );
            currentZoom = scale;
        } else {
            svgSelection.transition().duration(750)
                .call(
                    d3.zoom().transform,
                    d3.zoomIdentity
                );
            currentZoom = 1;
        }
        // Update zoom display
        const zoomDisplay = document.getElementById('zoomValue');
        if (zoomDisplay) {
            zoomDisplay.value = currentZoom.toFixed(1);
        }
    }
}
window.fitToScreen = fitToScreen;

function updateNodeSeparation(val) {
    nodeSeparation = +val;
    document.getElementById('nodeSeparationSlider').value = val;
    document.getElementById('nodeSeparationInput').value = val;
    if (treeData) {
        renderHierarchicalGraph(treeData);
    }
    saveControlValues();
}
window.updateNodeSeparation = updateNodeSeparation;

function updateLevelSeparation(val) {
    levelSeparation = +val;
    document.getElementById('levelSeparationSlider').value = val;
    document.getElementById('levelSeparationInput').value = val;
    if (treeData) {
        renderHierarchicalGraph(treeData);
    }
    saveControlValues();
}
window.updateLevelSeparation = updateLevelSeparation;

function updateNodeSize(val) {
    nodeSize = +val;
    document.getElementById('nodeSizeSlider').value = val;
    document.getElementById('nodeSizeInput').value = val;
    if (treeData) {
        renderHierarchicalGraph(treeData);
    }
    saveControlValues();
}
window.updateNodeSize = updateNodeSize;

function updateTreeOrientation(val) {
    treeOrientation = val;
    if (treeData) {
        renderHierarchicalGraph(treeData);
    }
    saveControlValues();
}
window.updateTreeOrientation = updateTreeOrientation;

// --- Load Button Handler ---
async function handleLoadButton() {
    const input = document.getElementById('channelDir');
    const files = Array.from(input.files);

    if (!files.length) {
        alert('Please select a directory.');
        return;
    }

    // Filter for .xml files (excluding index.xml)
    const xmlFiles = files.filter(f => f.name.endsWith('.xml') && f.name !== 'index.xml');

    if (!xmlFiles.length) {
        alert('No valid channel XML files found in the selected directory.');
        return;
    }

    try {
        // Read and process XML files in the browser
        const xmlContents = await Promise.all(xmlFiles.map(file => file.text()));

        // Parse XML and build graph data
        let nodes = [];
        let links = [];
        let nodeId = 0;

        function createNode(name, type) {
            const id = `${type}-${name}-${nodeId++}`;
            nodes.push({ id, name, type });
            return id;
        }

        for (let i = 0; i < xmlContents.length; i++) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContents[i], "text/xml");

            // Channel name
            const channelName = xmlDoc.querySelector("channel > name")?.textContent || `Channel ${i+1}`;
            const channelId = createNode(channelName, "Channel");
            console.log(`Processing channel: ${channelName}`);

            // Destinations
            const dests = xmlDoc.querySelectorAll("destinationConnectors > connector");
            console.log(`Found ${dests.length} destinations for channel ${channelName}`);
            dests.forEach((dest, di) => {
                const destName = dest.querySelector("name")?.textContent || `Destination ${di+1}`;
                const destId = createNode(destName, "Destination");
                links.push({ source: channelId, target: destId });
                console.log(`  Destination: ${destName}`);

                // Transformers - try multiple selectors to find transformers
                let transformers = dest.querySelectorAll("transformer > elements > com.mirth.connect.plugins.javascriptstep.JavaScriptStep");
                
                // If no transformers found with the first selector, try alternative selectors
                if (transformers.length === 0) {
                    transformers = dest.querySelectorAll("transformer elements com.mirth.connect.plugins.javascriptstep.JavaScriptStep");
                }
                if (transformers.length === 0) {
                    transformers = dest.querySelectorAll("transformer > elements > *");
                }
                if (transformers.length === 0) {
                    transformers = dest.querySelectorAll("transformer elements *");
                }
                
                console.log(`    Found ${transformers.length} transformers for destination ${destName}`);
                
                // Debug: Log the transformer XML structure
                const transformerElement = dest.querySelector("transformer");
                if (transformerElement) {
                    console.log(`    Transformer XML structure:`, transformerElement.innerHTML.substring(0, 500));
                }
                
                transformers.forEach((tr, ti) => {
                    const trName = tr.querySelector("name")?.textContent || tr.textContent || `Transformer ${ti+1}`;
                    const trId = createNode(trName, "Transformer");
                    links.push({ source: destId, target: trId });
                    console.log(`      Transformer: ${trName}`);
                });
            });
        }

        console.log(`Total nodes created: ${nodes.length}`);
        console.log(`Total links created: ${links.length}`);

        // Save the processed data to JSON file via backend
        const response = await fetch('/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nodes, links })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Data saved to JSON:', result);

        // Load the data from JSON file
        await loadDataFromJson();

    } catch (error) {
        console.error('Error processing XML files:', error);
        alert('Error processing XML files: ' + error.message);
    }
}

// Function to load data from JSON file
async function loadDataFromJson() {
    try {
        const response = await fetch('/load-data');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Loaded data from JSON:', data);
        
        if (data.nodes && data.links) {
            graphData = data;
            treeData = convertToHierarchicalData(data);
            renderHierarchicalGraph(treeData);
            updateParentNodeOptions();
            // Position overlay elements after graph is rendered
            setTimeout(positionOverlayElements, 100);
        } else {
            console.log('No data found in JSON file');
        }
    } catch (error) {
        console.error('Error loading JSON data:', error);
    }
}

// Function to reset JSON data
async function resetJsonData() {
    try {
        const response = await fetch('/reset-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Reset result:', result);
        
        // Clear the graph
        graphData = { nodes: [], links: [] };
        treeData = null;
        renderHierarchicalGraph(null);
        
    } catch (error) {
        console.error('Error resetting data:', error);
    }
}

// Convert flat graph data to hierarchical tree structure
function convertToHierarchicalData(data) {
    if (!data.nodes || !data.links || data.nodes.length === 0) {
        return null;
    }

    // Create a map of nodes by ID
    const nodeMap = new Map();
    data.nodes.forEach(node => {
        nodeMap.set(node.id, { ...node, children: [] });
    });

    // Build parent-child relationships
    data.links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        
        const sourceNode = nodeMap.get(sourceId);
        const targetNode = nodeMap.get(targetId);
        
        if (sourceNode && targetNode) {
            sourceNode.children.push(targetNode);
        }
    });

    // Find root nodes (nodes with no incoming links)
    const hasIncomingLinks = new Set();
    data.links.forEach(link => {
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        hasIncomingLinks.add(targetId);
    });

    const rootNodes = data.nodes.filter(node => !hasIncomingLinks.has(node.id));
    
    // If no clear root, use the first Channel node or first node
    if (rootNodes.length === 0) {
        const channelNode = data.nodes.find(node => node.type === 'Channel');
        if (channelNode) {
            return nodeMap.get(channelNode.id);
        } else {
            return nodeMap.get(data.nodes[0].id);
        }
    }

    // If multiple roots, create a virtual root
    if (rootNodes.length > 1) {
        const virtualRoot = {
            id: 'virtual-root',
            name: 'Root',
            type: 'Root',
            children: rootNodes.map(node => nodeMap.get(node.id))
        };
        return virtualRoot;
    }

    return nodeMap.get(rootNodes[0].id);
}

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
    treeData = convertToHierarchicalData(graphData);
    renderHierarchicalGraph(treeData);
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

// Update parent node options in the dropdown
function updateParentNodeOptions() {
    const parentSelect = document.getElementById('parentNode');
    if (!parentSelect) return;
    
    // Clear existing options except the first one
    parentSelect.innerHTML = '<option value="">None (Root)</option>';
    
    // Add all nodes as potential parents
    graphData.nodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.id;
        option.textContent = `${node.type}: ${node.name}`;
        parentSelect.appendChild(option);
    });
}

// --- D3 Hierarchical Graph Rendering ---
function renderHierarchicalGraph(data) {
    const width = document.getElementById('graph').clientWidth;
    const height = document.getElementById('graph').clientHeight;
    d3.select('#graph').selectAll('*').remove();

    if (!data) {
        // Show empty state
        svgSelection = d3.select('#graph')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        svgSelection.append('text')
            .attr('x', width / 2)
            .attr('y', height / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '16px')
            .style('fill', '#666')
            .text('No data to display. Load some data first.');
        return;
    }

    svgSelection = d3.select('#graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add a group for zooming and panning
    const zoomGroup = svgSelection.append('g').attr('class', 'zoom-group');

    // Enable pan/zoom with mouse
    svgSelection.call(
        d3.zoom()
            .scaleExtent([0.1, 10])
            .on('zoom', (event) => {
                zoomGroup.attr('transform', event.transform);
                currentZoom = event.transform.k;
                // Update zoom display
                const zoomDisplay = document.getElementById('zoomValue');
                if (zoomDisplay) {
                    zoomDisplay.value = currentZoom.toFixed(1);
                }
            })
    );

    // Unique color for each node type
    const color = d3.scaleOrdinal()
        .domain(['Channel', 'Destination', 'Transformer', 'Custom', 'Root'])
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']);

    // Create tree layout based on orientation
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
        // vertical (default)
        tree = d3.tree()
            .size([width - 100, height - 100])
            .nodeSize([nodeSeparation, levelSeparation]);
    }

    // Create hierarchy from data
    const root = d3.hierarchy(data);
    
    // Assign positions
    tree(root);

    // Draw links
    const link = zoomGroup.append('g')
        .attr('fill', 'none')
        .attr('stroke', '#999')
        .attr('stroke-width', 2)
        .selectAll('path')
        .data(root.links())
        .join('path')
        .attr('d', d => {
            if (treeOrientation === 'radial') {
                return d3.linkRadial()
                    .angle(d => d.x)
                    .radius(d => d.y)(d);
            } else {
                return d3.linkHorizontal()
                    .x(d => treeOrientation === 'horizontal' ? d.y : d.x)
                    .y(d => treeOrientation === 'horizontal' ? d.x : d.y)(d);
            }
        });

    // Draw nodes
    const node = zoomGroup.append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .selectAll('circle')
        .data(root.descendants())
        .join('circle')
        .attr('r', nodeSize / 2)
        .attr('fill', d => color(d.data.type))
        .attr('transform', d => {
            if (treeOrientation === 'radial') {
                return `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y},0)`;
            } else {
                return `translate(${treeOrientation === 'horizontal' ? d.y : d.x},${treeOrientation === 'horizontal' ? d.x : d.y})`;
            }
        });

    // Add text labels
    const textGroup = zoomGroup.append('g')
        .selectAll('g')
        .data(root.descendants())
        .join('g')
        .attr('class', 'node')
        .attr('transform', d => {
            if (treeOrientation === 'radial') {
                return `rotate(${(d.x * 180 / Math.PI - 90)}) translate(${d.y},0)`;
            } else {
                return `translate(${treeOrientation === 'horizontal' ? d.y : d.x},${treeOrientation === 'horizontal' ? d.x : d.y})`;
            }
        });

    // Add background rectangle for text
    textGroup.append('rect')
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', d => color(d.data.type))
        .attr('stroke', d => color(d.data.type))
        .attr('stroke-width', 1)
        .attr('pointer-events', 'none');

    // Add text
    textGroup.append('text')
        .text(d => d.data.name)
        .attr('text-anchor', d => {
            if (treeOrientation === 'radial') {
                return d.x < Math.PI ? 'start' : 'end';
            } else if (treeOrientation === 'horizontal') {
                return 'start';
            } else {
                return 'middle';
            }
        })
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', 'white')
        .style('pointer-events', 'auto')
        .style('cursor', 'pointer')
        .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
        .each(function(d) {
            const textElement = d3.select(this);
            const rectElement = d3.select(this.parentNode).select('rect');
            
            // Position text and calculate background
            if (treeOrientation === 'radial') {
                textElement.attr('transform', d.x >= Math.PI ? 'rotate(180)' : null);
            } else if (treeOrientation === 'horizontal') {
                textElement.attr('x', 8);
            }
            
            // Calculate background rectangle
            if (textElement.node() && textElement.node().getBBox) {
                try {
                    const textNode = textElement.node();
                    const bbox = textNode.getBBox();
                    const padding = 6;
                    
                    if (treeOrientation === 'radial') {
                        rectElement
                            .attr('x', bbox.x - padding)
                            .attr('y', bbox.y - padding)
                            .attr('width', bbox.width + padding * 2)
                            .attr('height', bbox.height + padding * 2);
                    } else if (treeOrientation === 'horizontal') {
                        rectElement
                            .attr('x', 4)
                            .attr('y', bbox.y - padding)
                            .attr('width', bbox.width + padding * 2)
                            .attr('height', bbox.height + padding * 2);
                    } else {
                        rectElement
                            .attr('x', bbox.x - padding)
                            .attr('y', bbox.y - padding)
                            .attr('width', bbox.width + padding * 2)
                            .attr('height', bbox.height + padding * 2);
                    }
                } catch (error) {
                    console.warn('getBBox failed, using default text background size');
                    const defaultWidth = 100;
                    const defaultHeight = 20;
                    rectElement
                        .attr('x', -defaultWidth / 2)
                        .attr('y', -defaultHeight / 2)
                        .attr('width', defaultWidth)
                        .attr('height', defaultHeight);
                }
            } else {
                const defaultWidth = 100;
                const defaultHeight = 20;
                rectElement
                    .attr('x', -defaultWidth / 2)
                    .attr('y', -defaultHeight / 2)
                    .attr('width', defaultWidth)
                    .attr('height', defaultHeight);
            }
        });

    // Apply current zoom
    setZoom(currentZoom);
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