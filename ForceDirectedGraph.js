// Global variables for force simulation controls
let currentZoom = 1;
let svgSelection;
let simulationRef;
let forceStrength = -40;
let linkDistance = 250;
let centerStrength = 1;
let collisionRadius = 50;
let nodeSize = 22;
let graphData = { nodes: [], links: [] };
let selectedNode = null;

// Default values for controls
const DEFAULT_VALUES = {
    forceStrength: -40,
    linkDistance: 250,
    centerStrength: 1,
    collisionRadius: 50,
    nodeSize: 22,
    zoomValue: 1.0
};

// Function to save control values to localStorage
function saveControlValues() {
    const values = {
        forceStrength: forceStrength,
        linkDistance: linkDistance,
        centerStrength: centerStrength,
        collisionRadius: collisionRadius,
        nodeSize: nodeSize,
        zoomValue: currentZoom
    };
    localStorage.setItem('mirthVisualizerControls', JSON.stringify(values));
}

// Function to load control values from localStorage
function loadControlValues() {
    try {
        const saved = localStorage.getItem('mirthVisualizerControls');
        if (saved) {
            const values = JSON.parse(saved);
            forceStrength = values.forceStrength || DEFAULT_VALUES.forceStrength;
            linkDistance = values.linkDistance || DEFAULT_VALUES.linkDistance;
            centerStrength = values.centerStrength || DEFAULT_VALUES.centerStrength;
            collisionRadius = values.collisionRadius || DEFAULT_VALUES.collisionRadius;
            nodeSize = values.nodeSize || DEFAULT_VALUES.nodeSize;
            currentZoom = values.zoomValue || DEFAULT_VALUES.zoomValue;
        } else {
            // Use defaults if no saved values
            forceStrength = DEFAULT_VALUES.forceStrength;
            linkDistance = DEFAULT_VALUES.linkDistance;
            centerStrength = DEFAULT_VALUES.centerStrength;
            collisionRadius = DEFAULT_VALUES.collisionRadius;
            nodeSize = DEFAULT_VALUES.nodeSize;
            currentZoom = DEFAULT_VALUES.zoomValue;
        }
        
        // Update UI elements
        updateControlDisplays();
    } catch (error) {
        console.error('Error loading control values:', error);
        // Use defaults on error
        forceStrength = DEFAULT_VALUES.forceStrength;
        linkDistance = DEFAULT_VALUES.linkDistance;
        centerStrength = DEFAULT_VALUES.centerStrength;
        collisionRadius = DEFAULT_VALUES.collisionRadius;
        nodeSize = DEFAULT_VALUES.nodeSize;
        currentZoom = DEFAULT_VALUES.zoomValue;
        updateControlDisplays();
    }
}

// Function to update control displays
function updateControlDisplays() {
    // Update sliders and inputs
    const elements = [
        { slider: 'forceSlider', input: 'forceInput', value: forceStrength },
        { slider: 'linkDistanceSlider', input: 'linkDistanceInput', value: linkDistance },
        { slider: 'centerSlider', input: 'centerInput', value: centerStrength },
        { slider: 'collisionSlider', input: 'collisionInput', value: collisionRadius },
        { slider: 'nodeSizeSlider', input: 'nodeSizeInput', value: nodeSize }
    ];
    
    elements.forEach(({ slider, input, value }) => {
        const sliderEl = document.getElementById(slider);
        const inputEl = document.getElementById(input);
        if (sliderEl) sliderEl.value = value;
        if (inputEl) inputEl.value = value;
    });
    
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
    saveControlValues(); // Save control values
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

function centerNodes() {
    if (simulationRef) {
        // Snap nodes to center
        graphData.nodes.forEach(node => {
            node.x = document.getElementById('graph').clientWidth / 2;
            node.y = document.getElementById('graph').clientHeight / 2;
        });
        simulationRef.alpha(1).restart();
        
        // Release after a short delay
        setTimeout(() => {
            if (simulationRef) {
                graphData.nodes.forEach(node => {
                    node.fx = null;
                    node.fy = null;
                });
                simulationRef.alpha(1).restart();
            }
        }, 1000);
    }
}
window.centerNodes = centerNodes;

function fitToScreen() {
    if (svgSelection) {
        const graphElement = document.getElementById('graph');
        const width = graphElement.clientWidth;
        const height = graphElement.clientHeight;
        
        // Calculate bounds of all nodes
        if (graphData.nodes.length > 0) {
            const xExtent = d3.extent(graphData.nodes, d => d.x);
            const yExtent = d3.extent(graphData.nodes, d => d.y);
            
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

function updateLinkDistance(val) {
    linkDistance = +val;
    document.getElementById('linkDistanceSlider').value = val;
    document.getElementById('linkDistanceInput').value = val;
    if (simulationRef) {
        simulationRef.force('link').distance(linkDistance);
        simulationRef.alpha(1).restart();
    }
    saveControlValues(); // Save control values
}
window.updateLinkDistance = updateLinkDistance;

function updateForceStrength(val) {
    forceStrength = +val;
    document.getElementById('forceSlider').value = val;
    document.getElementById('forceInput').value = val;
    if (simulationRef) {
        simulationRef.force('charge').strength(forceStrength);
        simulationRef.alpha(1).restart();
    }
    saveControlValues(); // Save control values
}
window.updateForceStrength = updateForceStrength;

function updateCenterStrength(val) {
    centerStrength = +val;
    document.getElementById('centerSlider').value = val;
    document.getElementById('centerInput').value = val;
    if (simulationRef) {
        simulationRef.force('center', d3.forceCenter(
            document.getElementById('graph').clientWidth / 2,
            document.getElementById('graph').clientHeight / 2
        ).strength(centerStrength));
        simulationRef.alpha(1).restart();
    }
    saveControlValues(); // Save control values
}
window.updateCenterStrength = updateCenterStrength;

function updateCollisionRadius(val) {
    collisionRadius = +val;
    document.getElementById('collisionSlider').value = val;
    document.getElementById('collisionInput').value = val;
    if (simulationRef) {
        simulationRef.force('collide', d3.forceCollide(collisionRadius));
        simulationRef.alpha(1).restart();
    }
    saveControlValues(); // Save control values
}
window.updateCollisionRadius = updateCollisionRadius;

function updateNodeSize(val) {
    nodeSize = +val;
    document.getElementById('nodeSizeSlider').value = val;
    document.getElementById('nodeSizeInput').value = val;
    if (simulationRef) {
        simulationRef.force('collide', d3.forceCollide(collisionRadius));
        simulationRef.alpha(1).restart();
    }
    saveControlValues(); // Save control values
}
window.updateNodeSize = updateNodeSize;

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
            renderGraph(graphData);
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
        renderGraph(graphData);
        
    } catch (error) {
        console.error('Error resetting data:', error);
    }
}

// --- Add Node Handler ---
function handleAddNode() {
    const type = document.getElementById('nodeType').value;
    const name = document.getElementById('nodeName').value.trim();
    
    if (!name) {
        alert('Please enter a node name.');
        return;
    }
    
    const id = `${type}-${name}-${Date.now()}`;
    const newNode = { id, name, type };
    
    // Add to graph data
    graphData.nodes.push(newNode);
    
    // Rebuild tree data and render
    renderGraph(graphData);
    
    // Clear the form and close modal
    document.getElementById('nodeName').value = '';
    
    // Close the modal using Bootstrap
    const modal = bootstrap.Modal.getInstance(document.getElementById('addNodeModal'));
    if (modal) {
        modal.hide();
    }
}
window.handleAddNode = handleAddNode;

// --- Link Nodes Handler ---
function handleLinkNodes(sourceId, targetId) {
    if (sourceId === targetId) return;
    // Prevent duplicate links
    if (graphData.links.some(l => l.source === sourceId && l.target === targetId)) return;
    graphData.links.push({ source: sourceId, target: targetId });
    renderGraph(graphData);
}

// --- D3 Force-Directed Graph Rendering ---
function renderGraph(data) {
    const width = document.getElementById('graph').clientWidth;
    const height = document.getElementById('graph').clientHeight;
    d3.select('#graph').selectAll('*').remove();

    svgSelection = d3.select('#graph')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add arrow marker definitions for links
    const defs = svgSelection.append('defs');
    defs.append('marker')
        .attr('id', 'arrow-channel-dest')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#1f77b4');
    defs.append('marker')
        .attr('id', 'arrow-dest-tr')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#ff7f0e');
    defs.append('marker')
        .attr('id', 'arrow-custom')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 28)
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#d62728');

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
        .domain(['Channel', 'Destination', 'Transformer', 'Custom'])
        .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728']);

    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links).id(d => d.id).distance(linkDistance))
        .force('charge', d3.forceManyBody().strength(forceStrength))
        .force('center', d3.forceCenter(width / 2, height / 2).strength(centerStrength))
        .force('collide', d3.forceCollide(collisionRadius));

    simulationRef = simulation; // Save for centerGraph and force control

    // Draw links as arrows
    const link = zoomGroup.append('g')
        .attr('stroke', '#aaa')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke-width', 2)
        .attr('marker-end', d => {
            // Channel -> Destination
            const sourceNode = data.nodes.find(n => n.id === (d.source.id || d.source));
            const targetNode = data.nodes.find(n => n.id === (d.target.id || d.target));
            if (sourceNode && sourceNode.type === 'Channel' && targetNode && targetNode.type === 'Destination') {
                return 'url(#arrow-channel-dest)';
            } else if (sourceNode && sourceNode.type === 'Destination' && targetNode && targetNode.type === 'Transformer') {
                return 'url(#arrow-dest-tr)';
            } else {
                return 'url(#arrow-custom)';
            }
        });

    // Draw nodes as small vector points
    const node = zoomGroup.append('g')
        .selectAll('circle')
        .data(data.nodes)
        .join('circle')
        .attr('r', 4)
        .attr('fill', d => color(d.type))
        .attr('stroke', d => selectedNode && selectedNode.id === d.id ? '#000' : '#fff')
        .attr('stroke-width', 2)
        .call(drag(simulation))
        .on('click', function(event, d) {
            event.stopPropagation(); // Prevent event bubbling
            if (selectedNode && selectedNode.id !== d.id) {
                handleLinkNodes(selectedNode.id, d.id);
                selectedNode = null;
                renderGraph(graphData);
            } else {
                selectedNode = d;
                renderGraph(graphData);
            }
        });

    // Add text labels with colored backgrounds and borders
    const textGroup = zoomGroup.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g');

    // Add background rectangle for text with node colors
    textGroup.append('rect')
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', d => color(d.type))
        .attr('stroke', d => color(d.type))
        .attr('stroke-width', 1)
        .attr('pointer-events', 'none');

    // Add text
    textGroup.append('text')
        .text(d => d.name)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('font-weight', 'bold')
        .style('fill', 'white')
        .style('pointer-events', 'auto')
        .style('cursor', 'pointer')
        .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
        .call(drag(simulation))
        .on('click', function(event, d) {
            event.stopPropagation(); // Prevent event bubbling
            if (selectedNode && selectedNode.id !== d.id) {
                handleLinkNodes(selectedNode.id, d.id);
                selectedNode = null;
                renderGraph(graphData);
            } else {
                selectedNode = d;
                renderGraph(graphData);
            }
        })
        .on('mousedown', function(event, d) {
            event.stopPropagation(); // Prevent mousedown from bubbling to node
        });

    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        // Position small circular nodes
        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);

        // Position text groups and calculate background rectangles
        textGroup
            .attr('transform', d => `translate(${d.x}, ${d.y})`)
            .each(function(d) {
                const textElement = d3.select(this).select('text');
                const rectElement = d3.select(this).select('rect');
                
                // Check if text element exists and is rendered
                if (textElement.node() && textElement.node().getBBox) {
                    try {
                        // Get text dimensions
                        const textNode = textElement.node();
                        const bbox = textNode.getBBox();
                        
                        // Set background rectangle dimensions with padding
                        const padding = 6;
                        rectElement
                            .attr('x', bbox.x - padding)
                            .attr('y', bbox.y - padding)
                            .attr('width', bbox.width + padding * 2)
                            .attr('height', bbox.height + padding * 2);
                    } catch (error) {
                        // Fallback: use default dimensions if getBBox fails
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
                    // Fallback: use default dimensions if text element is not available
                    const defaultWidth = 100;
                    const defaultHeight = 20;
                    rectElement
                        .attr('x', -defaultWidth / 2)
                        .attr('y', -defaultHeight / 2)
                        .attr('width', defaultWidth)
                        .attr('height', defaultHeight);
                }
            });
    });

    // Deselect node on background click
    svgSelection.on('click', () => {
        selectedNode = null;
        renderGraph(graphData);
    });

    // Apply current zoom
    setZoom(currentZoom);
}

// --- D3 Drag Helper ---
function drag(simulation) {
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        // Prevent text selection during drag
        event.sourceEvent.preventDefault();
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
    return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
}

// --- Initialize ---
// Add event listener for directory selection
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