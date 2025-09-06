import React, { useState, useRef, useEffect } from 'react'
import { Plus, MessageSquare, Target, Lightbulb, Sparkles, Move, Trash2, Link } from 'lucide-react'

const tileTypes = [
  { id: 'note', label: 'Note', icon: MessageSquare, color: 'blue' },
  { id: 'goal', label: 'Goal', icon: Target, color: 'green' },
  { id: 'idea', label: 'Idea', icon: Lightbulb, color: 'purple' }
]

const initialTiles = [
  {
    id: 1,
    type: 'note',
    content: 'Feeling disconnected from remote teammates lately. Need to find better ways to bond.',
    x: 200,
    y: 150,
    clusterId: null
  },
  {
    id: 2,
    type: 'idea',
    content: 'What if we had virtual coffee chats every Friday?',
    x: 500,
    y: 200,
    clusterId: null
  },
  {
    id: 3,
    type: 'goal',
    content: 'Improve team communication and build stronger relationships',
    x: 350,
    y: 350,
    clusterId: null
  }
]

function SafeSpace() {
  const [tiles, setTiles] = useState(initialTiles)
  const [selectedTileType, setSelectedTileType] = useState('note')
  const [draggedTile, setDraggedTile] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isCreatingTile, setIsCreatingTile] = useState(false)
  const [newTilePosition, setNewTilePosition] = useState({ x: 0, y: 0 })
  const [clusters, setClusters] = useState([])
  const canvasRef = useRef(null)

  const getTileColor = (type) => {
    const typeConfig = tileTypes.find(t => t.id === type)
    return typeConfig?.color || 'blue'
  }

  const getColorVariables = (color) => {
    const colors = {
      blue: { bg: 'var(--blue-light)', border: 'var(--blue-soft)', glow: 'var(--glow-soft)' },
      green: { bg: 'var(--green-light)', border: 'var(--green-soft)', glow: 'var(--glow-green)' },
      purple: { bg: 'var(--purple-light)', border: 'var(--purple-soft)', glow: 'var(--glow-purple)' }
    }
    return colors[color] || colors.blue
  }

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      setNewTilePosition({ x, y })
      setIsCreatingTile(true)
    }
  }

  const createTile = (content) => {
    const newTile = {
      id: tiles.length + 1,
      type: selectedTileType,
      content: content,
      x: newTilePosition.x - 120, // Center the tile
      y: newTilePosition.y - 60,
      clusterId: null
    }
    
    setTiles(prev => [...prev, newTile])
    setIsCreatingTile(false)
  }

  const handleTileMouseDown = (e, tile) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const canvasRect = canvasRef.current.getBoundingClientRect()
    
    setDraggedTile(tile.id)
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = (e) => {
    if (draggedTile) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - dragOffset.x
      const y = e.clientY - rect.top - dragOffset.y
      
      setTiles(prev => prev.map(tile => 
        tile.id === draggedTile 
          ? { ...tile, x: Math.max(0, Math.min(x, rect.width - 240)), y: Math.max(0, Math.min(y, rect.height - 120)) }
          : tile
      ))
    }
  }

  const handleMouseUp = () => {
    setDraggedTile(null)
    setDragOffset({ x: 0, y: 0 })
  }

  const deleteTile = (tileId) => {
    setTiles(prev => prev.filter(tile => tile.id !== tileId))
  }

  const generateClusters = () => {
    // Simple clustering algorithm based on proximity and similarity
    const newClusters = []
    const processed = new Set()
    
    tiles.forEach(tile => {
      if (processed.has(tile.id)) return
      
      const cluster = {
        id: newClusters.length + 1,
        tiles: [tile.id],
        center: { x: tile.x + 120, y: tile.y + 60 },
        theme: getThemeFromContent(tile.content)
      }
      
      // Find nearby tiles with similar content
      tiles.forEach(otherTile => {
        if (otherTile.id !== tile.id && !processed.has(otherTile.id)) {
          const distance = Math.sqrt(
            Math.pow(tile.x - otherTile.x, 2) + Math.pow(tile.y - otherTile.y, 2)
          )
          
          if (distance < 200 && hasSimilarContent(tile.content, otherTile.content)) {
            cluster.tiles.push(otherTile.id)
            processed.add(otherTile.id)
          }
        }
      })
      
      if (cluster.tiles.length > 1) {
        newClusters.push(cluster)
        cluster.tiles.forEach(id => processed.add(id))
      }
    })
    
    setClusters(newClusters)
    
    // Update tiles with cluster IDs
    setTiles(prev => prev.map(tile => ({
      ...tile,
      clusterId: newClusters.find(cluster => cluster.tiles.includes(tile.id))?.id || null
    })))
  }

  const getThemeFromContent = (content) => {
    const themes = ['Communication', 'Teamwork', 'Goals', 'Ideas', 'Challenges']
    return themes[Math.floor(Math.random() * themes.length)]
  }

  const hasSimilarContent = (content1, content2) => {
    const words1 = content1.toLowerCase().split(' ')
    const words2 = content2.toLowerCase().split(' ')
    const commonWords = words1.filter(word => words2.includes(word))
    return commonWords.length > 2
  }

  useEffect(() => {
    if (draggedTile) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggedTile, dragOffset])

  return (
    <div className="safespace-container">
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">Safe Space</h1>
            <p className="page-subtitle">Your private canvas for thoughts, ideas, and reflections</p>
          </div>
          <div className="canvas-toolbar glass-toolbar">
            {tileTypes.map(type => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  className={`tool-btn ${selectedTileType === type.id ? 'active' : ''}`}
                  onClick={() => setSelectedTileType(type.id)}
                  style={{ '--tool-color': `var(--${type.color}-soft)` }}
                >
                  <Icon size={18} />
                  <span>{type.label}</span>
                </button>
              )
            })}
            <div className="toolbar-divider" />
            <button className="tool-btn ai-cluster-btn" onClick={generateClusters}>
              <Sparkles size={18} />
              <span>AI Cluster</span>
            </button>
          </div>
        </div>
      </div>

      <div 
        className="canvas-area"
        ref={canvasRef}
        onClick={handleCanvasClick}
      >
        {/* Render clusters */}
        {clusters.map(cluster => (
          <div
            key={cluster.id}
            className="cluster-boundary"
            style={{
              left: cluster.center.x - 150,
              top: cluster.center.y - 150,
              width: 300,
              height: 300
            }}
          >
            <div className="cluster-label">{cluster.theme}</div>
          </div>
        ))}

        {/* Render tiles */}
        {tiles.map(tile => {
          const colors = getColorVariables(getTileColor(tile.type))
          const Icon = tileTypes.find(t => t.id === tile.type)?.icon || MessageSquare
          
          return (
            <div
              key={tile.id}
              className={`thought-tile ${draggedTile === tile.id ? 'dragging' : ''}`}
              style={{
                left: tile.x,
                top: tile.y,
                '--tile-bg': colors.bg,
                '--tile-border': colors.border,
                '--tile-glow': colors.glow
              }}
              onMouseDown={(e) => handleTileMouseDown(e, tile)}
            >
              <div className="tile-header">
                <div className="tile-type-icon">
                  <Icon size={16} />
                </div>
                <div className="tile-actions">
                  <button className="tile-action-btn" title="Link to other tiles">
                    <Link size={14} />
                  </button>
                  <button 
                    className="tile-action-btn delete-btn" 
                    onClick={() => deleteTile(tile.id)}
                    title="Delete tile"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button className="tile-action-btn drag-handle" title="Drag to move">
                    <Move size={14} />
                  </button>
                </div>
              </div>
              <div className="tile-content">
                <p>{tile.content}</p>
              </div>
              <div className="tile-footer">
                <span className="tile-timestamp">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          )
        })}

        {/* Canvas instructions */}
        {tiles.length === 0 && (
          <div className="canvas-instructions">
            <div className="instructions-content">
              <Lightbulb size={48} className="instructions-icon" />
              <h3>Welcome to your Safe Space</h3>
              <p>Click anywhere on the canvas to create your first thought tile</p>
              <p>Use the toolbar to switch between different tile types</p>
            </div>
          </div>
        )}
      </div>

      {/* New Tile Modal */}
      {isCreatingTile && (
        <NewTileModal
          tileType={selectedTileType}
          onSave={createTile}
          onCancel={() => setIsCreatingTile(false)}
          position={newTilePosition}
        />
      )}

      <style jsx>{`
        .safespace-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f3eeff 0%, #f5f1ff 20%, #f7f4ff 40%, #f9f7ff 60%, #fcfbff 80%, #ffffff 100%);
          margin: calc(-1 * var(--space-6));
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .canvas-toolbar {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
        }

        .tool-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border: none;
          background: transparent;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: var(--text-sm);
          cursor: pointer;
          transition: all var(--transition-base);
          white-space: nowrap;
        }

        .tool-btn:hover {
          color: var(--tool-color, var(--text-primary));
          background: rgba(59, 130, 246, 0.1);
        }

        .tool-btn.active {
          color: var(--tool-color, var(--blue-soft));
          background: rgba(59, 130, 246, 0.15);
        }

        .ai-cluster-btn {
          background: var(--gradient-accent);
          color: var(--blue-soft);
          font-weight: 500;
        }

        .ai-cluster-btn:hover {
          background: var(--gradient-accent);
          transform: translateY(-1px);
          box-shadow: var(--glow-soft);
        }

        .toolbar-divider {
          width: 1px;
          height: 24px;
          background: var(--border-subtle);
          margin: 0 var(--space-2);
        }

        .canvas-area {
          flex: 1;
          position: relative;
          background: var(--gradient-chat);
          border-radius: var(--radius-xl);
          border: var(--border-glass);
          overflow: hidden;
          cursor: crosshair;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .canvas-area:active {
          cursor: grabbing;
        }

        .thought-tile {
          position: absolute;
          width: 240px;
          min-height: 120px;
          background: var(--tile-bg);
          border: 2px solid var(--tile-border);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          cursor: grab;
          transition: all var(--transition-base);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          animation: fadeInUp 0.4s ease-out;
          user-select: none;
        }

        .thought-tile:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: var(--tile-glow);
          border-color: var(--tile-border);
        }

        .thought-tile.dragging {
          cursor: grabbing;
          transform: scale(1.05);
          box-shadow: var(--shadow-elevated);
          z-index: 1000;
        }

        .tile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-3);
        }

        .tile-type-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--tile-border);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .tile-actions {
          display: flex;
          gap: var(--space-1);
          opacity: 0;
          transition: opacity var(--transition-base);
        }

        .thought-tile:hover .tile-actions {
          opacity: 1;
        }

        .tile-action-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all var(--transition-base);
        }

        .tile-action-btn:hover {
          background: white;
          color: var(--text-primary);
          transform: scale(1.1);
        }

        .delete-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .drag-handle {
          cursor: grab;
        }

        .tile-content {
          margin-bottom: var(--space-3);
        }

        .tile-content p {
          margin: 0;
          color: var(--text-primary);
          line-height: 1.5;
          font-size: var(--text-sm);
        }

        .tile-footer {
          display: flex;
          justify-content: flex-end;
        }

        .tile-timestamp {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }

        .cluster-boundary {
          position: absolute;
          border: 2px dashed var(--blue-soft);
          border-radius: var(--radius-xl);
          background: rgba(59, 130, 246, 0.05);
          pointer-events: none;
          animation: fadeIn 0.5s ease-out;
        }

        .cluster-label {
          position: absolute;
          top: -12px;
          left: 12px;
          background: var(--blue-soft);
          color: white;
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: 500;
        }

        .canvas-instructions {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: var(--text-secondary);
          pointer-events: none;
        }

        .instructions-content {
          background: var(--surface-elevated);
          padding: var(--space-8);
          border-radius: var(--radius-xl);
          border: var(--border-soft);
          max-width: 400px;
        }

        .instructions-icon {
          color: var(--blue-soft);
          margin-bottom: var(--space-4);
        }

        .instructions-content h3 {
          font-size: var(--text-xl);
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 var(--space-4) 0;
        }

        .instructions-content p {
          margin: 0 0 var(--space-2) 0;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .header-content {
            flex-direction: column;
            align-items: stretch;
          }

          .canvas-toolbar {
            justify-content: center;
            flex-wrap: wrap;
          }

          .thought-tile {
            width: 200px;
          }
        }
      `}</style>
    </div>
  )
}

function NewTileModal({ tileType, onSave, onCancel, position }) {
  const [content, setContent] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  
  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim())
      setContent('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave()
    }
  }

  const tileConfig = tileTypes.find(t => t.id === tileType)
  const Icon = tileConfig?.icon || MessageSquare

  return (
    <div className="modal-overlay">
      <div 
        className="tile-modal glass-card"
        style={{ 
          '--modal-x': `${position.x}px`,
          '--modal-y': `${position.y}px`,
          '--tile-color': `var(--${tileConfig?.color || 'blue'}-soft)`
        }}
      >
        <div className="modal-header">
          <div className="modal-icon">
            <Icon size={20} />
          </div>
          <h3>New {tileConfig?.label}</h3>
        </div>

        <div className="modal-content">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Share your ${tileType}...`}
            className="tile-textarea"
            autoFocus
            rows={4}
          />
          
          <div className="recording-controls">
            <button 
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={() => setIsRecording(!isRecording)}
            >
              <div className="record-dot" />
              {isRecording ? 'Stop Recording' : 'Voice Note'}
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={!content.trim()}
          >
            Create Tile
          </button>
        </div>

        <style jsx>{`
          .tile-modal {
            width: 400px;
            max-width: 90vw;
            padding: var(--space-6);
            position: relative;
            animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes modalSlideIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }

          .modal-header {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            margin-bottom: var(--space-5);
          }

          .modal-icon {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-md);
            background: var(--tile-color);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .modal-header h3 {
            font-size: var(--text-lg);
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
          }

          .tile-textarea {
            width: 100%;
            border: var(--border-soft);
            border-radius: var(--radius-md);
            padding: var(--space-4);
            font-family: var(--font-primary);
            font-size: var(--text-base);
            color: var(--text-primary);
            background: var(--surface-primary);
            resize: vertical;
            min-height: 100px;
            transition: all var(--transition-base);
          }

          .tile-textarea:focus {
            outline: none;
            border-color: var(--tile-color);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .tile-textarea::placeholder {
            color: var(--text-tertiary);
          }

          .recording-controls {
            margin: var(--space-4) 0;
            display: flex;
            justify-content: center;
          }

          .record-btn {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-4);
            border: var(--border-soft);
            background: var(--surface-primary);
            border-radius: var(--radius-full);
            color: var(--text-secondary);
            cursor: pointer;
            transition: all var(--transition-base);
            font-size: var(--text-sm);
          }

          .record-btn:hover {
            border-color: var(--tile-color);
            color: var(--tile-color);
          }

          .record-btn.recording {
            background: var(--tile-color);
            color: white;
            border-color: var(--tile-color);
          }

          .record-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: currentColor;
          }

          .record-btn.recording .record-dot {
            animation: pulse 1s infinite;
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }

          .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: var(--space-3);
            margin-top: var(--space-5);
          }
        `}</style>
      </div>
    </div>
  )
}

export default SafeSpace
