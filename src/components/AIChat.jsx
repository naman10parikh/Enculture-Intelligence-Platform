import React, { useState, useRef, useEffect } from 'react'
import { Send, BarChart, Users, MessageSquare, PanelLeft, Plus, Search, History } from 'lucide-react'

const chatThreads = [
  { id: 1, name: 'General Chat', active: true },
  { id: 2, name: 'Weekly Pulse', active: false },
  { id: 3, name: 'Team Feedback', active: false }
]

const initialMessages = [
  {
    id: 1,
    type: 'ai',
    content: 'Hi! I\'m your Culture Intelligence Assistant. I\'m here to help you navigate and improve your workplace culture. Try using commands like /survey, /pulse, or /insights to get started!',
    timestamp: new Date()
  }
]

const suggestedActions = [
  { icon: BarChart, label: 'Create Survey', command: '/survey' },
  { icon: Users, label: 'Team Pulse', command: '/pulse' },
  { icon: MessageSquare, label: 'Culture Insights', command: '/insights' }
]

function AIChat() {
  const [messages, setMessages] = useState(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [threads, setThreads] = useState(chatThreads)
  const [showSurvey, setShowSurvey] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [canvasOpen, setCanvasOpen] = useState(false)
  const [canvasView, setCanvasView] = useState('survey')
  const [activeSurveyId, setActiveSurveyId] = useState(null)
  const [surveyDraft, setSurveyDraft] = useState({
    title: 'New Culture Survey',
    questions: [
      { id: 'q1', type: 'radio', text: 'How engaged do you feel this week?', options: ['Low', 'Medium', 'High'], required: true },
      { id: 'q2', type: 'text', text: 'What is one thing that would improve your week?', required: false }
    ],
    theme: 'light',
    logic: {}
  })
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Keyboard shortcut: Ctrl + \\ to toggle canvas
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault()
        setCanvasOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // API layer stubs
  const fetchSurvey = async (surveyId) => {
    await new Promise(r => setTimeout(r, 300))
    return { id: surveyId, ...surveyDraft }
  }

  const saveSurveyDraft = async (draft) => {
    await new Promise(r => setTimeout(r, 300))
    return { ok: true, draft }
  }

  const submitSurveyResponses = async (surveyId, responses) => {
    await new Promise(r => setTimeout(r, 400))
    return { ok: true, surveyId, responses }
  }

  // Canvas control helpers
  const openCanvasForSurvey = async (surveyId = 'draft') => {
    setActiveSurveyId(surveyId)
    setCanvasView('survey')
    setCanvasOpen(true)
    if (surveyId && surveyId !== 'draft') {
      const data = await fetchSurvey(surveyId)
      setSurveyDraft(prev => ({ ...prev, ...data }))
    }
  }
  const closeCanvas = () => setCanvasOpen(false)
  const flipCanvasView = () => setCanvasView(prev => (prev === 'survey' ? 'settings' : 'survey'))

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const newMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    setIsTyping(true)

    // Handle commands
    if (inputValue.startsWith('/survey')) {
      setTimeout(() => {
        openCanvasForSurvey('draft')
        setIsTyping(false)
      }, 500)
      return
    }

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: 'ai',
        content: getAIResponse(inputValue),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsTyping(false)
    }, 1500)
  }

  const getAIResponse = (input) => {
    const responses = [
      "That's a great question about workplace culture! Based on recent patterns, I've noticed some interesting trends in team collaboration.",
      "I can help you analyze that further. Would you like me to create a quick survey to gather more insights from your team?",
      "Culture intelligence suggests that this topic might benefit from a deeper dive. Let me suggest some actions you could take.",
      "Based on similar organizations, here are some strategies that have proven effective for improving team dynamics."
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  const handleSuggestionClick = (command) => {
    if (command === '/survey') {
      openCanvasForSurvey('draft')
      return
    }
    setInputValue(command)
  }

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded)
  }

  const createNewThread = () => {
    const newThread = {
      id: threads.length + 1,
      name: `Chat ${threads.length + 1}`,
      active: false
    }
    setThreads(prev => [...prev, newThread])
  }

  const switchThread = (threadId) => {
    setThreads(prev =>
      prev.map(thread => ({
        ...thread,
        active: thread.id === threadId
      }))
    )
  }

  return (
    <div className={`chat-container ${canvasOpen ? 'canvas-open' : ''} ${sidebarExpanded ? 'panel-open' : ''}`}>
      <div className="chat-content">
        <aside className={`chat-panel ${sidebarExpanded ? 'expanded' : 'collapsed'}`}>
          <button className="panel-header" onClick={toggleSidebar} aria-label="Toggle panel">
            <PanelLeft size={18} />
          </button>

          <div className="panel-content">
            <button className="enable-survey-btn" onClick={() => openCanvasForSurvey('draft')}>
              Enable Survey Mode
            </button>

            <nav className="panel-nav">
              <button className="panel-item">
                <Plus size={16} />
                <span>New chat</span>
              </button>
              <button className="panel-item">
                <Search size={16} />
                <span>Search chats</span>
              </button>
              <button className="panel-item">
                <History size={16} />
                <span>Chat history</span>
              </button>
            </nav>
            <div className="panel-spacer"></div>
            <div className="history-list">
              <div className="history-item">Team Pulse – Feb 10</div>
              <div className="history-item">Career Growth Questions</div>
              <div className="history-item">Culture Health Check</div>
              <div className="history-item">Onboarding Feedback</div>
            </div>
          </div>
        </aside>

        <div className="chat-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}-message`}>
              <div className="message-bubble glass-bubble">
                <p>{message.content}</p>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message ai-message">
              <div className="message-bubble glass-bubble typing">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-suggestions">
            {suggestedActions.map((action, index) => (
              <button
                key={index}
                className="suggestion-card glass-card"
                onClick={() => handleSuggestionClick(action.command)}
              >
                <action.icon size={20} />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
          <div className="input-wrapper glass-input">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about culture, create surveys, or use / commands..."
              className="chat-input"
            />
            <button 
              className="send-btn gradient-btn"
              onClick={handleSend}
              disabled={!inputValue.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className={`canvas-pane ${canvasOpen ? 'open' : ''}`}>
        <div className="canvas-header">
          <div className="canvas-title">
            <span className="title-text">{surveyDraft.title || 'Untitled Survey'}</span>
            <span className={`status-dot ${canvasView}`}></span>
          </div>
          <div className="canvas-controls">
            <button className={`flip-btn ${canvasView === 'survey' ? 'active' : ''}`} onClick={() => setCanvasView(canvasView === 'survey' ? 'settings' : 'survey')}>
              {canvasView === 'survey' ? 'Settings' : 'Survey'}
            </button>
            <button className="save-btn" onClick={async () => { await saveSurveyDraft(surveyDraft) }}>
              Save
            </button>
            <button className="close-btn" onClick={() => setCanvasOpen(false)}>×</button>
          </div>
        </div>
        <div className="canvas-body">
          {canvasView === 'survey' ? (
            <div className="survey-view">
              {surveyDraft.questions.map(q => (
                <div key={q.id} className="survey-question">
                  <label className="q-label">{q.text}{q.required ? ' *' : ''}</label>
                  {q.type === 'radio' && (
                    <div className="q-options">
                      {q.options.map(opt => (
                        <label key={opt} className="q-option">
                          <input type="radio" name={q.id} />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === 'text' && (
                    <textarea className="q-text" rows="3" placeholder="Type your answer..." />
                  )}
                </div>
              ))}
              <div className="survey-actions">
                <button className="btn-ghost" onClick={() => setCanvasView('settings')}>Preview</button>
                <button className="btn-primary" onClick={async () => { await submitSurveyResponses(activeSurveyId || 'draft', {}) }}>Submit</button>
              </div>
            </div>
          ) : (
            <div className="settings-view">
              <div className="form-field">
                <label>Survey Title</label>
                <input 
                  type="text" 
                  className="survey-input" 
                  value={surveyDraft.title}
                  onChange={e => setSurveyDraft(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Theme</label>
                <select 
                  className="survey-input" 
                  value={surveyDraft.theme}
                  onChange={e => setSurveyDraft(prev => ({ ...prev, theme: e.target.value }))}
                >
                  <option value="light">Light</option>
                  <option value="frosted">Frosted</option>
                </select>
              </div>
              <div className="form-field">
                <label>Logic (JSON)</label>
                <textarea 
                  className="survey-input" rows="6"
                  value={JSON.stringify(surveyDraft.logic, null, 2)}
                  onChange={e => {
                    try {
                      const val = JSON.parse(e.target.value || '{}')
                      setSurveyDraft(prev => ({ ...prev, logic: val }))
                    } catch {}
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: linear-gradient(135deg, #f3eeff 0%, #f5f1ff 20%, #f7f4ff 40%, #f9f7ff 60%, #fcfbff 80%, #ffffff 100%);
          margin: calc(-1 * var(--space-6));
          padding: var(--space-6);
          gap: var(--space-6);
        }
        
        .chat-content {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }



         .chat-hero {
           margin-bottom: var(--space-6);
         }

        .chat-hero .hero-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--space-6);
        }

        .chat-hero .hero-text h2 {
          color: white;
          font-size: var(--text-3xl);
          font-weight: 700;
          margin: 0 0 var(--space-3) 0;
        }

        .chat-hero .hero-text p {
          color: rgba(255, 255, 255, 0.8);
          font-size: var(--text-lg);
          margin: 0 0 var(--space-4) 0;
          max-width: 400px;
        }

        .hero-stats {
          display: flex;
          gap: var(--space-8);
          flex-wrap: wrap;
        }

        .hero-stat {
          text-align: center;
          min-width: 80px;
        }

        .stat-number {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: white;
          margin-bottom: var(--space-1);
        }

        .stat-label {
          font-size: var(--text-sm);
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }


        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 120px 0 120px 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .canvas-open .chat-messages { margin-right: 460px; }

        .message {
          display: flex;
          gap: var(--space-3);
          animation: fadeInUp 0.4s ease-out;
        }

        .user-message {
          flex-direction: row-reverse;
        }

        .message-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--gradient-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--blue-soft);
          flex-shrink: 0;
        }

         .message-bubble {
           max-width: 70%;
           padding: var(--space-4) var(--space-5);
           position: relative;
           border-radius: var(--radius-lg);
         }

         .ai-message .message-bubble {
           background: transparent;
           border: none;
           padding: var(--space-2) 0;
         }

         .user-message .message-bubble {
           background: rgba(255, 255, 255, 0.6);
           color: var(--text-primary);
           border: 1px solid rgba(255, 255, 255, 0.4);
         }

         .message-time {
           font-size: var(--text-xs);
           color: var(--text-tertiary);
           display: block;
           margin-top: var(--space-2);
         }

         .user-message .message-time {
           color: var(--text-secondary);
         }

         .typing-indicator {
           display: flex;
           gap: 4px;
           align-items: center;
         }

         .typing-indicator span {
           width: 8px;
           height: 8px;
           border-radius: 50%;
           background: var(--text-tertiary);
           animation: typing 1.4s infinite ease-in-out;
         }

         .typing-indicator span:nth-child(2) {
           animation-delay: 0.2s;
         }

         .typing-indicator span:nth-child(3) {
           animation-delay: 0.4s;
         }

         @keyframes typing {
           0%, 60%, 100% {
             transform: translateY(0);
             opacity: 0.5;
           }
           30% {
             transform: translateY(-10px);
             opacity: 1;
           }
         }

         .canvas-pane {
           position: fixed;
           top: var(--space-6);
           right: var(--space-4);
           bottom: var(--space-4);
           width: 0;
           overflow: hidden;
           background: rgba(255, 255, 255, 0.75);
           backdrop-filter: blur(18px);
           -webkit-backdrop-filter: blur(18px);
           border: 1px solid rgba(226, 232, 240, 0.5);
           border-radius: 16px;
           box-shadow: 0 12px 40px rgba(0,0,0,0.08);
           transition: width 0.3s ease;
           display: flex;
           flex-direction: column;
         }
         .canvas-pane.open { width: 420px; }
         .canvas-header {
           display: flex;
           align-items: center;
           justify-content: space-between;
           padding: var(--space-4) var(--space-4) var(--space-3) var(--space-4);
           border-bottom: 1px solid rgba(226,232,240,0.5);
         }
         .canvas-title { display: flex; align-items: center; gap: var(--space-2); }
         .title-text { font-weight: 600; color: var(--text-primary); }
         .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }
         .status-dot.survey { background: #cbd5e1; }
         .status-dot.settings { background: #b19cd9; }
         .canvas-controls { display: flex; align-items: center; gap: var(--space-2); }
         .flip-btn { border: 1px solid rgba(139,92,246,0.25); background: rgba(248,250,252,0.6); border-radius: 10px; padding: 8px 12px; cursor: pointer; }
         .flip-btn.active { border-color: rgba(139,92,246,0.5); }
         .save-btn { border: 1px solid rgba(226,232,240,0.8); background: white; border-radius: 10px; padding: 8px 12px; cursor: pointer; }
         .close-btn { border: none; background: transparent; font-size: 20px; color: var(--text-secondary); cursor: pointer; padding: 6px 8px; border-radius: 8px; }
         .close-btn:hover { background: rgba(226,232,240,0.5); }
         .canvas-body { padding: var(--space-4); overflow-y: auto; }
         .survey-question { margin-bottom: var(--space-4); }
         .q-label { display: block; font-weight: 500; color: var(--text-primary); margin-bottom: var(--space-2); }
         .q-options { display: flex; flex-direction: column; gap: 8px; }
         .q-option { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); }
         .q-text { width: 100%; padding: var(--space-3); border: 1px solid rgba(226,232,240,0.8); border-radius: 12px; background: rgba(255,255,255,0.8); }
         .survey-actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-6); }
         .settings-view .form-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: var(--space-4); }

         .canvas-open .chat-input-area { right: 460px; }
         @media (max-width: 1024px) {
           .canvas-pane.open { width: 92vw; right: var(--space-2); left: var(--space-2); }
           .canvas-open .chat-input-area { right: var(--space-4); }
         }

         .chat-panel {
           position: fixed;
           top: var(--space-4);
           left: 320px;
           height: calc(100vh - var(--space-8));
           z-index: 1000;
           background: rgba(255, 255, 255, 0.9);
           backdrop-filter: blur(16px);
           border: 1px solid rgba(226,232,240,0.5);
           border-radius: 16px;
           box-shadow: 0 8px 32px rgba(0,0,0,0.08);
           overflow: hidden;
           display: flex;
           flex-direction: column;
           transition: width 0.25s ease;
         }
         .chat-panel.collapsed { width: 44px; background: transparent; border-color: transparent; box-shadow: none; }
         .chat-panel.expanded { width: 260px; }
         .panel-header {
           display: flex; align-items: center; justify-content: center;
           width: 44px; height: 44px;
           cursor: pointer; color: var(--text-secondary);
           background: rgba(255,255,255,0.9);
           border: 1px solid rgba(226,232,240,0.6);
           border-radius: 12px;
           box-shadow: 0 4px 12px rgba(0,0,0,0.08);
         }
         .chat-panel.expanded .panel-header {
           width: auto;
           align-self: flex-end;
           margin: var(--space-2);
           border-radius: 10px;
           border: 1px solid rgba(226,232,240,0.6);
           box-shadow: 0 4px 12px rgba(0,0,0,0.06);
         }
         .panel-content {
           padding: var(--space-3);
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
           height: calc(100% - 48px);
         }
         .panel-nav { display: flex; flex-direction: column; gap: 6px; }
         .panel-item {
           display: flex; align-items: center; gap: 10px;
           padding: 10px 12px; border-radius: 10px;
           border: 1px solid rgba(226,232,240,0.6);
           background: rgba(248,250,252,0.6);
           color: var(--text-primary);
           cursor: pointer;
           transition: all 0.2s ease;
         }
         .panel-item:hover { border-color: rgba(139,92,246,0.35); background: rgba(139,92,246,0.06); }
         .chat-panel.collapsed .panel-content { display: none; }
         .panel-spacer { flex: 1 1 auto; }
         .history-list { margin-top: var(--space-2); display: flex; flex-direction: column; gap: 6px; }
         .history-item { padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(226,232,240,0.6); background: rgba(248,250,252,0.6); color: var(--text-secondary); }

         /* Shift chat content when panel open; no overlap */
         .panel-open .chat-input-area { left: calc(320px + 260px + var(--space-4)); }
         .panel-open .chat-messages { margin-left: 260px; }
         .chat-container:not(.panel-open) .chat-messages { margin-left: 0; }

         .enable-survey-btn {
           background: #301934;
           color: white;
           border: none;
           padding: var(--space-3) var(--space-4);
           border-radius: 12px;
           font-weight: 500;
           cursor: pointer;
           transition: all 0.2s ease;
           box-shadow: 0 4px 12px rgba(48, 25, 52, 0.3);
           margin-bottom: var(--space-2);
         }

         .enable-survey-btn:hover {
           background: #392A48;
           transform: translateY(-1px);
         }

         .sidebar-section {
           display: flex;
           flex-direction: column;
           gap: var(--space-2);
         }

         .sidebar-feature-btn {
           background: transparent;
           border: 1px solid rgba(139, 92, 246, 0.2);
           padding: var(--space-3);
           border-radius: 12px;
           cursor: pointer;
           transition: all 0.2s ease;
           display: flex;
           align-items: center;
           gap: var(--space-2);
           color: var(--text-primary);
           font-weight: 500;
         }

         .sidebar-feature-btn:hover {
           background: rgba(139, 92, 246, 0.1);
           border-color: rgba(139, 92, 246, 0.3);
           transform: translateY(-1px);
         }

         .feature-icon {
           font-size: 16px;
           width: 20px;
           text-align: center;
         }

         @keyframes slideIn {
           from {
             opacity: 0;
             transform: translateY(-10px);
           }
           to {
             opacity: 1;
             transform: translateY(0);
           }
         }

         .chat-suggestions {
           display: flex;
           gap: var(--space-3);
           flex-wrap: wrap;
           justify-content: center;
           margin-bottom: var(--space-2);
         }

         .suggestion-card {
           display: flex;
           align-items: center;
           gap: var(--space-2);
           padding: var(--space-3) var(--space-4);
           border: 1px solid var(--border-soft);
           background: var(--surface-secondary);
           border-radius: var(--radius-lg);
           color: var(--text-secondary);
           cursor: pointer;
           transition: all var(--transition-base);
           font-weight: 500;
         }

         .suggestion-card:hover {
           border: 1px solid rgba(139, 92, 246, 0.3);
         }

         @keyframes fadeInUp {
           from {
             opacity: 0;
             transform: translateY(20px);
           }
           to {
             opacity: 1;
             transform: translateY(0);
           }
         }

        .message-bubble p {
          margin: 0 0 var(--space-2) 0;
          line-height: 1.5;
        }

        .message-time {
          font-size: var(--text-xs);
          opacity: 0.7;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--blue-soft);
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          } 40% {
            transform: scale(1);
          }
        }

        .chat-suggestions {
          display: flex;
          gap: var(--space-3);
          padding: 0 var(--space-4);
          overflow-x: auto;
        }

        .suggestion-card {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border: none;
          cursor: pointer;
          white-space: nowrap;
          color: var(--text-secondary);
          transition: all var(--transition-base);
          min-width: fit-content;
          background: var(--gradient-card);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border-radius: var(--radius-lg);
        }

        .suggestion-card:hover {
          border: 1px solid rgba(139, 92, 246, 0.3);
        }

         .chat-input-area {
           position: fixed;
           bottom: var(--space-4);
           left: 320px;
           right: var(--space-4);
           padding: 0;
           z-index: 10;
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
         }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }

        .chat-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: var(--text-base);
          color: var(--text-primary);
          outline: none;
          padding: var(--space-2) 0;
        }

        .chat-input::placeholder {
          color: var(--text-tertiary);
        }

        .send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {

          .message-bubble {
            max-width: 90%;
          }

          .chat-suggestions {
            padding: 0 var(--space-2);
          }
        }
      `}</style>
    </div>
  )
}

function SurveyModal({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [surveyData, setSurveyData] = useState({
    title: '',
    questions: []
  })

  const surveySteps = [
    'Survey Title',
    'Question Type',
    'Question Content',
    'Review & Send'
  ]

  return (
    <div className="modal-overlay">
      <div className="survey-modal glass-card">
        <div className="survey-header">
          <h3>Create Culture Survey</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="survey-progress">
          {surveySteps.map((step, index) => (
            <div key={index} className={`progress-step ${index <= currentStep ? 'active' : ''}`}>
              <span className="step-number">{index + 1}</span>
              <span className="step-label">{step}</span>
            </div>
          ))}
        </div>

        <div className="survey-content">
          <p>🎯 Let's create a quick culture pulse survey! I'll guide you through each step.</p>
          <div className="survey-form">
            <input 
              type="text" 
              placeholder="Enter survey title..."
              className="survey-input"
            />
            <div className="form-actions">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary">Next Step</button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .survey-modal {
            width: 600px;
            max-width: 90vw;
            padding: var(--space-8);
            position: relative;
          }

          .survey-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-6);
          }

          .survey-header h3 {
            font-size: var(--text-xl);
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
          }

          .close-btn {
            width: 32px;
            height: 32px;
            border: none;
            background: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }

          .close-btn:hover {
            background: var(--surface-secondary);
          }

          .survey-progress {
            display: flex;
            justify-content: space-between;
            margin-bottom: var(--space-8);
            position: relative;
          }

          .survey-progress::before {
            content: '';
            position: absolute;
            top: 16px;
            left: 16px;
            right: 16px;
            height: 2px;
            background: var(--surface-secondary);
            z-index: 0;
          }

          .progress-step {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-2);
            position: relative;
            z-index: 1;
          }

          .step-number {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--surface-secondary);
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 500;
            font-size: var(--text-sm);
          }

          .progress-step.active .step-number {
            background: var(--blue-soft);
            color: white;
          }

          .step-label {
            font-size: var(--text-xs);
            color: var(--text-secondary);
            text-align: center;
          }

          .progress-step.active .step-label {
            color: var(--text-primary);
            font-weight: 500;
          }

          .survey-content {
            margin-bottom: var(--space-6);
          }

          .survey-content p {
            margin-bottom: var(--space-6);
            color: var(--text-secondary);
            text-align: center;
          }

          .survey-form {
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
          }

          .survey-input {
            padding: var(--space-4);
            border: var(--border-soft);
            border-radius: var(--radius-md);
            font-size: var(--text-base);
            background: var(--surface-primary);
            transition: all var(--transition-base);
          }

          .survey-input:focus {
            outline: none;
            border-color: var(--blue-soft);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: var(--space-3);
          }
        `}</style>
      </div>
    </div>
  )
}

export default AIChat
