"use client"

import { sdk } from '@farcaster/miniapp-sdk'
import { useEffect, useState } from 'react'

export default function DebugMiniApp() {
  const [status, setStatus] = useState('Loading...')
  const [logs, setLogs] = useState<string[]>([])
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }
  
  useEffect(() => {
    const debugReady = async () => {
      addLog('🚀 Starting Mini App initialization...')
      
      try {
        // Check if we're in a Mini App
        const isMiniApp = await sdk.isInMiniApp()
        addLog(`📱 Is Mini App: ${isMiniApp}`)
        
        // Log the SDK object
        addLog(`🔧 SDK object: ${JSON.stringify(sdk, null, 2)}`)
        
        // Log the context
        try {
          const context = await sdk.context
          addLog(`👤 SDK Context: ${JSON.stringify(context, null, 2)}`)
        } catch (contextError) {
          addLog(`❌ Context error: ${contextError}`)
        }
        
        // Try calling ready with explicit logging
        addLog('⏳ Calling sdk.actions.ready()...')
        await sdk.actions.ready()
        addLog('✅ sdk.actions.ready() completed!')
        setStatus('Ready called successfully!')
        
      } catch (error) {
        addLog(`❌ Error calling ready(): ${error}`)
        setStatus(`Error: ${error}`)
      }
    }
    
    debugReady()
  }, [])
  
  return (
    <div style={{ padding: '20px', fontSize: '16px', fontFamily: 'monospace' }}>
      <h1>🔧 Mini App Debug</h1>
      <p><strong>Status:</strong> {status}</p>
      
      <h2>📋 Debug Logs:</h2>
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '10px', 
        borderRadius: '5px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {logs.map((log, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            {log}
          </div>
        ))}
      </div>
      
      <h2>🛠️ Manual Actions:</h2>
      <button 
        onClick={async () => {
          try {
            addLog('🔄 Manual ready() call...')
            await sdk.actions.ready()
            addLog('✅ Manual ready() success!')
          } catch (error) {
            addLog(`❌ Manual ready() failed: ${error}`)
          }
        }}
        style={{ 
          padding: '10px 20px', 
          margin: '5px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Call ready() manually
      </button>
      
      <button 
        onClick={async () => {
          try {
            addLog('🔍 Checking SDK context...')
            const context = await sdk.context
            addLog(`📋 Context: ${JSON.stringify(context, null, 2)}`)
          } catch (error) {
            addLog(`❌ Context check failed: ${error}`)
          }
        }}
        style={{ 
          padding: '10px 20px', 
          margin: '5px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Check SDK Context
      </button>
      
      <button 
        onClick={async () => {
          try {
            addLog('🔍 Checking if in Mini App...')
            const isMiniApp = await sdk.isInMiniApp()
            addLog(`📱 Is Mini App: ${isMiniApp}`)
          } catch (error) {
            addLog(`❌ Mini App check failed: ${error}`)
          }
        }}
        style={{ 
          padding: '10px 20px', 
          margin: '5px',
          backgroundColor: '#ffc107',
          color: 'black',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Check Mini App Status
      </button>
    </div>
  )
} 