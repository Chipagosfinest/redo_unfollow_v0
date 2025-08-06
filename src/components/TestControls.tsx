import React, { useState } from 'react'

interface TestControlsProps {
  onAnalyze: (options: any) => void
  currentResults?: any
}

export function TestControls({ onAnalyze, currentResults }: TestControlsProps) {
  const [testMode, setTestMode] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [threshold, setThreshold] = useState(75)
  const [testFid, setTestFid] = useState('4044') // alec.eth's FID

  const runTest = () => {
    onAnalyze({ 
      testMode, 
      debugMode, 
      threshold: parseInt(threshold.toString()),
      fid: parseInt(testFid)
    })
  }

  const runQuickTests = () => {
    // Test with different scenarios
    const tests = [
      { name: 'Test Mode (show all)', testMode: true, threshold: 75 },
      { name: '1 Day Threshold', testMode: false, threshold: 1 },
      { name: '7 Day Threshold', testMode: false, threshold: 7 },
      { name: 'Debug Mode', testMode: false, debugMode: true, threshold: 75 }
    ]

    tests.forEach((test, index) => {
      setTimeout(() => {
        console.log(`🧪 Running test: ${test.name}`)
        onAnalyze({ ...test, fid: parseInt(testFid) })
      }, index * 2000) // Run tests 2 seconds apart
    })
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px dashed #ccc', 
      margin: '10px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px'
    }}>
      <h3>🧪 Test Controls</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={testMode}
            onChange={(e) => setTestMode(e.target.checked)}
          />
          Test Mode (show all users)
        </label>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
          />
          Debug Mode (show detailed logs)
        </label>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <label>
          Inactive threshold (days): 
          <input 
            type="number" 
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            min="1"
            max="365"
            style={{ marginLeft: '10px', width: '60px' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>
          Test FID: 
          <input 
            type="number" 
            value={testFid}
            onChange={(e) => setTestFid(e.target.value)}
            style={{ marginLeft: '10px', width: '80px' }}
          />
        </label>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={runTest}
          style={{ 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            padding: '8px 16px',
            borderRadius: '4px',
            marginRight: '10px'
          }}
        >
          🔍 Test Analysis
        </button>
        
        <button 
          onClick={runQuickTests}
          style={{ 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            padding: '8px 16px',
            borderRadius: '4px'
          }}
        >
          🚀 Run All Tests
        </button>
      </div>

      {currentResults && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <h4>📊 Last Results:</h4>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>
            {JSON.stringify(currentResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 