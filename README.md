# Mirth Visualizer

A comprehensive web application for visualizing Mirth Connect channels using interactive D3.js graphs. This tool provides multiple visualization types to help understand and manage Mirth Connect channel relationships and data flow.

## 🚀 Features

### 📊 Multiple Visualization Types
- **Force-Directed Graph**: Interactive network visualization with force simulation
- **Disjoint Force-Directed Graph**: Enhanced force-directed graph with inward gravitation
- **Hierarchical Graph**: Tree-based visualization with multiple orientations
- **Collapsible Tree**: Interactive hierarchical tree with expand/collapse functionality

### 🎯 Key Features
- **XML Channel Processing**: Parse Mirth Connect channel XML files
- **Interactive Controls**: Zoom, pan, force parameters, layout options
- **Node Management**: Add custom nodes and create relationships
- **Status Tracking**: Development status for destination nodes (Dev, Test, UAT, Ready, Prod)
- **Comment System**: Add comments to individual nodes
- **Data Persistence**: Save and load graph data and user modifications
- **Responsive Design**: Bootstrap-based UI with modern styling

## 🛠️ Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup
1. Clone the repository:
```bash
git clone https://github.com/DevelopmentProfessional/Mirth-Visualizer.git
cd Mirth-Visualizer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:4567`

## 📁 Project Structure

```
Mirth-Visualizer/
├── index.html                 # Main navigation page
├── server.js                  # Express.js backend server
├── package.json               # Node.js dependencies
├── LoadedData.json           # Graph data storage
├── UserData.json             # User modifications storage
├── ProcessXmlFiles.ps1       # PowerShell XML processing script
├── ForceDirectedGraph.html   # Force-directed graph page
├── ForceDirectedGraph.js     # Force-directed graph logic
├── DisjointForceDirectedGraph.html  # Disjoint force-directed graph page
├── DisjointForceDirectedGraph.js    # Disjoint force-directed graph logic
├── HierarchicalGraph.html    # Hierarchical graph page
├── HierarchicalGraph.js      # Hierarchical graph logic
├── CollapsibleTree.html      # Collapsible tree page
├── CollapsibleTree.js        # Collapsible tree logic
└── USER_DATA_PRESERVATION.md # User data preservation documentation
```

## 🎮 Usage

### 1. Loading Channel Data
1. Click "Directory" to select your Mirth Connect channels directory
2. Click "Load" to process XML files and generate graph data
3. The application will parse channel XML files and create visualizations

### 2. Navigation
- **Main Page**: Choose between different visualization types
- **Force-Directed Graph**: Interactive network with force simulation
- **Disjoint Force-Directed Graph**: Enhanced network with inward gravitation
- **Hierarchical Graph**: Tree-based visualization
- **Collapsible Tree**: Interactive tree with expand/collapse

### 3. Interactive Features
- **Zoom & Pan**: Use mouse wheel to zoom, drag to pan
- **Force Controls**: Adjust link distance, node force, centering, collision
- **Node Management**: Add custom nodes and create relationships
- **Status Assignment**: Set development status for destination nodes
- **Comments**: Add comments to any node
- **Expand/Collapse**: Interactive tree navigation

## 🔧 Configuration

### Graph Controls
- **Link Distance**: Control spacing between connected nodes
- **Node Force**: Adjust repulsion/attraction between nodes
- **Centering**: Control how nodes gravitate toward center
- **Collision**: Prevent node overlap
- **Node Size**: Adjust visual size of nodes
- **Tree Orientation**: Vertical, horizontal, or radial layouts

### Data Persistence
- **LoadedData.json**: Stores graph data and user modifications
- **UserData.json**: Separate storage for user-specific data
- **localStorage**: Browser-based control value persistence

## 🎨 Visualization Types

### Force-Directed Graph
- Interactive network visualization
- Force simulation with adjustable parameters
- Node dragging and zoom/pan functionality
- Color-coded nodes by type (Channel, Destination, Transformer)

### Disjoint Force-Directed Graph
- Enhanced force-directed graph
- Inward gravitation for cohesive layout
- Additional gravity and centering forces
- Improved node clustering

### Hierarchical Graph
- Tree-based visualization
- Multiple orientations (vertical, horizontal, radial)
- Adjustable node and level separation
- Clean hierarchical layout

### Collapsible Tree
- Interactive hierarchical tree
- Expand/collapse functionality
- Child count badges
- Status and comment indicators
- View state preservation

## 🔌 API Endpoints

### Backend Server (Express.js)
- `GET /` - Serve main navigation page
- `GET /force-directed` - Force-directed graph page
- `GET /disjoint-force-directed` - Disjoint force-directed graph page
- `GET /hierarchical` - Hierarchical graph page
- `GET /collapsible-tree` - Collapsible tree page
- `POST /save-data` - Save graph data
- `GET /load-data` - Load graph data
- `POST /reset-data` - Reset graph data
- `POST /save-user-data` - Save user modifications
- `GET /load-user-data` - Load user modifications
- `POST /merge-user-data` - Merge data with user modifications

## 📊 Data Structure

### Graph Data Format
```json
{
  "nodes": [
    {
      "id": "Channel-SIU-0",
      "name": "SIU",
      "type": "Channel"
    }
  ],
  "links": [
    {
      "source": "Channel-SIU-0",
      "target": "Destination-MILN_SIU_to_Olympus-1"
    }
  ],
  "collapsedNodes": [],
  "comments": {},
  "statuses": {}
}
```

### Status Options
- `reception-0`: Dev (Gear icon)
- `reception-1`: Test (Patch check icon)
- `reception-2`: UAT (Shield check icon)
- `reception-3`: Ready (Check circle icon)
- `reception-4`: Prod (Play circle icon)

## 🛡️ User Data Preservation

The application implements a dual-file persistence system:
- **LoadedData.json**: Contains graph data and user modifications
- **UserData.json**: Separate storage for user-specific data
- **Automatic merging**: Preserves user modifications during XML reprocessing

## 🚀 Deployment

### Local Development
```bash
npm start
```

### Production Deployment
1. Install dependencies: `npm install`
2. Start server: `npm start`
3. Access via: `http://localhost:4567`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **D3.js**: Data visualization library
- **Bootstrap**: CSS framework for responsive design
- **Express.js**: Web application framework
- **Mirth Connect**: Healthcare integration platform

## 📞 Support

For support and questions, please open an issue on the GitHub repository.

---

**Mirth Visualizer** - Visualizing Mirth Connect channels with interactive D3.js graphs. 