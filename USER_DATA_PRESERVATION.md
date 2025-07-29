# User Data Preservation System

## Overview

The Mirth Channel Visualizer now includes a robust user data preservation system that prevents loss of user modifications when XML files are reprocessed.

## Problem Solved

Previously, when `ProcessXmlFiles.ps1` ran, it would completely overwrite `LoadedData.json`, losing:
- User comments on nodes
- Status assignments (In Development, In Testing, etc.)
- Collapsed/expanded tree states
- Any other user modifications

## Solution Architecture

### 1. Separate User Data Storage
- **`UserData.json`** - Stores all user modifications separately
- **`LoadedData.json`** - Contains the main graph data (nodes/links)
- **Automatic merging** - User data is preserved during XML processing

### 2. Data Structure

#### UserData.json
```json
{
  "comments": {
    "Channel-SIU-0": "This channel handles SIU messages",
    "Destination-MILN_SIU_to_Olympus-1": "Sends to Olympus system"
  },
  "statuses": {
    "Channel-SIU-0": "reception-3",
    "Destination-MILN_SIU_to_Olympus-1": "reception-4"
  },
  "collapsedNodes": ["Channel-ADT-41", "Channel-ORM-17"],
  "lastUpdated": "2024-01-15T10:30:00.000Z",
  "version": "1.0"
}
```

#### LoadedData.json (Merged)
```json
{
  "nodes": [...],
  "links": [...],
  "comments": {...},
  "statuses": {...},
  "collapsedNodes": [...]
}
```

## How It Works

### 1. User Modifications
When users add comments, assign statuses, or collapse nodes:
- Data is saved to both `LoadedData.json` AND `UserData.json`
- Dual storage ensures redundancy

### 2. XML Processing
When `ProcessXmlFiles.ps1` runs:
1. **Loads existing user data** from `UserData.json`
2. **Processes XML files** to extract new node/link data
3. **Merges new data** with existing user data
4. **Saves merged result** to `LoadedData.json`
5. **Preserves user data** in `UserData.json`

### 3. Frontend Loading
When the application loads:
1. **Loads main data** from `LoadedData.json`
2. **Applies user modifications** (comments, statuses, collapsed states)
3. **Renders graph** with all user modifications intact

## API Endpoints

### New Endpoints Added

#### `POST /save-user-data`
Saves user modifications to `UserData.json`
```javascript
await fetch('/save-user-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
});
```

#### `GET /load-user-data`
Loads user modifications from `UserData.json`
```javascript
const userData = await fetch('/load-user-data').then(r => r.json());
```

#### `POST /merge-user-data`
Merges main data with user data
```javascript
await fetch('/merge-user-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mainData, userData })
});
```

## Updated PowerShell Script

### ProcessXmlFiles.ps1 Changes
- **Loads existing user data** before processing
- **Preserves user modifications** during XML processing
- **Merges new data** with existing user data
- **Saves both files** for redundancy

### Key Functions Added
```powershell
function Load-UserData { ... }
function Save-UserData { ... }
function Merge-UserData { ... }
```

## Benefits

### 1. Data Preservation
- **No data loss** when reprocessing XML files
- **Comments preserved** across processing cycles
- **Status assignments maintained**
- **Tree states remembered**

### 2. Redundancy
- **Dual storage** (LoadedData.json + UserData.json)
- **Automatic backup** of user modifications
- **Recovery options** if one file is corrupted

### 3. Flexibility
- **External user data** can be managed separately
- **Version control** of user modifications
- **Easy migration** of user data between systems

## Usage Examples

### Adding a Comment
```javascript
// This automatically saves to both files
comments[nodeId] = "User comment";
await saveComments(); // Saves to LoadedData.json
await saveUserData(); // Saves to UserData.json
```

### Assigning a Status
```javascript
// This automatically saves to both files
statuses[nodeId] = "reception-3";
await saveStatus(); // Saves to LoadedData.json
await saveUserData(); // Saves to UserData.json
```

### Processing XML Files
```powershell
# PowerShell script now preserves user data
.\ProcessXmlFiles.ps1 -ChannelsDirectory "C:\Mirth\channels"
# User comments, statuses, and collapsed states are preserved
```

## Migration

### From Old System
If you have existing `LoadedData.json` with user data:
1. **Extract user data** from existing file
2. **Create UserData.json** with extracted data
3. **Run new system** - data will be preserved

### To New System
The new system is **backward compatible**:
- Existing `LoadedData.json` files work
- User data is automatically preserved
- No migration steps required

## Testing

### Test Script
Run `node test-user-data.js` to simulate the workflow:
```bash
node test-user-data.js
```

### Manual Testing
1. **Add comments/statuses** to nodes
2. **Run ProcessXmlFiles.ps1**
3. **Verify data is preserved**
4. **Check both JSON files**

## Troubleshooting

### Data Loss Prevention
- **Always backup** UserData.json before major changes
- **Check file permissions** for both JSON files
- **Verify PowerShell execution policy** for script running

### Recovery Options
- **Restore from UserData.json** if LoadedData.json is corrupted
- **Re-run XML processing** to regenerate main data
- **Manual merge** if automatic merging fails

## Future Enhancements

### Planned Features
- **User data versioning** with timestamps
- **Export/import** user data between systems
- **Conflict resolution** for overlapping modifications
- **User data analytics** and reporting

### Potential Improvements
- **Database storage** instead of JSON files
- **Real-time synchronization** between files
- **User data encryption** for sensitive comments
- **Cloud backup** of user modifications 