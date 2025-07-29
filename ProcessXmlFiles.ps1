param(
    [Parameter(Mandatory=$true)]
    [string]$ChannelsDirectory
)

# Function to load existing user data
function Load-UserData {
    $userDataPath = "UserData.json"
    if (Test-Path $userDataPath) {
        try {
            $userData = Get-Content $userDataPath -Raw | ConvertFrom-Json
            return $userData
        } catch {
            Write-Warning "Could not load existing user data: $($_.Exception.Message)"
        }
    }
    
    # Return default user data structure
    return @{
        comments = @{}
        statuses = @{}
        collapsedNodes = @()
        lastUpdated = $null
        version = "1.0"
    }
}

# Function to save user data
function Save-UserData {
    param($UserData)
    
    $userDataPath = "UserData.json"
    $UserData.lastUpdated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $UserData | ConvertTo-Json -Depth 10 | Set-Content $userDataPath
    Write-Host "User data saved to $userDataPath"
}

# Function to merge user data with new data
function Merge-UserData {
    param(
        $NewData,
        $UserData
    )
    
    # Create merged data
    $mergedData = @{
        nodes = $NewData.nodes
        links = $NewData.links
        comments = $UserData.comments
        statuses = $UserData.statuses
        collapsedNodes = $UserData.collapsedNodes
    }
    
    return $mergedData
}

# Load existing user data
Write-Host "Loading existing user data..."
$userData = Load-UserData

# Initialize data structures
$nodes = @()
$links = @()
$nodeIdCounter = 0

# Get all XML files in the channels directory
$xmlFiles = Get-ChildItem -Path $ChannelsDirectory -Filter "*.xml" -Recurse | Where-Object { $_.Name -notlike "*index.xml*" }

Write-Host "Found $($xmlFiles.Count) XML files to process..."

foreach ($xmlFile in $xmlFiles) {
    try {
        Write-Host "Processing: $($xmlFile.Name)"
        
        # Load and parse XML
        $xmlContent = Get-Content $xmlFile.FullName -Raw
        $xml = [xml]$xmlContent
        
        # Extract channel name
        $channelName = $xml.SelectSingleNode("//name")?.InnerText
        if (-not $channelName) {
            $channelName = "Unknown Channel"
        }
        
        $channelId = "Channel-$channelName-$nodeIdCounter"
        $nodes += @{
            id = $channelId
            name = $channelName
            type = "Channel"
        }
        $nodeIdCounter++
        
        # Extract destination connectors
        $destinations = $xml.SelectNodes("//destinationConnector")
        foreach ($dest in $destinations) {
            $destName = $dest.SelectSingleNode("name")?.InnerText
            if (-not $destName) {
                $destName = "Destination $($destinations.IndexOf($dest) + 1)"
            }
            
            $destId = "Destination-$destName-$nodeIdCounter"
            $nodes += @{
                id = $destId
                name = $destName
                type = "Destination"
            }
            $links += @{
                source = $channelId
                target = $destId
            }
            $nodeIdCounter++
            
            # Extract transformers for this destination
            $transformers = $dest.SelectNodes("transformer")
            foreach ($trans in $transformers) {
                $transName = $trans.SelectSingleNode("name")?.InnerText
                if (-not $transName) {
                    $transName = "Transformer $($transformers.IndexOf($trans) + 1)"
                }
                
                $transId = "Transformer-$transName-$nodeIdCounter"
                $nodes += @{
                    id = $transId
                    name = $transName
                    type = "Transformer"
                }
                $links += @{
                    source = $destId
                    target = $transId
                }
                $nodeIdCounter++
            }
        }
        
    } catch {
        Write-Warning "Error processing $($xmlFile.Name): $($_.Exception.Message)"
    }
}

# Create the main data structure
$mainData = @{
    nodes = $nodes
    links = $links
}

Write-Host "Processed $($nodes.Count) nodes and $($links.Count) links"

# Merge with existing user data
Write-Host "Merging with existing user data..."
$mergedData = Merge-UserData -NewData $mainData -UserData $userData

# Save the merged data
$jsonPath = "LoadedData.json"
$mergedData | ConvertTo-Json -Depth 10 | Set-Content $jsonPath

Write-Host "Data saved to $jsonPath"
Write-Host "User modifications preserved:"
Write-Host "  - Comments: $($userData.comments.Count)"
Write-Host "  - Statuses: $($userData.statuses.Count)"
Write-Host "  - Collapsed nodes: $($userData.collapsedNodes.Count)"

# Also save user data separately for backup
Save-UserData -UserData $userData

Write-Host "Processing complete!"