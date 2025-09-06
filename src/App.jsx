import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import AIChat from './components/AIChat'
import Insights from './components/Insights'
import Actions from './components/Actions'
import SafeSpace from './components/SafeSpace'
import './styles/App.css'

function App() {
  const [activeSection, setActiveSection] = useState('chat')

  return (
    <Router>
      <div className="app">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<AIChat />} />
            <Route path="/chat" element={<AIChat />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/actions" element={<Actions />} />
            <Route path="/safespace" element={<SafeSpace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
