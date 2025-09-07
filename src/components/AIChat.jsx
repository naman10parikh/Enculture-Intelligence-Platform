import React, { useState, useRef, useEffect } from 'react'
import { Send, BarChart, Users, MessageSquare, PanelLeft, Plus, Search, History, X, Copy, Edit3, RotateCcw, Check, ThumbsUp, Settings, Eye, FileText, Palette, Type, List, Grid, Sliders } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'  // Add syntax highlighting CSS
import { chatService } from '../services/api'
import { chatThreadsApi } from '../services/chatThreadsApi'

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
  const [canvasView, setCanvasView] = useState('editor')
  const [canvasMode, setCanvasMode] = useState('split') // 'split', 'focus', 'chat-only'
  const [canvasWidth, setCanvasWidth] = useState(500) // Resizable canvas width
  const [isDragging, setIsDragging] = useState(false)
  const [activeSurveyId, setActiveSurveyId] = useState(null)
  const [backendConnected, setBackendConnected] = useState(false)
  const [currentPersona, setCurrentPersona] = useState('employee') // Default persona
  const [surveyDraft, setSurveyDraft] = useState({
    title: 'Culture Intelligence Survey',
    description: 'Understanding team dynamics and workplace culture',
    questions: [
      { id: 'q1', type: 'multiple_choice', text: 'How would you rate your overall job satisfaction?', options: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'], required: true },
      { id: 'q2', type: 'scale', text: 'On a scale of 1-10, how likely are you to recommend this company as a great place to work?', min: 1, max: 10, required: true },
      { id: 'q3', type: 'text', text: 'What aspects of our company culture do you value most?', placeholder: 'Share your thoughts...', required: false },
      { id: 'q4', type: 'multiple_select', text: 'Which areas would you like to see improved? (Select all that apply)', options: ['Communication', 'Recognition', 'Work-life balance', 'Career development', 'Team collaboration', 'Leadership'], required: false }
    ],
    theme: 'modern',
    branding: {
      primaryColor: '#8B5CF6',
      backgroundColor: '#FAFBFF',
      fontFamily: 'Inter'
    },
    settings: {
      anonymous: true,
      deadline: null,
      targetAudience: 'All employees'
    },
    classifiers: [
      { id: 'dept', name: 'Department', values: ['Engineering', 'Sales', 'Marketing', 'HR', 'Operations'] },
      { id: 'level', name: 'Job Level', values: ['Individual Contributor', 'Senior', 'Lead', 'Manager', 'Director'] },
      { id: 'tenure', name: 'Tenure', values: ['0-1 years', '1-3 years', '3-5 years', '5+ years'] }
    ],
    metrics: [
      { id: 'engagement_score', name: 'Engagement Score', formula: 'avg(q1,q2)', description: 'Average of satisfaction and likelihood to recommend' },
      { id: 'culture_health', name: 'Culture Health Index', formula: 'weighted_avg(q1:0.4,q3:0.6)', description: 'Weighted average focusing on culture aspects' }
    ]
  })
  
  // Chat thread management state
  const [currentThreadId, setCurrentThreadId] = useState(null)
  const [recentThreads, setRecentThreads] = useState([])
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editText, setEditText] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState(null)
  const [likedMessages, setLikedMessages] = useState(new Set())
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const dragRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }, [inputValue])

  // Canvas resize handling
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      
      const newWidth = window.innerWidth - e.clientX - 16 // 16px margin
      const minWidth = 300
      const maxWidth = window.innerWidth * 0.7
      
      setCanvasWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleDragStart = () => {
    setIsDragging(true)
  }

  // Check backend connection on mount
  useEffect(() => {
    checkBackendConnection()
  }, [])

  // Initialize chat threads on mount
  useEffect(() => {
    const initializeThreads = async () => {
      await loadRecentThreads()
      
      // Create a new thread if none exists
      if (!currentThreadId) {
        await createNewThread()
      }
    }
    
    initializeThreads()
  }, [])

  // Keyboard shortcuts for Canvas
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault()
        setCanvasOpen(prev => !prev)
      }
      if (canvasOpen && e.key === 'Escape') {
        e.preventDefault()
        setCanvasOpen(false)
      }
      if (canvasOpen && e.ctrlKey && e.key === '1') {
        e.preventDefault()
        setCanvasView('editor')
      }
      if (canvasOpen && e.ctrlKey && e.key === '2') {
        e.preventDefault()
        setCanvasView('preview')
      }
      if (canvasOpen && e.ctrlKey && e.key === '3') {
        e.preventDefault()
        setCanvasView('settings')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [canvasOpen])

  const checkBackendConnection = async () => {
    try {
      const isHealthy = await chatService.checkHealth()
      setBackendConnected(isHealthy)
    } catch (error) {
      console.error('Backend connection check failed:', error)
      setBackendConnected(false)
    }
  }

  const getCurrentPersona = () => {
    // This would be set by a persona switching component
    // For now, return default or from localStorage
    return localStorage.getItem('userPersona') || currentPersona
  }

  // API layer stubs for canvas functionality
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
    setCanvasView('editor')  // Start in editor mode
    setCanvasMode('split')   // Default to split mode
    setCanvasOpen(true)
    if (surveyId && surveyId !== 'draft') {
      const data = await fetchSurvey(surveyId)
      setSurveyDraft(prev => ({ ...prev, ...data }))
    }
  }
  const closeCanvas = () => setCanvasOpen(false)
  const flipCanvasView = () => setCanvasView(prev => (prev === 'survey' ? 'settings' : 'survey'))

  // Chat thread management functions
  const loadRecentThreads = async () => {
    try {
      setThreadsLoading(true)
      const threads = await chatThreadsApi.getRecentThreads(10)
      setRecentThreads(threads)
    } catch (error) {
      console.error('Failed to load recent threads:', error)
    } finally {
      setThreadsLoading(false)
    }
  }

  const createNewThread = async () => {
    try {
      // Check if there's already an empty chat (no messages)
      const hasEmptyChat = recentThreads.some(thread => 
        (thread.message_count === 0 || !thread.message_count) && 
        (!thread.title || thread.title === 'New Chat')
      )
      
      // If there's already an empty chat, just switch to it instead of creating a new one
      if (hasEmptyChat) {
        const emptyChat = recentThreads.find(thread => 
          (thread.message_count === 0 || !thread.message_count) && 
          (!thread.title || thread.title === 'New Chat')
        )
        if (emptyChat) {
          await switchToThread(emptyChat.id)
          return
        }
      }
      
      // Only create a new thread if no empty chat exists
      const newThread = await chatThreadsApi.createThread()
      setCurrentThreadId(newThread.id)
      setMessages([]) // Clear current messages
      await loadRecentThreads() // Refresh the list
    } catch (error) {
      console.error('Failed to create new thread:', error)
    }
  }

  const switchToThread = async (threadId) => {
    try {
      const thread = await chatThreadsApi.getThread(threadId)
      setCurrentThreadId(threadId)
      
      // Convert thread messages to component format
      const formattedMessages = thread.messages.map(msg => ({
        id: msg.id,
        type: msg.role === 'user' ? 'user' : 'ai',
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }))
      
      setMessages(formattedMessages)
    } catch (error) {
      console.error('Failed to switch to thread:', error)
    }
  }

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    try {
      setIsSearching(true)
      
      // Use backend search that already searches through all content
      const results = await chatThreadsApi.searchThreads(query, 20)
      
      // For each result, get the thread details to show relevant snippets
      const enhancedResults = await Promise.all(
        results.map(async (thread) => {
          try {
            const fullThread = await chatThreadsApi.getThread(thread.id)
            
            // Find the first message that contains the search query
            const matchingMessage = fullThread.messages.find(msg => 
              msg.content.toLowerCase().includes(query.toLowerCase())
            )
            
            return {
              ...thread,
              lastMessage: matchingMessage 
                ? `${matchingMessage.content.substring(0, 80)}...`
                : thread.title,
              isContentMatch: !!matchingMessage
            }
          } catch (error) {
            console.error(`Failed to fetch thread ${thread.id}:`, error)
            return thread
          }
        })
      )
      
      setSearchResults(enhancedResults)
    } catch (error) {
      console.error('Failed to search threads:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const deleteThread = async (threadId) => {
    try {
      await chatThreadsApi.deleteThread(threadId)
      
      // If deleting current thread, create a new one
      if (threadId === currentThreadId) {
        await createNewThread()
      }
      
      await loadRecentThreads()
    } catch (error) {
      console.error('Failed to delete thread:', error)
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim()) return

    // Ensure we have a current thread
    if (!currentThreadId) {
      await createNewThread()
      return // Will be called again after thread is created
    }

    const currentInput = inputValue
    setInputValue('')

    // Handle special commands
    if (currentInput.startsWith('/survey')) {
      // Extract description from command
      const description = currentInput.replace('/survey', '').trim()
      
      openCanvasForSurvey('draft')
      
      // If there's a description, generate AI template
      if (description) {
        setTimeout(() => {
          generateSurveyFromAI(description)
        }, 800)
      }
      
      return
    }

    try {
      if (backendConnected) {
        // Add user message to UI immediately
        const userMessage = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: currentInput,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, userMessage])

        // Add empty AI message to start streaming into
        const aiMessageId = `ai-${Date.now()}`
        const aiMessage = {
          id: aiMessageId,
          type: 'ai',
          content: '',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        setIsTyping(true)

        // Stream response from backend with thread persistence
        let fullResponse = ''
        let titleUpdated = false
        
        await chatThreadsApi.streamChatWithThread(
          currentThreadId,
          currentInput,
          (data) => {
            if (data.content) {
              // Clean and normalize the content chunk - comprehensive unicode cleanup
              const cleanChunk = data.content
                // Handle escaped unicode sequences
                .replace(/\\u2019/g, "'").replace(/\\u2018/g, "'")   // Single quotes
                .replace(/\\u201c/g, '"').replace(/\\u201d/g, '"')   // Double quotes
                .replace(/\\u2013/g, '–').replace(/\\u2014/g, '—')   // Dashes
                .replace(/\\u2026/g, '...').replace(/\\u00a0/g, ' ') // Ellipsis, space
                .replace(/\\u2192/g, '→').replace(/\\u2190/g, '←')   // Arrows
                // Handle actual unicode characters
                .replace(/[\u2018\u2019]/g, "'")   // Smart single quotes
                .replace(/[\u201c\u201d]/g, '"')   // Smart double quotes  
                .replace(/[\u2013\u2014]/g, '–')   // En/em dashes
                .replace(/\u2026/g, '...')         // Ellipsis
                .replace(/\u00a0/g, ' ')           // Non-breaking space
                .replace(/[\u2190\u2192]/g, '→')   // Arrows
              
              fullResponse += cleanChunk
              
              // Stop typing animation on first content chunk
              if (isTyping) {
                setIsTyping(false)
              }
              
              // Update the AI message with streamed content
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, content: fullResponse }
                    : msg
                )
              )
            }
            
            if (data.title_updated && !titleUpdated) {
              titleUpdated = true
              // Refresh the threads list to show new title
              loadRecentThreads()
            }
            
            if (data.done) {
              setIsTyping(false)
            }
            
            if (data.error) {
              console.error('Streaming error:', data.error)
              setIsTyping(false)
            }
          }
        )
      } else {
        // Fallback to mock responses if backend is not available
        const userMessage = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: currentInput,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, userMessage])
        setIsTyping(true)

        setTimeout(() => {
          const aiResponse = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: getFallbackResponse(currentInput),
            timestamp: new Date()
          }
          setMessages(prev => [...prev, aiResponse])
          setIsTyping(false)
        }, 1500)
      }

    } catch (error) {
      console.error('Chat error:', error)
      
      // Add error message
      const errorMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        content: '⚠️ I\'m having trouble connecting to my AI backend. Please check that the backend server is running on http://localhost:8000 and try again.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
      setIsTyping(false)
    }
  }

  const getFallbackResponse = (input) => {
    const responses = [
      "That's a great question about workplace culture! I'd love to help you with more detailed insights, but I need my backend connection to provide the best analysis.",
      "I can help you analyze that further with real-time data once my backend is connected. For now, I suggest checking team communication patterns.",
      "Culture intelligence suggests this topic would benefit from deeper analysis. Please ensure the backend server is running for personalized recommendations.",
      "This is an interesting area! To provide data-driven insights specific to your organization, I need access to my AI backend services."
    ]
    return responses[Math.floor(Math.random() * responses.length)]
  }

  // Custom markdown components for better rendering
  const markdownComponents = {
    h1: ({children, ...props}) => (
      <h1 style={{
        fontSize: '1.4em', 
        fontWeight: '600', 
        margin: '1.2em 0 0.6em 0', 
        color: 'var(--text-primary)',
        lineHeight: '1.3'
      }} {...props}>
        {children}
      </h1>
    ),
    h2: ({children, ...props}) => (
      <h2 style={{
        fontSize: '1.25em', 
        fontWeight: '600', 
        margin: '1em 0 0.5em 0', 
        color: 'var(--text-primary)',
        lineHeight: '1.3'
      }} {...props}>
        {children}
      </h2>
    ),
    h3: ({children, ...props}) => (
      <h3 style={{
        fontSize: '1.1em', 
        fontWeight: '600', 
        margin: '0.8em 0 0.4em 0', 
        color: 'var(--text-primary)',
        lineHeight: '1.3'
      }} {...props}>
        {children}
      </h3>
    ),
    p: ({children, ...props}) => (
      <p style={{
        margin: '0 0 0.8em 0', 
        lineHeight: '1.6',
        color: 'var(--text-primary)'
      }} {...props}>
        {children}
      </p>
    ),
    ul: ({children, ...props}) => (
      <ul style={{
        margin: '0.5em 0', 
        paddingLeft: '1.5em',
        listStyleType: 'disc'
      }} {...props}>
        {children}
      </ul>
    ),
    ol: ({children, ...props}) => (
      <ol style={{
        margin: '0.5em 0', 
        paddingLeft: '1.5em',
        listStyleType: 'decimal'
      }} {...props}>
        {children}
      </ol>
    ),
    li: ({children, ...props}) => (
      <li style={{
        margin: '0.25em 0',
        lineHeight: '1.5'
      }} {...props}>
        {children}
      </li>
    ),
    code: ({children, className, inline, ...props}) => {
      if (!inline && className && className.startsWith('language-')) {
        return (
          <pre style={{
            background: 'rgba(248, 250, 252, 0.9)',
            border: '1px solid rgba(226, 232, 240, 0.6)',
            borderRadius: '8px',
            padding: '1em',
            overflowX: 'auto',
            margin: '1em 0',
            fontSize: '0.9em'
          }} {...props}>
            <code className={className}>{children}</code>
          </pre>
        );
      }
      return (
        <code style={{
          background: 'rgba(139, 92, 246, 0.1)',
          padding: '0.15em 0.3em',
          borderRadius: '3px',
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          fontSize: '0.9em',
          color: 'rgba(139, 92, 246, 0.9)'
        }} {...props}>
          {children}
        </code>
      );
    },
    pre: ({children, ...props}) => (
      <div {...props}>{children}</div>
    ),
    blockquote: ({children, ...props}) => (
      <blockquote style={{
        borderLeft: '3px solid rgba(139, 92, 246, 0.3)',
        paddingLeft: '1em',
        margin: '1em 0',
        fontStyle: 'italic',
        color: 'var(--text-secondary)',
        background: 'rgba(139, 92, 246, 0.05)',
        borderRadius: '0 4px 4px 0'
      }} {...props}>
        {children}
      </blockquote>
    ),
    a: ({children, href, ...props}) => (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer" 
        style={{
          color: 'rgba(139, 92, 246, 0.8)',
          textDecoration: 'underline',
          textDecorationThickness: '1px',
          textUnderlineOffset: '2px'
        }} 
        {...props}
      >
        {children}
      </a>
    ),
    strong: ({children, ...props}) => (
      <strong style={{
        fontWeight: '600',
        color: 'var(--text-primary)'
      }} {...props}>
        {children}
      </strong>
    ),
    em: ({children, ...props}) => (
      <em style={{
        fontStyle: 'italic',
        color: 'var(--text-primary)'
      }} {...props}>
        {children}
      </em>
    )
  };

  // Function to parse and extract citations from AI responses
  const parseCitations = (content) => {
    if (!content) return { cleanContent: content, citations: [] };

    // Regex patterns to detect common citation formats
    const urlPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const sourcePattern = /\*\*Sources?:\*\*[\s\S]*$/i;
    
    const citations = [];
    let cleanContent = content;

    // Extract markdown links as citations
    let match;
    while ((match = urlPattern.exec(content)) !== null) {
      citations.push({
        title: match[1],
        url: match[2],
        type: 'link'
      });
    }

    // Remove "Sources:" section if it exists
    const sourcesMatch = sourcePattern.exec(content);
    if (sourcesMatch) {
      cleanContent = content.substring(0, sourcesMatch.index).trim();
    }

    return { cleanContent, citations };
  }

  const handleSuggestionClick = (command) => {
    if (command === '/survey') {
      openCanvasForSurvey('draft')
      return
    }
    setInputValue(command)
  }

  // Message action handlers
  const handleCopyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(content.substring(0, 20)) // Use content snippet as ID
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy message:', error)
    }
  }

  const handleEditMessage = (messageId, content) => {
    setEditingMessageId(messageId)
    setEditText(content)
  }

  const handleSaveEdit = async (messageId) => {
    if (!editText.trim()) return

    // Update the message content
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: editText.trim() }
          : msg
      )
    )
    
    setEditingMessageId(null)
    setEditText('')
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditText('')
  }

  const handleRegenerateResponse = async (messageIndex) => {
    if (!currentThreadId) return
    
    // Find the user message that triggered this AI response
    const userMessage = messages[messageIndex - 1]
    if (!userMessage || userMessage.type !== 'user') return

    try {
      setIsTyping(true)
      
      // Remove the AI response and any messages after it
      const messagesUpToUser = messages.slice(0, messageIndex)
      setMessages(messagesUpToUser)

      // Add empty AI message to start streaming into
      const aiMessageId = `ai-${Date.now()}`
      const aiMessage = {
        id: aiMessageId,
        type: 'ai',
        content: '',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])

      // Stream response from backend
      let fullResponse = ''
      
      await chatThreadsApi.streamChatWithThread(
        currentThreadId,
        userMessage.content,
        (data) => {
          if (data.content) {
            fullResponse += data.content
            
            // Stop typing animation on first content chunk
            if (isTyping) {
              setIsTyping(false)
            }
            
            // Update the AI message with streamed content
            setMessages(prev => 
              prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, content: fullResponse }
                  : msg
              )
            )
          }
          
          if (data.done) {
            setIsTyping(false)
          }
          
          if (data.error) {
            console.error('Regeneration error:', data.error)
            setIsTyping(false)
          }
        }
      )
    } catch (error) {
      console.error('Regeneration failed:', error)
      setIsTyping(false)
    }
  }

  const handleLikeMessage = (messageId) => {
    setLikedMessages(prev => {
      const newLiked = new Set(prev)
      if (newLiked.has(messageId)) {
        newLiked.delete(messageId)
      } else {
        newLiked.add(messageId)
      }
      return newLiked
    })
  }

  // AI Survey Template Generation
  const generateSurveyFromAI = async (description) => {
    try {
      const template = await chatService.generateSurveyTemplate(description)
      if (template) {
        setSurveyDraft(prev => ({ ...prev, ...template }))
        setCanvasView('editor') // Switch to editor to show the generated survey
      }
    } catch (error) {
      console.error('Failed to generate survey template:', error)
    }
  }

  // Function to categorize dates
  const categorizeDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    
    if (date >= today) {
      return 'Today'
    } else if (date >= yesterday) {
      return 'Yesterday'
    } else if (date >= weekAgo) {
      return 'Last 7 days'
    } else if (date >= monthAgo) {
      return 'Last month'
    } else {
      return 'Older'
    }
  }

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded)
  }

  // Removed old createNewThread function - using new async version above

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
        {/* Backend Connection Status */}
        {!backendConnected && (
          <div className="connection-status">
            <div className="status-indicator offline">
              <span className="status-dot"></span>
              Backend Offline - Using fallback mode
              <button 
                className="retry-btn"
                onClick={checkBackendConnection}
                title="Retry backend connection"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <aside className={`chat-panel ${sidebarExpanded ? 'expanded' : 'collapsed'}`}>
          <button className="panel-header" onClick={toggleSidebar} aria-label="Toggle panel">
            <PanelLeft size={18} />
          </button>

          <div className="panel-content">
            <button className="enable-survey-btn" onClick={() => openCanvasForSurvey('draft')}>
              Enable Survey Mode
            </button>

            <nav className="panel-nav">
              <button className="panel-item new-chat-btn" onClick={createNewThread}>
                <Plus size={16} />
                <span>New chat</span>
              </button>
            </nav>
            
            {/* Search input */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleSearch(e.target.value)
                  }}
                  className="search-input"
                />
                {searchQuery && (
                  <button 
                    className="clear-search-btn"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults([])
                      setIsSearching(false)
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Chat threads list */}
            <div className="threads-container">
              {isSearching && (
                <div className="loading">Searching...</div>
              )}
              
              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="no-results">No conversations found</div>
              )}
              
              {/* Show search results or recent threads */}
              <div className="threads-list">
                {searchQuery && !isSearching ? (
                  // Show search results
                  searchResults.map(thread => (
                    <div 
                      key={thread.id}
                      className={`thread-item search-result ${thread.id === currentThreadId ? 'active' : ''}`}
                      onClick={() => switchToThread(thread.id)}
                    >
                      <div className="thread-content">
                        <span className="thread-title">{thread.title || 'Untitled Chat'}</span>
                        <span className="thread-snippet search-snippet">
                          {thread.lastMessage || 'No messages yet'}
                        </span>
                      </div>
                      <div className="thread-actions">
                        <button 
                          className="thread-action-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteThread(thread.id)
                          }}
                          title="Delete conversation"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  // Show recent threads grouped by time categories
                  threadsLoading ? (
                    <div className="loading">Loading conversations...</div>
                  ) : (
                    <>
                      {(() => {
                        // Group threads by time categories
                        const grouped = {}
                        recentThreads.forEach(thread => {
                          const category = categorizeDate(thread.updated_at)
                          if (!grouped[category]) {
                            grouped[category] = []
                          }
                          grouped[category].push(thread)
                        })
                        
                        // Define category order
                        const categoryOrder = ['Today', 'Yesterday', 'Last 7 days', 'Last month', 'Older']
                        
                        return categoryOrder.map(category => {
                          const threads = grouped[category]
                          if (!threads || threads.length === 0) return null
                          
                          return (
                            <div key={category} className="thread-category">
                              <div className="category-header">{category}</div>
                              {threads.map(thread => (
                                <div 
                                  key={thread.id}
                                  className={`thread-item ${thread.id === currentThreadId ? 'active' : ''}`}
                                  onClick={() => switchToThread(thread.id)}
                                >
                                  <div className="thread-content">
                                    <span className="thread-title">{thread.title || 'Untitled Chat'}</span>
                                  </div>
                                  <div className="thread-actions">
                                    <button 
                                      className="thread-action-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteThread(thread.id)
                                      }}
                                      title="Delete conversation"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })
                      })()}
                      {recentThreads.length === 0 && !threadsLoading && (
                        <div className="no-threads">No conversations yet</div>
                      )}
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        </aside>

        <div 
          className="chat-messages"
          style={{
            marginRight: canvasOpen && canvasMode === 'split' ? `${canvasWidth + 32}px` : '0px',
            transition: 'margin-right 0.3s ease',
            opacity: canvasOpen && canvasMode === 'focus' ? '0.3' : '1',
            pointerEvents: canvasOpen && canvasMode === 'focus' ? 'none' : 'auto'
          }}
        >
          {messages.map((message, messageIndex) => {
            // Don't render AI messages that are empty/being prepared
            if (message.type === 'ai' && (!message.content || message.content.trim() === '')) {
              return null;
            }
            
            const { cleanContent, citations } = message.type === 'ai' ? parseCitations(message.content) : { cleanContent: message.content, citations: [] };
            const isEditing = editingMessageId === message.id;
            const isCopied = copiedMessageId === cleanContent.substring(0, 20);
            const isLiked = likedMessages.has(message.id);
            
            return (
              <div key={message.id} className={`message-container ${message.type}-container`}>
                <div className={`message ${message.type}-message`}>
                  <div className="message-bubble glass-bubble">
                    {isEditing ? (
                      <div className="edit-mode">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="edit-textarea"
                          rows={4}
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button 
                            className="edit-save-btn"
                            onClick={() => handleSaveEdit(message.id)}
                          >
                            <Check size={14} />
                            Save
                          </button>
                          <button 
                            className="edit-cancel-btn"
                            onClick={handleCancelEdit}
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {message.type === 'ai' ? (
                          <>
                            <div className="markdown-content">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={markdownComponents}
                                skipHtml={false}
                                allowedElements={undefined}
                              >
                                {cleanContent || ''}
                              </ReactMarkdown>
                            </div>
                            {/* Display citations if any */}
                            {citations.length > 0 && (
                              <div className="citations-section">
                                <div className="citations-header">Sources:</div>
                                <div className="citations-list">
                                  {citations.map((citation, index) => (
                                    <a 
                                      key={index}
                                      href={citation.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="citation-link"
                                    >
                                      <span className="citation-number">{index + 1}</span>
                                      <span className="citation-title">{citation.title}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Message actions below the bubble */}
                {!isEditing && (
                  <div className={`message-actions-container ${message.type}-actions-container`}>
                    <div className={`message-actions ${message.type === 'user' ? 'user-actions' : 'ai-actions'}`}>
                      <button 
                        className={`action-btn copy-btn ${isCopied ? 'copied' : ''}`}
                        onClick={() => handleCopyMessage(cleanContent)}
                        title="Copy message"
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      
                      {message.type === 'user' ? (
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => handleEditMessage(message.id, cleanContent)}
                          title="Edit message"
                        >
                          <Edit3 size={14} />
                        </button>
                      ) : (
                        <>
                          <button 
                            className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
                            onClick={() => handleLikeMessage(message.id)}
                            title="Like response"
                          >
                            <ThumbsUp size={14} />
                          </button>
                          <button 
                            className="action-btn regenerate-btn"
                            onClick={() => handleRegenerateResponse(messageIndex)}
                            title="Regenerate response"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
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

        <div 
          className="chat-input-area"
          style={{
            marginRight: canvasOpen && canvasMode === 'split' ? `${canvasWidth + 32}px` : '0px',
            transition: 'margin-right 0.3s ease'
          }}
        >
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
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={backendConnected 
                ? "Ask about culture, create surveys, or use / commands..." 
                : "Backend offline - limited functionality available"
              }
              className="chat-input expandable-input"
              rows={1}
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

      {/* Resize Handle */}
      {canvasOpen && canvasMode === 'split' && (
        <div 
          className="canvas-resize-handle"
          style={{
            position: 'fixed',
            top: 'var(--space-4)',
            right: `${canvasWidth + 16}px`,
            bottom: 'var(--space-4)',
            width: '4px',
            cursor: 'col-resize',
            zIndex: 1001,
            background: 'transparent',
          }}
          onMouseDown={handleDragStart}
        >
          <div className="resize-indicator" />
        </div>
      )}
      
      <div 
        className={`canvas-pane ${canvasOpen ? 'open' : ''} ${canvasMode}`}
        style={{
          width: canvasOpen ? (canvasMode === 'focus' ? '70vw' : `${canvasWidth}px`) : '0px'
        }}
      >
        <div className="canvas-header">
          <div className="canvas-title-section">
            <div className="canvas-title">
              <FileText size={18} className="canvas-icon" />
              <span className="title-text">{surveyDraft.title || 'Untitled Survey'}</span>
            </div>
            <div className="canvas-subtitle">
              <span className="subtitle-text">{surveyDraft.description || 'Culture intelligence survey'}</span>
            </div>
          </div>
          
          <div className="canvas-toolbar">
            <div className="view-controls">
              <button 
                className={`view-btn ${canvasView === 'editor' ? 'active' : ''}`} 
                onClick={() => setCanvasView('editor')}
                title="Edit Survey"
              >
                <Type size={16} />
                <span>Edit</span>
              </button>
              <button 
                className={`view-btn ${canvasView === 'preview' ? 'active' : ''}`} 
                onClick={() => setCanvasView('preview')}
                title="Preview Survey"
              >
                <Eye size={16} />
                <span>Preview</span>
              </button>
              <button 
                className={`view-btn ${canvasView === 'settings' ? 'active' : ''}`} 
                onClick={() => setCanvasView('settings')}
                title="Survey Settings"
              >
                <Settings size={16} />
                <span>Settings</span>
              </button>
            </div>
            
            <div className="canvas-actions">
              <button 
                className={`mode-btn ${canvasMode}`} 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCanvasMode(canvasMode === 'split' ? 'focus' : 'split')
                }}
                title={canvasMode === 'split' ? 'Focus mode' : 'Split mode'}
              >
                {canvasMode === 'split' ? <Grid size={16} /> : <List size={16} />}
              </button>
              <button className="save-btn" onClick={async () => { await saveSurveyDraft(surveyDraft) }}>
                Save
              </button>
              <button className="close-btn" onClick={() => setCanvasOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="canvas-body">
          {canvasView === 'editor' ? (
            <div className="survey-editor">
              <div className="editor-toolbar">
                <div className="ai-generation-section">
                  <input
                    type="text"
                    placeholder="Describe your survey... (e.g., 'team satisfaction survey for remote workers')"
                    className="ai-input"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        await generateSurveyFromAI(e.target.value.trim())
                        e.target.value = ''
                      }
                    }}
                  />
                  <button className="ai-generate-btn" title="Generate with AI">
                    <Sliders size={16} />
                  </button>
                </div>
                
                <div className="editor-tools">
                  <button className="tool-btn" title="Add Question">
                    <Plus size={16} />
                  </button>
                  <button className="tool-btn" title="Question Types">
                    <List size={16} />
                  </button>
                  <button className="tool-btn" title="Styling">
                    <Palette size={16} />
                  </button>
                </div>
              </div>
              
              <div className="editor-content">
                <div className="survey-header-editor">
                  <input
                    type="text"
                    className="title-editor"
                    value={surveyDraft.title}
                    onChange={e => setSurveyDraft(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Survey Title"
                  />
                  <textarea
                    className="description-editor"
                    value={surveyDraft.description}
                    onChange={e => setSurveyDraft(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your survey..."
                    rows={2}
                  />
                </div>
                
                <div className="questions-editor">
                  {surveyDraft.questions.map((q, index) => (
                    <div key={q.id} className="question-editor">
                      <div className="question-header">
                        <span className="question-number">{index + 1}</span>
                        <input
                          type="text"
                          className="question-text"
                          value={q.text}
                          onChange={e => {
                            const updatedQuestions = [...surveyDraft.questions]
                            updatedQuestions[index].text = e.target.value
                            setSurveyDraft(prev => ({ ...prev, questions: updatedQuestions }))
                          }}
                          placeholder="Enter your question..."
                        />
                        <select 
                          className="question-type"
                          value={q.type}
                          onChange={e => {
                            const updatedQuestions = [...surveyDraft.questions]
                            updatedQuestions[index].type = e.target.value
                            setSurveyDraft(prev => ({ ...prev, questions: updatedQuestions }))
                          }}
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="scale">Rating Scale</option>
                          <option value="text">Text Response</option>
                          <option value="multiple_select">Multiple Select</option>
                        </select>
                      </div>
                      
                      {(q.type === 'multiple_choice' || q.type === 'multiple_select') && (
                        <div className="options-editor">
                          {q.options?.map((opt, optIndex) => (
                            <div key={optIndex} className="option-row">
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const updatedQuestions = [...surveyDraft.questions]
                                  updatedQuestions[index].options[optIndex] = e.target.value
                                  setSurveyDraft(prev => ({ ...prev, questions: updatedQuestions }))
                                }}
                                placeholder={`Option ${optIndex + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {q.type === 'scale' && (
                        <div className="scale-editor">
                          <input
                            type="number"
                            value={q.min || 1}
                            onChange={e => {
                              const updatedQuestions = [...surveyDraft.questions]
                              updatedQuestions[index].min = parseInt(e.target.value)
                              setSurveyDraft(prev => ({ ...prev, questions: updatedQuestions }))
                            }}
                            placeholder="Min"
                            className="scale-input"
                          />
                          <span>to</span>
                          <input
                            type="number"
                            value={q.max || 10}
                            onChange={e => {
                              const updatedQuestions = [...surveyDraft.questions]
                              updatedQuestions[index].max = parseInt(e.target.value)
                              setSurveyDraft(prev => ({ ...prev, questions: updatedQuestions }))
                            }}
                            placeholder="Max"
                            className="scale-input"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : canvasView === 'preview' ? (
            <div className="survey-preview">
              <div className="preview-header">
                <h2 className="preview-title">{surveyDraft.title}</h2>
                <p className="preview-description">{surveyDraft.description}</p>
              </div>
              
              <div className="preview-questions">
                {surveyDraft.questions.map((q, index) => (
                  <div key={q.id} className="preview-question">
                    <label className="preview-q-label">
                      {index + 1}. {q.text}{q.required ? ' *' : ''}
                    </label>
                    
                    {q.type === 'multiple_choice' && (
                      <div className="preview-options">
                        {q.options?.map((opt, optIndex) => (
                          <label key={optIndex} className="preview-option">
                            <input type="radio" name={`preview-${q.id}`} />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {q.type === 'multiple_select' && (
                      <div className="preview-options">
                        {q.options?.map((opt, optIndex) => (
                          <label key={optIndex} className="preview-option">
                            <input type="checkbox" />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {q.type === 'scale' && (
                      <div className="preview-scale">
                        <div className="scale-labels">
                          <span>{q.min || 1}</span>
                          <span>{q.max || 10}</span>
                        </div>
                        <input 
                          type="range" 
                          min={q.min || 1} 
                          max={q.max || 10} 
                          className="scale-slider"
                        />
                      </div>
                    )}
                    
                    {q.type === 'text' && (
                      <textarea 
                        className="preview-text" 
                        rows="3" 
                        placeholder={q.placeholder || "Type your answer..."}
                        disabled
                      />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="preview-actions">
                <button className="preview-btn primary">Submit Survey</button>
                <button className="preview-btn secondary">Save as Draft</button>
              </div>
            </div>
          ) : (
            <div className="settings-view">
              <div className="settings-section">
                <h3>Survey Configuration</h3>
                
                <div className="form-field">
                  <label>Survey Title</label>
                  <input 
                    type="text" 
                    className="canvas-input" 
                    value={surveyDraft.title}
                    onChange={e => setSurveyDraft(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter survey title"
                  />
                </div>
                
                <div className="form-field">
                  <label>Description</label>
                  <textarea 
                    className="canvas-input" 
                    value={surveyDraft.description}
                    onChange={e => setSurveyDraft(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the purpose of this survey..."
                    rows={3}
                  />
                </div>
                
                <div className="form-field">
                  <label>Target Audience</label>
                  <input 
                    type="text" 
                    className="canvas-input" 
                    value={surveyDraft.settings?.targetAudience}
                    onChange={e => setSurveyDraft(prev => ({ 
                      ...prev, 
                      settings: { ...prev.settings, targetAudience: e.target.value }
                    }))}
                    placeholder="e.g., All employees, Management team"
                  />
                </div>
                
                <div className="form-field checkbox-field">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={surveyDraft.settings?.anonymous}
                      onChange={e => setSurveyDraft(prev => ({ 
                        ...prev, 
                        settings: { ...prev.settings, anonymous: e.target.checked }
                      }))}
                    />
                    <span>Anonymous responses</span>
                  </label>
                </div>
              </div>
              
              <div className="settings-section">
                <h3>Branding</h3>
                
                <div className="form-field">
                  <label>Primary Color</label>
                  <input 
                    type="color" 
                    className="color-input" 
                    value={surveyDraft.branding?.primaryColor}
                    onChange={e => setSurveyDraft(prev => ({ 
                      ...prev, 
                      branding: { ...prev.branding, primaryColor: e.target.value }
                    }))}
                  />
                </div>
                
                <div className="form-field">
                  <label>Background</label>
                  <input 
                    type="color" 
                    className="color-input" 
                    value={surveyDraft.branding?.backgroundColor}
                    onChange={e => setSurveyDraft(prev => ({ 
                      ...prev, 
                      branding: { ...prev.branding, backgroundColor: e.target.value }
                    }))}
                  />
                </div>
              </div>
              
              <div className="settings-section">
                <h3>Classifiers</h3>
                <p className="section-description">Category labels for demographic analysis</p>
                
                {surveyDraft.classifiers?.map((classifier, index) => (
                  <div key={classifier.id} className="classifier-editor">
                    <div className="classifier-header">
                      <input
                        type="text"
                        value={classifier.name}
                        onChange={e => {
                          const updated = [...surveyDraft.classifiers]
                          updated[index].name = e.target.value
                          setSurveyDraft(prev => ({ ...prev, classifiers: updated }))
                        }}
                        className="classifier-name"
                        placeholder="Classifier name"
                      />
                    </div>
                    <div className="classifier-values">
                      {classifier.values?.map((value, valueIndex) => (
                        <input
                          key={valueIndex}
                          type="text"
                          value={value}
                          onChange={e => {
                            const updated = [...surveyDraft.classifiers]
                            updated[index].values[valueIndex] = e.target.value
                            setSurveyDraft(prev => ({ ...prev, classifiers: updated }))
                          }}
                          className="classifier-value"
                          placeholder={`Value ${valueIndex + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="settings-section">
                <h3>Metrics</h3>
                <p className="section-description">Calculated fields based on survey responses</p>
                
                {surveyDraft.metrics?.map((metric, index) => (
                  <div key={metric.id} className="metric-editor">
                    <input
                      type="text"
                      value={metric.name}
                      onChange={e => {
                        const updated = [...surveyDraft.metrics]
                        updated[index].name = e.target.value
                        setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                      }}
                      className="metric-name"
                      placeholder="Metric name"
                    />
                    <input
                      type="text"
                      value={metric.formula}
                      onChange={e => {
                        const updated = [...surveyDraft.metrics]
                        updated[index].formula = e.target.value
                        setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                      }}
                      className="metric-formula"
                      placeholder="Formula (e.g., avg(q1,q2))"
                    />
                    <textarea
                      value={metric.description}
                      onChange={e => {
                        const updated = [...surveyDraft.metrics]
                        updated[index].description = e.target.value
                        setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                      }}
                      className="metric-description"
                      placeholder="Description of this metric..."
                      rows={2}
                    />
                  </div>
                ))}
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

        /* Backend Connection Status */
        .connection-status {
          position: fixed;
          top: var(--space-4);
          right: var(--space-4);
          z-index: 1000;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: rgba(239, 68, 68, 0.9);
          color: white;
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 500;
          backdrop-filter: blur(10px);
          box-shadow: var(--shadow-soft);
        }

        .status-indicator.offline {
          background: rgba(239, 68, 68, 0.9);
        }

        .status-indicator.online {
          background: rgba(34, 197, 94, 0.9);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 2s infinite;
        }

        .retry-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 120px 0 120px 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .canvas-open .chat-messages { 
          margin-right: 460px; 
          transition: margin-right 0.3s ease;
        }

        .message {
          display: flex;
          gap: var(--space-3);
          animation: fadeInUp 0.4s ease-out;
        }

        .user-message {
          flex-direction: row-reverse;
        }

         .message-bubble {
           max-width: 70%;
           padding: var(--space-4) var(--space-5);
           position: relative;
           border-radius: var(--radius-lg);
         }

         .ai-message .message-bubble {
           background: linear-gradient(135deg, 
             rgba(243, 238, 255, 0.95) 0%, 
             rgba(245, 241, 255, 0.90) 50%, 
             rgba(247, 244, 255, 0.85) 100%);
           border: 1px solid rgba(177, 156, 217, 0.25);
           backdrop-filter: blur(12px);
           padding: var(--space-4) var(--space-5);
           box-shadow: 
             0 2px 12px rgba(139, 92, 246, 0.08),
             0 1px 4px rgba(0, 0, 0, 0.04);
           position: relative;
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
           top: var(--space-4);
           right: var(--space-4);
           bottom: var(--space-4);
           overflow: hidden;
           background: linear-gradient(135deg, 
             rgba(255, 255, 255, 0.98) 0%, 
             rgba(250, 251, 255, 0.95) 100%);
           backdrop-filter: blur(24px);
           -webkit-backdrop-filter: blur(24px);
           border: 1px solid rgba(226, 232, 240, 0.3);
           border-radius: 20px;
           box-shadow: 
             0 20px 60px rgba(0, 0, 0, 0.12),
             0 8px 32px rgba(139, 92, 246, 0.08),
             inset 0 1px 0 rgba(255, 255, 255, 0.4);
           transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), 
                      transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
           display: flex;
           flex-direction: column;
           z-index: 1000;
         }
         
         .canvas-pane:not(.open) {
           opacity: 0;
           transform: translateX(100%);
           pointer-events: none;
         }
         
         .canvas-pane.focus {
           left: 15vw;
           right: 15vw;
           width: 70vw !important;
         }
         
         /* Canvas Resize Handle */
         .canvas-resize-handle {
           display: flex;
           align-items: center;
           justify-content: center;
         }
         
         .canvas-resize-handle:hover .resize-indicator {
           background: rgba(139, 92, 246, 0.6);
           box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
         }
         
         .resize-indicator {
           width: 2px;
           height: 40px;
           background: rgba(226, 232, 240, 0.5);
           border-radius: 1px;
           transition: all 0.2s ease;
         }
         .canvas-header {
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
           padding: var(--space-5);
           border-bottom: 1px solid rgba(226, 232, 240, 0.3);
           background: rgba(255, 255, 255, 0.6);
           backdrop-filter: blur(12px);
         }
         
         .canvas-title-section {
           display: flex;
           flex-direction: column;
           gap: 4px;
         }
         
         .canvas-title { 
           display: flex; 
           align-items: center; 
           gap: var(--space-2); 
         }
         
         .canvas-icon {
           color: rgba(139, 92, 246, 0.8);
         }
         
         .title-text { 
           font-weight: 600; 
           color: var(--text-primary); 
           font-size: 1.1em;
         }
         
         .canvas-subtitle {
           margin-left: 26px;
         }
         
         .subtitle-text {
           font-size: 0.85em;
           color: var(--text-secondary);
           opacity: 0.8;
         }
         
         .canvas-toolbar {
           display: flex;
           align-items: center;
           justify-content: space-between;
         }
         
         .view-controls {
           display: flex;
           align-items: center;
           gap: 4px;
           background: rgba(248, 250, 252, 0.8);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 12px;
           padding: 4px;
         }
         
         .view-btn {
           display: flex;
           align-items: center;
           gap: 6px;
           padding: 8px 12px;
           border: none;
           background: transparent;
           border-radius: 8px;
           font-size: 0.85em;
           font-weight: 500;
           color: var(--text-secondary);
           cursor: pointer;
           transition: all 0.2s ease;
         }
         
         .view-btn.active {
           background: white;
           color: rgba(139, 92, 246, 0.9);
           box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
         }
         
         .view-btn:hover:not(.active) {
           color: var(--text-primary);
           background: rgba(255, 255, 255, 0.6);
         }
         
         .canvas-actions {
           display: flex;
           align-items: center;
           gap: var(--space-2);
         }
         
         .mode-btn, .save-btn, .close-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           padding: 8px 12px;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 8px;
           cursor: pointer;
           transition: all 0.2s ease;
           font-size: 0.85em;
           font-weight: 500;
         }
         
         .save-btn {
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
           color: white;
           border-color: transparent;
         }
         
         .save-btn:hover {
           background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(124, 58, 237, 1) 100%);
           transform: translateY(-1px);
           box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
         }
         
         .mode-btn:hover, .close-btn:hover {
           background: rgba(248, 250, 252, 0.9);
           border-color: rgba(226, 232, 240, 0.6);
         }
         
         .close-btn {
           color: var(--text-secondary);
         }
         .canvas-body { 
           flex: 1;
           overflow-y: auto;
           background: rgba(255, 255, 255, 0.4);
         }
         
         /* Survey Editor Styles */
         .survey-editor {
           height: 100%;
           display: flex;
           flex-direction: column;
         }
         
         .editor-toolbar {
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
           padding: var(--space-4);
           border-bottom: 1px solid rgba(226, 232, 240, 0.2);
         }
         
         .ai-generation-section {
           display: flex;
           gap: 8px;
           align-items: center;
         }
         
         .ai-input {
           flex: 1;
           border: 1px solid rgba(139, 92, 246, 0.3);
           background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 248, 255, 0.8) 100%);
           border-radius: 10px;
           padding: 12px 16px;
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .ai-input:focus {
           border-color: rgba(139, 92, 246, 0.5);
           background: rgba(255, 255, 255, 0.95);
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
         }
         
         .ai-generate-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 44px;
           height: 44px;
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
           color: white;
           border: none;
           border-radius: 10px;
           cursor: pointer;
           transition: all 0.2s ease;
         }
         
         .ai-generate-btn:hover {
           background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(124, 58, 237, 1) 100%);
           transform: translateY(-1px);
           box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
         }
         
         .editor-tools {
           display: flex;
           gap: 8px;
         }
         
         .tool-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 36px;
           height: 36px;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 8px;
           color: var(--text-secondary);
           cursor: pointer;
           transition: all 0.2s ease;
         }
         
         .tool-btn:hover {
           background: rgba(139, 92, 246, 0.05);
           border-color: rgba(139, 92, 246, 0.3);
           color: rgba(139, 92, 246, 0.8);
         }
         
         .editor-content {
           flex: 1;
           padding: var(--space-4);
           overflow-y: auto;
         }
         
         .survey-header-editor {
           margin-bottom: var(--space-6);
         }
         
         .title-editor {
           width: 100%;
           font-size: 1.4em;
           font-weight: 600;
           border: none;
           background: transparent;
           color: var(--text-primary);
           margin-bottom: var(--space-2);
           padding: var(--space-2) 0;
           outline: none;
         }
         
         .title-editor:focus {
           background: rgba(248, 250, 252, 0.6);
           border-radius: 8px;
           padding: var(--space-2) var(--space-3);
         }
         
         .description-editor {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.6);
           border-radius: 10px;
           padding: var(--space-3);
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           resize: vertical;
           transition: all 0.2s ease;
         }
         
         .description-editor:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: rgba(255, 255, 255, 0.9);
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
         }
         
         .questions-editor {
           display: flex;
           flex-direction: column;
           gap: var(--space-4);
         }
         
         .question-editor {
           background: rgba(255, 255, 255, 0.8);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 12px;
           padding: var(--space-4);
           transition: all 0.2s ease;
         }
         
         .question-editor:hover {
           border-color: rgba(139, 92, 246, 0.3);
           box-shadow: 0 4px 16px rgba(139, 92, 246, 0.08);
         }
         
         .question-header {
           display: flex;
           align-items: center;
           gap: var(--space-3);
           margin-bottom: var(--space-3);
         }
         
         .question-number {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 28px;
           height: 28px;
           background: rgba(139, 92, 246, 0.1);
           color: rgba(139, 92, 246, 0.8);
           border-radius: 50%;
           font-weight: 600;
           font-size: 0.85em;
           flex-shrink: 0;
         }
         
         .question-text {
           flex: 1;
           border: none;
           background: rgba(248, 250, 252, 0.6);
           border-radius: 8px;
           padding: var(--space-2) var(--space-3);
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .question-text:focus {
           background: rgba(255, 255, 255, 0.9);
           box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
         }
         
         .question-type {
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.9);
           border-radius: 8px;
           padding: var(--space-2) var(--space-3);
           font-size: 0.8em;
           color: var(--text-primary);
           cursor: pointer;
           outline: none;
         }
         
         .options-editor {
           display: flex;
           flex-direction: column;
           gap: 8px;
           margin-left: var(--space-6);
         }
         
         .option-row input {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.3);
           background: rgba(248, 250, 252, 0.4);
           border-radius: 6px;
           padding: 8px 12px;
           font-size: 0.85em;
           outline: none;
           transition: all 0.2s ease;
         }
         
         .option-row input:focus {
           background: white;
           border-color: rgba(139, 92, 246, 0.3);
         }
         
         .scale-editor {
           display: flex;
           align-items: center;
           gap: var(--space-2);
           margin-left: var(--space-6);
         }
         
         .scale-input {
           width: 80px;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 6px;
           padding: 6px 8px;
           font-size: 0.85em;
           text-align: center;
           outline: none;
         }

         /* Survey Preview Styles */
         .survey-preview {
           height: 100%;
           padding: var(--space-5);
           overflow-y: auto;
         }
         
         .preview-header {
           text-align: center;
           margin-bottom: var(--space-6);
           padding-bottom: var(--space-4);
           border-bottom: 2px solid rgba(226, 232, 240, 0.3);
         }
         
         .preview-title {
           font-size: 1.6em;
           font-weight: 700;
           color: var(--text-primary);
           margin-bottom: var(--space-2);
         }
         
         .preview-description {
           font-size: 0.95em;
           color: var(--text-secondary);
           line-height: 1.6;
         }
         
         .preview-questions {
           display: flex;
           flex-direction: column;
           gap: var(--space-5);
         }
         
         .preview-question {
           background: rgba(255, 255, 255, 0.9);
           border: 1px solid rgba(226, 232, 240, 0.3);
           border-radius: 12px;
           padding: var(--space-4);
         }
         
         .preview-q-label {
           display: block;
           font-weight: 600;
           color: var(--text-primary);
           margin-bottom: var(--space-3);
           font-size: 0.95em;
         }
         
         .preview-options {
           display: flex;
           flex-direction: column;
           gap: 12px;
         }
         
         .preview-option {
           display: flex;
           align-items: center;
           gap: 12px;
           padding: 12px;
           background: rgba(248, 250, 252, 0.6);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 8px;
           cursor: pointer;
           transition: all 0.2s ease;
         }
         
         .preview-option:hover {
           background: rgba(255, 255, 255, 0.8);
           border-color: rgba(139, 92, 246, 0.3);
         }
         
         .preview-scale {
           display: flex;
           flex-direction: column;
           gap: var(--space-2);
         }
         
         .scale-labels {
           display: flex;
           justify-content: space-between;
           font-size: 0.85em;
           color: var(--text-secondary);
         }
         
         .scale-slider {
           width: 100%;
           height: 6px;
           border-radius: 3px;
           background: rgba(226, 232, 240, 0.6);
           outline: none;
           cursor: pointer;
         }
         
         .preview-text {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(248, 250, 252, 0.4);
           border-radius: 8px;
           padding: var(--space-3);
           font-size: 0.9em;
           color: var(--text-secondary);
           outline: none;
           resize: vertical;
         }
         
         .preview-actions {
           display: flex;
           gap: var(--space-3);
           justify-content: center;
           margin-top: var(--space-6);
           padding-top: var(--space-4);
           border-top: 1px solid rgba(226, 232, 240, 0.3);
         }
         
         .preview-btn {
           padding: 12px 24px;
           border-radius: 10px;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.2s ease;
           font-size: 0.9em;
         }
         
         .preview-btn.primary {
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
           color: white;
           border: none;
         }
         
         .preview-btn.primary:hover {
           background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(124, 58, 237, 1) 100%);
           transform: translateY(-2px);
           box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
         }
         
         .preview-btn.secondary {
           background: rgba(255, 255, 255, 0.8);
           color: var(--text-primary);
           border: 1px solid rgba(226, 232, 240, 0.5);
         }
         
         .preview-btn.secondary:hover {
           background: rgba(255, 255, 255, 0.9);
           border-color: rgba(226, 232, 240, 0.7);
         }

         /* Settings View Styles */
         .settings-view {
           height: 100%;
           padding: var(--space-5);
           overflow-y: auto;
         }
         
         .settings-section {
           margin-bottom: var(--space-6);
         }
         
         .settings-section h3 {
           font-size: 1.1em;
           font-weight: 600;
           color: var(--text-primary);
           margin-bottom: var(--space-4);
           padding-bottom: var(--space-2);
           border-bottom: 1px solid rgba(226, 232, 240, 0.3);
         }
         
         .form-field {
           display: flex;
           flex-direction: column;
           gap: 8px;
           margin-bottom: var(--space-4);
         }
         
         .form-field label {
           font-weight: 500;
           color: var(--text-primary);
           font-size: 0.9em;
         }
         
         .canvas-input {
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 10px;
           padding: 12px 16px;
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .canvas-input:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: rgba(255, 255, 255, 0.95);
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
         }
         
         .checkbox-field {
           flex-direction: row;
           align-items: center;
         }
         
         .checkbox-label {
           display: flex;
           align-items: center;
           gap: 8px;
           cursor: pointer;
         }
         
         .color-input {
           width: 60px;
           height: 40px;
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 8px;
           cursor: pointer;
           outline: none;
         }
         
         .section-description {
           font-size: 0.8em;
           color: var(--text-secondary);
           margin-bottom: var(--space-3);
           opacity: 0.8;
         }
         
         /* Classifiers Styles */
         .classifier-editor {
           background: rgba(248, 250, 252, 0.6);
           border: 1px solid rgba(226, 232, 240, 0.3);
           border-radius: 10px;
           padding: var(--space-3);
           margin-bottom: var(--space-3);
         }
         
         .classifier-header {
           margin-bottom: var(--space-2);
         }
         
         .classifier-name {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 8px;
           padding: 8px 12px;
           font-size: 0.85em;
           font-weight: 500;
           color: var(--text-primary);
           outline: none;
         }
         
         .classifier-values {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
           gap: 8px;
         }
         
         .classifier-value {
           border: 1px solid rgba(226, 232, 240, 0.3);
           background: rgba(255, 255, 255, 0.6);
           border-radius: 6px;
           padding: 6px 10px;
           font-size: 0.8em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .classifier-value:focus {
           background: white;
           border-color: rgba(139, 92, 246, 0.3);
         }
         
         /* Metrics Styles */
         .metric-editor {
           background: rgba(248, 250, 252, 0.6);
           border: 1px solid rgba(226, 232, 240, 0.3);
           border-radius: 10px;
           padding: var(--space-3);
           margin-bottom: var(--space-3);
         }
         
         .metric-name {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 8px;
           padding: 8px 12px;
           font-size: 0.85em;
           font-weight: 500;
           color: var(--text-primary);
           outline: none;
           margin-bottom: 8px;
         }
         
         .metric-formula {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 8px;
           padding: 8px 12px;
           font-size: 0.8em;
           font-family: 'Monaco', monospace;
           color: var(--text-primary);
           outline: none;
           margin-bottom: 8px;
         }
         
         .metric-description {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 8px;
           padding: 8px 12px;
           font-size: 0.8em;
           color: var(--text-primary);
           outline: none;
           resize: vertical;
         }
         
         /* Canvas Animation Enhancements */
         .canvas-pane:not(.open) {
           transform: translateX(100%);
         }
         
         .canvas-body > * {
           animation: fadeInCanvas 0.4s ease-out;
         }
         
         @keyframes fadeInCanvas {
           from {
             opacity: 0;
             transform: translateY(10px);
           }
           to {
             opacity: 1;
             transform: translateY(0);
           }
         }
         
         /* Smooth scrolling */
         .editor-content, .survey-preview, .settings-view {
           scroll-behavior: smooth;
         }
         
         .editor-content::-webkit-scrollbar,
         .survey-preview::-webkit-scrollbar,
         .settings-view::-webkit-scrollbar {
           width: 6px;
         }
         
         .editor-content::-webkit-scrollbar-track,
         .survey-preview::-webkit-scrollbar-track,
         .settings-view::-webkit-scrollbar-track {
           background: transparent;
         }
         
         .editor-content::-webkit-scrollbar-thumb,
         .survey-preview::-webkit-scrollbar-thumb,
         .settings-view::-webkit-scrollbar-thumb {
           background: rgba(226, 232, 240, 0.6);
           border-radius: 3px;
         }
         
         .editor-content::-webkit-scrollbar-thumb:hover,
         .survey-preview::-webkit-scrollbar-thumb:hover,
         .settings-view::-webkit-scrollbar-thumb:hover {
           background: rgba(226, 232, 240, 0.8);
         }

          
          .canvas-pane.focus .chat-messages {
            opacity: 0.3;
            pointer-events: none;
          }
          
          @media (max-width: 1200px) {
            .canvas-pane.open { 
              width: 45vw; 
              min-width: 400px;
            }
            .canvas-open .chat-input-area { 
              right: 45vw; 
            }
            .canvas-open .chat-messages {
              margin-right: 45vw;
            }
          }
          
         @media (max-width: 768px) {
           .canvas-pane.open { 
             width: 95vw; 
             right: 2.5vw; 
             left: 2.5vw; 
           }
           .canvas-open .chat-input-area { 
             right: var(--space-4); 
             left: var(--space-4);
           }
           .canvas-open .chat-messages {
             margin-right: 0;
             opacity: 0.2;
           }
         }

         .chat-panel {
           position: fixed;
           top: var(--space-4);
           left: 288px;
           height: calc(100vh - var(--space-8));
           z-index: 100;
           overflow: hidden;
           display: flex;
           flex-direction: column;
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
         }
         
         .chat-panel.collapsed { 
           width: 48px;  /* Just enough for the button */
           background: transparent;
         }
         
         .chat-panel.expanded { 
           width: 280px;
           background: rgba(255, 255, 255, 0.98);
           backdrop-filter: blur(20px);
           border: 1px solid rgba(226, 232, 240, 0.3);
           border-radius: 12px;
           box-shadow: 
             0 4px 16px rgba(0, 0, 0, 0.04),
             0 8px 32px rgba(139, 92, 246, 0.08);
         }
         .panel-header {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 40px;
           height: 40px;
           cursor: pointer;
           color: var(--text-secondary);
           border-radius: 8px;
           transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
           margin: 4px;
           position: relative;
         }
         
         .chat-panel.collapsed .panel-header {
           background: rgba(255, 255, 255, 0.90);
           border: 1px solid rgba(226, 232, 240, 0.5);
           box-shadow: 
             0 2px 8px rgba(0, 0, 0, 0.08),
             0 1px 3px rgba(0, 0, 0, 0.1);
         }
         
         .chat-panel.collapsed .panel-header:hover {
           background: rgba(255, 255, 255, 0.95);
           transform: translateY(-1px);
           box-shadow: 
             0 4px 12px rgba(0, 0, 0, 0.12),
             0 2px 6px rgba(0, 0, 0, 0.08);
         }
         
         .chat-panel.expanded .panel-header {
           background: transparent;
           border: none;
           box-shadow: none;
           align-self: flex-end;
           margin: var(--space-3);
         }
         
         .chat-panel.expanded .panel-header:hover {
           background: rgba(239, 242, 247, 0.8);
         }
         .panel-content {
           padding: var(--space-4);
           display: flex;
           flex-direction: column;
           gap: var(--space-4);
           height: calc(100% - 56px);
           opacity: 0;
           transform: translateX(-10px);
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
         }
         
         .chat-panel.expanded .panel-content {
           opacity: 1;
           transform: translateX(0);
         }
         
         .chat-panel.collapsed .panel-content { 
           display: none; 
         }
         
         .panel-nav { 
           display: flex; 
           flex-direction: column; 
           gap: 8px; 
         }
         
         .panel-item {
           display: flex; 
           align-items: center; 
           gap: 12px;
           padding: 12px 16px; 
           border-radius: 8px;
           background: transparent;
           color: var(--text-primary);
           cursor: pointer;
           transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
           border: none;
           font-size: 0.9em;
         }
         
         .panel-item:hover { 
           background: rgba(239, 242, 247, 0.8);
           transform: translateX(2px);
         }
         
         /* Search Container Styles */
         .search-container {
           margin: var(--space-3) 0;
         }
         
         .search-input-wrapper {
           position: relative;
           display: flex;
           align-items: center;
           background: rgba(248, 250, 252, 0.8);
           border: 1px solid rgba(226, 232, 240, 0.5);
           border-radius: 10px;
           padding: 10px 14px;
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
           backdrop-filter: blur(10px);
         }
         
         .search-input-wrapper:focus-within {
           border-color: rgba(139, 92, 246, 0.5);
           background: rgba(255, 255, 255, 0.95);
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
           transform: translateY(-1px);
         }
         
         .search-icon {
           color: var(--text-secondary);
           margin-right: 10px;
           flex-shrink: 0;
           opacity: 0.7;
         }
         
         .search-input {
           flex: 1;
           border: none;
           background: transparent;
           outline: none;
           font-size: 0.9em;
           color: var(--text-primary);
           font-weight: 400;
         }
         
         .search-input::placeholder {
           color: var(--text-secondary);
           opacity: 0.7;
         }
         
         .clear-search-btn {
           background: none;
           border: none;
           color: var(--text-secondary);
           cursor: pointer;
           padding: 2px;
           border-radius: 2px;
           display: flex;
           align-items: center;
           justify-content: center;
           margin-left: 4px;
           transition: all 0.2s ease;
         }
         
         .clear-search-btn:hover {
           background: rgba(239, 68, 68, 0.1);
           color: rgb(239, 68, 68);
         }
         
         /* Threads Container Styles */
         .threads-container {
           flex: 1;
           overflow: hidden;
           display: flex;
           flex-direction: column;
         }
         
         .threads-list {
           flex: 1;
           overflow-y: auto;
           display: flex;
           flex-direction: column;
           gap: 2px;
           padding-right: 4px;
         }
         
         .threads-list::-webkit-scrollbar {
           display: none;
         }
         
         .threads-list {
           -ms-overflow-style: none;  /* IE and Edge */
           scrollbar-width: none;  /* Firefox */
         }
         
         /* Thread Item Styles */
         .thread-item {
           display: flex;
           align-items: flex-start;
           justify-content: space-between;
           padding: 12px 14px;
           border-radius: 10px;
           background: transparent;
           cursor: pointer;
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
           position: relative;
           border: 1px solid transparent;
           margin-bottom: 2px;
         }
         
         .thread-item:hover {
           background: rgba(248, 250, 252, 0.8);
           border-color: rgba(226, 232, 240, 0.3);
           transform: translateX(2px);
         }
         
         .thread-item.active {
           background: linear-gradient(135deg, 
             rgba(243, 238, 255, 0.7) 0%, 
             rgba(245, 241, 255, 0.6) 100%);
           border: 1px solid rgba(177, 156, 217, 0.4);
           box-shadow: 
             0 1px 4px rgba(139, 92, 246, 0.08),
             inset 0 1px 0 rgba(255, 255, 255, 0.4);
         }
         
         .thread-item.search-result {
           background: rgba(252, 252, 253, 0.9);
         }
         
         .thread-content {
           flex: 1;
           display: flex;
           flex-direction: column;
           gap: 4px;
           margin-right: 8px;
           min-width: 0;
         }
         
         .thread-title {
           font-size: 0.95em;
           font-weight: 500;
           color: var(--text-primary);
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
           line-height: 1.3;
         }
         
         .thread-snippet {
           font-size: 0.8em;
           color: var(--text-secondary);
           white-space: nowrap;
           overflow: hidden;
           text-overflow: ellipsis;
           line-height: 1.2;
           opacity: 0.7;
         }
         
         .search-snippet {
           font-style: italic;
           color: rgba(139, 92, 246, 0.7);
         }
         
         .thread-actions {
           display: flex;
           gap: 4px;
           opacity: 0;
           transition: opacity 0.2s ease;
         }
         
         .thread-item:hover .thread-actions {
           opacity: 1;
         }
         
         .thread-action-btn {
           background: none;
           border: none;
           color: var(--text-secondary);
           cursor: pointer;
           padding: 6px 8px;
           border-radius: 6px;
           display: flex;
           align-items: center;
           justify-content: center;
           transition: all 0.2s ease;
         }
         
         .thread-action-btn:hover {
           background: rgba(239, 68, 68, 0.1);
           color: rgb(239, 68, 68);
         }
         
         .thread-item.active .thread-title {
           color: rgba(57, 42, 72, 0.9);  /* Deeper purple matching sidebar nav active color */
           font-weight: 600;
         }
         
         .thread-item:hover .thread-title {
           color: var(--text-primary);
         }
         
         .new-chat-btn {
           background: rgba(139, 92, 246, 0.1);
           border: 1px solid rgba(139, 92, 246, 0.2);
         }
         
         .new-chat-btn:hover {
           background: rgba(139, 92, 246, 0.15);
           border-color: rgba(139, 92, 246, 0.3);
         }
         
         .loading, .no-threads, .no-results {
           text-align: center;
           color: var(--text-secondary);
           font-size: 0.8em;
           padding: 12px;
           font-style: italic;
         }
         
         /* Thread Category Styles */
         .thread-category {
           margin-bottom: var(--space-4);
         }
         
         .category-header {
           font-size: 0.8em;
           font-weight: 600;
           color: var(--text-secondary);
           text-transform: uppercase;
           letter-spacing: 0.5px;
           margin-bottom: 8px;
           padding: 0 8px;
           opacity: 0.8;
         }

         /* Properly shift chat content when panel is open to prevent overlap */
         .panel-open .chat-input-area { 
           left: calc(288px + 280px + var(--space-2));  /* Reduced spacing */
           transition: left 0.25s ease; 
         }
         .panel-open .chat-messages { 
           margin-left: calc(280px + var(--space-1));  /* Reduced margin for tighter layout */
           transition: margin-left 0.25s ease; 
         }
         .chat-container:not(.panel-open) .chat-messages { 
           margin-left: 0; 
           transition: margin-left 0.25s ease; 
         }
         .chat-container:not(.panel-open) .chat-input-area { 
           left: 288px; 
           transition: left 0.25s ease; 
         }
         
         /* Adjust spacing when both sidebars are open */
         .panel-open.canvas-open .chat-messages { 
           margin-left: calc(280px + var(--space-1));
           margin-right: calc(460px + var(--space-1));  /* Reduced right margin too */
           transition: all 0.3s ease;
         }

         .enable-survey-btn {
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
           color: white;
           border: none;
           padding: 12px 16px;
           border-radius: 8px;
           font-weight: 500;
           cursor: pointer;
           transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
           box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
           margin-bottom: var(--space-3);
           font-size: 0.9em;
           width: 100%;
         }

         .enable-survey-btn:hover {
           background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(124, 58, 237, 1) 100%);
           transform: translateY(-1px);
           box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
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
           font-size: 0.75em;
           color: var(--text-secondary);
           opacity: 0.6;
         }

        /* Markdown Content Styling */
        .markdown-content {
          line-height: 1.6;
        }

        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          margin: 1em 0 0.5em 0;
          font-weight: 600;
          color: var(--text-primary);
        }

         .markdown-content h1 { 
           font-size: 1.4em; 
           border-bottom: 2px solid rgba(226, 232, 240, 0.6);
           padding-bottom: 0.3em;
           margin: 1.2em 0 0.8em 0;
         }
         .markdown-content h2 { 
           font-size: 1.25em; 
           border-bottom: 1px solid rgba(226, 232, 240, 0.4);
           padding-bottom: 0.2em;
           margin: 1em 0 0.6em 0;
         }
         .markdown-content h3 { 
           font-size: 1.1em; 
           margin: 0.8em 0 0.4em 0;
         }

         .markdown-content p {
           margin: 0 0 1.2em 0;
           line-height: 1.7;
         }

         .markdown-content ul,
         .markdown-content ol {
           margin: 0.8em 0;
           padding-left: 1.5em;
           line-height: 1.6;
         }

         .markdown-content ul {
           list-style-type: disc;
         }

         .markdown-content ul ul {
           list-style-type: circle;
           margin: 0.3em 0;
         }

         .markdown-content ul ul ul {
           list-style-type: square;
         }

         .markdown-content ol {
           list-style-type: decimal;
         }

         .markdown-content li {
           margin: 0.4em 0;
           padding-left: 0.2em;
         }

         .markdown-content li p {
           margin: 0.2em 0;
         }

         .markdown-content hr {
           display: none;  /* Remove all horizontal rules for cleaner appearance */
         }

         .markdown-content table {
           border-collapse: collapse;
           width: 100%;
           margin: 1.2em 0;
           border-radius: 8px;
           overflow: hidden;
         }

         .markdown-content th,
         .markdown-content td {
           border: 1px solid rgba(226, 232, 240, 0.6);
           padding: 0.8em;
           text-align: left;
         }

         .markdown-content th {
           background: rgba(248, 250, 252, 0.8);
           font-weight: 600;
         }

         .markdown-content tr:nth-child(even) {
           background: rgba(248, 250, 252, 0.4);
         }

        .markdown-content blockquote {
          border-left: 3px solid rgba(139, 92, 246, 0.3);
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          color: var(--text-secondary);
        }

        .markdown-content code {
          background: rgba(139, 92, 246, 0.1);
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9em;
          color: var(--text-primary);
        }

        .markdown-content pre {
          background: rgba(248, 250, 252, 0.8);
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 8px;
          padding: 1em;
          overflow-x: auto;
          margin: 1em 0;
        }

        .markdown-content pre code {
          background: transparent;
          padding: 0;
          border-radius: 0;
        }

        .markdown-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
          font-size: 0.9em;
        }

        .markdown-content th,
        .markdown-content td {
          border: 1px solid rgba(226, 232, 240, 0.6);
          padding: 0.5em;
          text-align: left;
        }

        .markdown-content th {
          background: rgba(248, 250, 252, 0.8);
          font-weight: 600;
        }

        .markdown-content a {
          color: rgba(139, 92, 246, 0.8);
          text-decoration: none;
        }

        .markdown-content a:hover {
          text-decoration: underline;
        }

         /* Citations Styling */
         .citations-section {
           margin-top: 1em;
           padding-top: 0.5em;
         }

         .citations-header {
           font-size: 0.75em;
           font-weight: 500;
           color: var(--text-secondary);
           margin-bottom: 0.5em;
           opacity: 0.8;
         }

         .citations-list {
           display: flex;
           flex-wrap: wrap;
           gap: 0.5em;
         }

         .citation-link {
           display: inline-flex;
           align-items: center;
           gap: 0.25em;
           padding: 0.25em 0.5em;
           background: rgba(139, 92, 246, 0.08);
           border: 1px solid rgba(139, 92, 246, 0.15);
           border-radius: 12px;
           text-decoration: none;
           color: rgba(139, 92, 246, 0.8);
           transition: all 0.2s ease;
           font-size: 0.75em;
           max-width: 200px;
         }

         .citation-link:hover {
           background: rgba(139, 92, 246, 0.12);
           border-color: rgba(139, 92, 246, 0.25);
         }

         .citation-number {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 16px;
           height: 16px;
           background: rgba(139, 92, 246, 0.7);
           color: white;
           border-radius: 50%;
           font-size: 0.65em;
           font-weight: 600;
           flex-shrink: 0;
         }

         .citation-title {
           overflow: hidden;
           text-overflow: ellipsis;
           white-space: nowrap;
         }

         /* Message Container Styles */
         .message-container {
           display: flex;
           flex-direction: column;
           gap: 6px;
           margin-bottom: var(--space-4);
         }
         
         .ai-container {
           align-items: flex-start;
         }
         
         .user-container {
           align-items: flex-end;
         }
         
         /* Message Actions Styles */
         .message-actions-container {
           display: flex;
           width: 100%;
         }
         
         .ai-actions-container {
           justify-content: flex-start;  /* AI actions on bottom left */
         }
         
         .user-actions-container {
           justify-content: flex-end;    /* User actions on bottom right */
         }
         
         .message-actions {
           display: flex;
           gap: 4px;
         }
         
         .message-actions.ai-actions {
           opacity: 1;  /* AI actions always visible */
         }
         
         .message-actions.user-actions {
           opacity: 0;  /* User actions hidden by default */
           transition: opacity 0.2s ease;
         }
         
         .message-container:hover .user-actions {
           opacity: 1;  /* Show user actions on hover */
         }

         .action-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 28px;
           height: 28px;
           border: none;
           background: transparent;
           border-radius: 6px;
           color: var(--text-secondary);
           cursor: pointer;
           transition: all 0.2s ease;
           opacity: 0.6;
         }

         .action-btn:hover {
           background: rgba(0, 0, 0, 0.05);
           color: var(--text-primary);
           opacity: 1;
         }

         .copy-btn.copied {
           background: rgba(34, 197, 94, 0.1);
           color: rgba(34, 197, 94, 0.8);
           opacity: 1;
         }

         .like-btn.liked {
           background: rgba(59, 130, 246, 0.1);
           color: rgba(59, 130, 246, 0.8);
           opacity: 1;
         }

         .like-btn:hover {
           background: rgba(59, 130, 246, 0.08);
           color: rgba(59, 130, 246, 0.7);
         }

         .regenerate-btn:hover {
           background: rgba(59, 130, 246, 0.1);
           color: rgba(59, 130, 246, 0.8);
         }

         /* Edit Mode Styles */
         .edit-mode {
           width: 100%;
         }

         .edit-textarea {
           width: 100%;
           min-height: 100px;
           padding: 14px;
           border: 1px solid rgba(139, 92, 246, 0.3);
           border-radius: 10px;
           background: rgba(255, 255, 255, 0.95);
           font-family: inherit;
           font-size: 0.9em;
           line-height: 1.6;
           color: var(--text-primary);
           resize: vertical;
           outline: none;
           margin-bottom: 10px;
           transition: all 0.2s ease;
         }

         .edit-textarea:focus {
           border-color: rgba(139, 92, 246, 0.5);
           background: rgba(255, 255, 255, 1);
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
         }

         .edit-actions {
           display: flex;
           gap: 10px;
           justify-content: flex-end;
         }

         .edit-save-btn {
           display: flex;
           align-items: center;
           gap: 6px;
           padding: 8px 16px;
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
           color: white;
           border: none;
           border-radius: 8px;
           font-size: 0.85em;
           font-weight: 500;
           cursor: pointer;
           transition: all 0.2s ease;
         }

         .edit-save-btn:hover {
           background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(124, 58, 237, 1) 100%);
           transform: translateY(-1px);
           box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
         }

         .edit-cancel-btn {
           display: flex;
           align-items: center;
           gap: 6px;
           padding: 8px 16px;
           background: rgba(107, 114, 128, 0.1);
           color: var(--text-secondary);
           border: 1px solid rgba(107, 114, 128, 0.3);
           border-radius: 8px;
           font-size: 0.85em;
           cursor: pointer;
           transition: all 0.2s ease;
         }

         .edit-cancel-btn:hover {
           background: rgba(107, 114, 128, 0.15);
           border-color: rgba(107, 114, 128, 0.4);
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
          align-items: flex-end;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 25px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          min-height: 56px;
        }

        .chat-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: var(--text-base);
          color: var(--text-primary);
          outline: none;
          padding: var(--space-2) 0;
          resize: none;
          overflow-y: hidden;
          font-family: inherit;
          line-height: 1.5;
          min-height: 24px;
          max-height: 120px;
        }

        .expandable-input {
          field-sizing: content;
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
          flex-shrink: 0;
          margin-bottom: 2px;
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

export default AIChat