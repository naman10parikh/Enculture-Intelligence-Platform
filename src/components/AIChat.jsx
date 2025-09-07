import React, { useState, useRef, useEffect } from 'react'
import { Send, BarChart, Users, MessageSquare, PanelLeft, Plus, Search, History, X, Copy, Edit3, RotateCcw, Check, ThumbsUp, Settings, Eye, FileText, Palette, Type, List, Grid, Sliders, ArrowRight, ArrowLeft, CheckCircle, Target, Tag, Calculator, Globe, Calendar, Users as UsersIcon, Image, Wand2 } from 'lucide-react'
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
  const [canvasView, setCanvasView] = useState('wizard')
  const [surveyStep, setSurveyStep] = useState(1) // Steps: 1=Name, 2=Context, 3=Classifiers, 4=Metrics, 5=Questions, 6=Config, 7=Publish
  const [canvasMode, setCanvasMode] = useState('split') // 'split', 'focus', 'chat-only'
  const [canvasWidth, setCanvasWidth] = useState(500) // Resizable canvas width
  const [isDragging, setIsDragging] = useState(false)
  const [activeSurveyId, setActiveSurveyId] = useState(null)
  const [backendConnected, setBackendConnected] = useState(false)
  const [currentPersona, setCurrentPersona] = useState('employee') // Default persona
  const [surveyDraft, setSurveyDraft] = useState({
    name: '',
    context: '',
    desiredOutcomes: [],
    classifiers: [],
    metrics: [],
    questions: [],
    configuration: {
      backgroundImage: null,
      languages: ['English'],
      targetAudience: [],
      releaseDate: null,
      deadline: null,
      anonymous: true
    },
    branding: {
      primaryColor: '#8B5CF6',
      backgroundColor: '#FAFBFF',
      fontFamily: 'Inter'
    }
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
    setCanvasView('wizard')  // Start in wizard mode
    setSurveyStep(1)         // Reset to step 1
    setCanvasMode('split')   // Default to split mode
    setCanvasOpen(true)
    if (surveyId && surveyId !== 'draft') {
      const data = await fetchSurvey(surveyId)
      setSurveyDraft(prev => ({ ...prev, ...data }))
    }
  }

  // Survey wizard navigation
  const nextStep = () => {
    if (surveyStep < 7) {
      setSurveyStep(surveyStep + 1)
    }
  }

  const prevStep = () => {
    if (surveyStep > 1) {
      setSurveyStep(surveyStep - 1)
    }
  }

  const goToStep = (step) => {
    setSurveyStep(step)
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
      
      // Add user message to UI first
      const userMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: currentInput,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      
      // Open canvas
      openCanvasForSurvey('draft')
      
      // If there's a description, show AI response and generate template
      if (description) {
        // Add AI response message
        const aiMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai', 
          content: `I'll create a professional survey for "${description}". Let me generate that template for you now...`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        
        // Generate template with streaming effect
        setTimeout(() => {
          generateSurveyFromAIStreaming(description)
        }, 1000)
      } else {
        // Just show that canvas was opened
        const aiMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: 'I\'ve opened the Survey Canvas for you. You can now create a professional culture intelligence survey using the editor.',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
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

  // AI Survey Template Generation with Streaming Effect
  const generateSurveyFromAIStreaming = async (description) => {
    try {
      const template = await chatService.generateSurveyTemplate(description)
      if (template) {
        // Start with empty template
        setSurveyDraft(prev => ({ 
          ...prev, 
          name: '',
          context: '',
          desiredOutcomes: [],
          questions: [],
          classifiers: [],
          metrics: []
        }))
        
        // Simulate streaming population
        await new Promise(resolve => {
          let step = 0;
          const interval = setInterval(() => {
            step++;
            
            if (step === 1) {
              // Add name
              setSurveyDraft(prev => ({ ...prev, name: template.title }))
            } else if (step === 2) {
              // Add context
              setSurveyDraft(prev => ({ ...prev, context: template.description }))
            } else if (step === 3) {
              // Add classifiers
              setSurveyDraft(prev => ({ ...prev, classifiers: template.classifiers || [] }))
            } else if (step === 4) {
              // Add metrics
              setSurveyDraft(prev => ({ ...prev, metrics: template.metrics || [] }))
            } else if (step <= 4 + template.questions.length) {
              // Add questions one by one
              const questionIndex = step - 5;
              setSurveyDraft(prev => ({ 
                ...prev, 
                questions: template.questions.slice(0, questionIndex + 1)
              }))
            } else {
              clearInterval(interval)
              resolve()
            }
          }, 800) // 800ms between each step for visible streaming effect
        })
        
        setCanvasView('wizard') // Stay in wizard to show the generated survey
      }
    } catch (error) {
      console.error('Failed to generate survey template:', error)
    }
  }

  // AI Formula Generation
  const generateFormulaFromAI = async (description) => {
    try {
      // Simple formula generation based on description
      if (description.toLowerCase().includes('engagement')) {
        return 'avg(q1,q2,q3)'
      } else if (description.toLowerCase().includes('satisfaction')) {
        return 'avg(satisfaction_questions)'
      } else if (description.toLowerCase().includes('culture')) {
        return 'weighted_avg(culture_q1:0.3,culture_q2:0.7)'
      } else {
        return 'avg(related_questions)'
      }
    } catch (error) {
      console.error('Failed to generate formula:', error)
      return 'avg(q1,q2)'
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
          marginRight: canvasOpen && canvasMode === 'split' ? `${canvasWidth + 16}px` : '0px',
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
          marginRight: canvasOpen && canvasMode === 'split' ? `${canvasWidth + 16}px` : '0px',
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
                className={`view-btn ${canvasView === 'wizard' ? 'active' : ''}`} 
                onClick={() => setCanvasView('wizard')}
                title="Survey Creation Wizard"
              >
                <Wand2 size={16} />
                <span>Create</span>
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
                title="Survey Analytics"
              >
                <Settings size={16} />
                <span>Analytics</span>
              </button>
            </div>
            
            <div className="canvas-actions">
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
          {canvasView === 'wizard' ? (
            <div className="survey-wizard">
              {/* Progress Indicator */}
              <div className="wizard-progress">
                <div className="progress-steps">
                  {[
                    { step: 1, icon: FileText, label: 'Name', desc: 'Survey title' },
                    { step: 2, icon: Target, label: 'Context', desc: 'Purpose & outcomes' },
                    { step: 3, icon: Tag, label: 'Classifiers', desc: 'Category labels' },
                    { step: 4, icon: Calculator, label: 'Metrics', desc: 'Analysis formulas' },
                    { step: 5, icon: List, label: 'Questions', desc: 'Survey content' },
                    { step: 6, icon: Settings, label: 'Config', desc: 'Settings & audience' },
                    { step: 7, icon: CheckCircle, label: 'Publish', desc: 'Launch survey' }
                  ].map(({ step, icon: Icon, label, desc }) => (
                    <button
                      key={step}
                      className={`progress-step ${surveyStep >= step ? 'completed' : ''} ${surveyStep === step ? 'active' : ''}`}
                      onClick={() => goToStep(step)}
                    >
                      <div className="step-icon">
                        <Icon size={16} />
                      </div>
                      <div className="step-content">
                        <span className="step-label">{label}</span>
                        <span className="step-desc">{desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step Content */}
              <div className="wizard-content">
                {surveyStep === 1 && (
                  <div className="step-container">
                    <div className="step-header">
                      <h3>Survey Name</h3>
                      <p>What would you like to call your survey?</p>
                    </div>
                    <div className="step-body">
                      <input
                        type="text"
                        className="wizard-input large"
                        value={surveyDraft.name}
                        onChange={e => setSurveyDraft(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Q4 Team Engagement Survey"
                        autoFocus
                      />
                      <div className="ai-suggestion">
                        <button 
                          className="ai-suggest-btn"
                          onClick={() => generateSurveyFromAIStreaming('Generate a creative survey name for employee engagement')}
                        >
                          <Wand2 size={14} />
                          Generate with AI
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {surveyStep === 2 && (
                  <div className="step-container">
                    <div className="step-header">
                      <h3>Context & Desired Outcomes</h3>
                      <p>What's the purpose of this survey and what do you want to achieve?</p>
                    </div>
                    <div className="step-body">
                      <div className="form-group">
                        <label>Survey Context</label>
                        <textarea
                          className="wizard-textarea"
                          value={surveyDraft.context}
                          onChange={e => setSurveyDraft(prev => ({ ...prev, context: e.target.value }))}
                          placeholder="Describe the context and background for this survey..."
                          rows={4}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Desired Outcomes</label>
                        <div className="outcomes-editor">
                          {(surveyDraft.desiredOutcomes || []).map((outcome, index) => (
                            <div key={index} className="outcome-item">
                              <input
                                type="text"
                                value={outcome}
                                onChange={e => {
                                  const updated = [...(surveyDraft.desiredOutcomes || [])]
                                  updated[index] = e.target.value
                                  setSurveyDraft(prev => ({ ...prev, desiredOutcomes: updated }))
                                }}
                                placeholder={`Outcome ${index + 1}`}
                                className="outcome-input"
                              />
                              <button
                                className="remove-btn"
                                onClick={() => {
                                  const updated = [...(surveyDraft.desiredOutcomes || [])]
                                  updated.splice(index, 1)
                                  setSurveyDraft(prev => ({ ...prev, desiredOutcomes: updated }))
                                }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <button
                            className="add-outcome-btn"
                            onClick={() => {
                              const updated = [...(surveyDraft.desiredOutcomes || []), '']
                              setSurveyDraft(prev => ({ ...prev, desiredOutcomes: updated }))
                            }}
                          >
                            <Plus size={14} />
                            Add Outcome
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {surveyStep === 3 && (
                  <div className="step-container">
                    <div className="step-header">
                      <h3>Classifiers</h3>
                      <p>Define up to 5 category labels for data analysis (e.g., Growth Mindset → Empathy)</p>
                    </div>
                    <div className="step-body">
                      <div className="classifiers-grid">
                        {Array.from({ length: 5 }, (_, index) => {
                          const classifier = (surveyDraft.classifiers || [])[index] || { name: '', values: [''] }
                          return (
                            <div key={index} className="classifier-card">
                              <div className="classifier-header">
                                <span className="classifier-number">#{index + 1}</span>
                                <input
                                  type="text"
                                  value={classifier.name}
                                  onChange={e => {
                                    const updated = [...(surveyDraft.classifiers || [])]
                                    while (updated.length <= index) {
                                      updated.push({ name: '', values: [''] })
                                    }
                                    updated[index].name = e.target.value
                                    setSurveyDraft(prev => ({ ...prev, classifiers: updated }))
                                  }}
                                  placeholder="Classifier name"
                                  className="classifier-name-input"
                                />
                              </div>
                              <div className="classifier-values">
                                {(classifier.values || ['']).map((value, valueIndex) => (
                                  <input
                                    key={valueIndex}
                                    type="text"
                                    value={value}
                                    onChange={e => {
                                      const updated = [...(surveyDraft.classifiers || [])]
                                      while (updated.length <= index) {
                                        updated.push({ name: '', values: [''] })
                                      }
                                      const updatedValues = [...(updated[index].values || [''])]
                                      updatedValues[valueIndex] = e.target.value
                                      updated[index].values = updatedValues
                                      setSurveyDraft(prev => ({ ...prev, classifiers: updated }))
                                    }}
                                    placeholder={`Value ${valueIndex + 1}`}
                                    className="classifier-value-input"
                                  />
                                ))}
                                <button
                                  className="add-value-btn"
                                  onClick={() => {
                                    const updated = [...(surveyDraft.classifiers || [])]
                                    while (updated.length <= index) {
                                      updated.push({ name: '', values: [''] })
                                    }
                                    updated[index].values = [...(updated[index].values || []), '']
                                    setSurveyDraft(prev => ({ ...prev, classifiers: updated }))
                                  }}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {surveyStep === 4 && (
                  <div className="step-container">
                    <div className="step-header">
                      <h3>Metrics</h3>
                      <p>Define scores to calculate from survey responses. AI will generate formulas for you.</p>
                    </div>
                    <div className="step-body">
                      <div className="metrics-editor">
                        {(surveyDraft.metrics || []).map((metric, index) => (
                          <div key={index} className="metric-card">
                            <div className="metric-header">
                              <input
                                type="text"
                                value={metric.name || ''}
                                onChange={e => {
                                  const updated = [...(surveyDraft.metrics || [])]
                                  updated[index] = { ...updated[index], name: e.target.value }
                                  setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                                }}
                                placeholder="Metric name (e.g., Employee Engagement Score)"
                                className="metric-name-input"
                              />
                            </div>
                            <textarea
                              value={metric.description || ''}
                              onChange={e => {
                                const updated = [...(surveyDraft.metrics || [])]
                                updated[index] = { ...updated[index], description: e.target.value }
                                setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                              }}
                              placeholder="Describe what this metric measures..."
                              className="metric-description-input"
                              rows={2}
                            />
                            <div className="metric-formula">
                              <span className="formula-label">AI Generated Formula:</span>
                              <code className="formula-display">{metric.formula || 'avg(q1,q2,q3)'}</code>
                              <button 
                                className="generate-formula-btn"
                                onClick={async () => {
                                  // AI generate formula based on description
                                  const formula = await generateFormulaFromAI(metric.description)
                                  const updated = [...(surveyDraft.metrics || [])]
                                  updated[index] = { ...updated[index], formula }
                                  setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                                }}
                              >
                                <Wand2 size={12} />
                                Generate Formula
                              </button>
                            </div>
                            <button
                              className="remove-metric-btn"
                              onClick={() => {
                                const updated = [...(surveyDraft.metrics || [])]
                                updated.splice(index, 1)
                                setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                              }}
                            >
                              <X size={14} />
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          className="add-metric-btn"
                          onClick={() => {
                            const updated = [...(surveyDraft.metrics || []), { name: '', description: '', formula: '' }]
                            setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                          }}
                        >
                          <Plus size={14} />
                          Add Metric
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {surveyStep === 5 && (
                  <div className="step-container">
                    <div className="step-header">
                      <h3>Questions</h3>
                      <p>Create survey questions with response types, requirements, and linked metrics/classifiers.</p>
                    </div>
                    <div className="step-body">
                      <div className="questions-builder">
                        {(surveyDraft.questions || []).map((question, index) => (
                          <div key={index} className="question-builder-card">
                            <div className="question-builder-header">
                              <span className="question-builder-number">{index + 1}</span>
                              <input
                                type="text"
                                value={question.text || ''}
                                onChange={e => {
                                  const updated = [...(surveyDraft.questions || [])]
                                  updated[index] = { ...updated[index], text: e.target.value }
                                  setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                }}
                                placeholder="Enter your question or statement..."
                                className="question-builder-text"
                              />
                              <select
                                value={question.type || 'multiple_choice'}
                                onChange={e => {
                                  const updated = [...(surveyDraft.questions || [])]
                                  updated[index] = { ...updated[index], type: e.target.value }
                                  setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                }}
                                className="question-builder-type"
                              >
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="scale">Rating Scale</option>
                                <option value="text">Text Response</option>
                                <option value="multiple_select">Multiple Select</option>
                                <option value="yes_no">Yes/No</option>
                                <option value="likert">Likert Scale</option>
                              </select>
                            </div>
                            
                            <div className="question-builder-options">
                              <div className="builder-row">
                                <label className="builder-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={question.required || false}
                                    onChange={e => {
                                      const updated = [...(surveyDraft.questions || [])]
                                      updated[index] = { ...updated[index], required: e.target.checked }
                                      setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                    }}
                                  />
                                  <span>Required</span>
                                </label>
                                
                                <div className="linked-selectors">
                                  <select 
                                    value={question.linkedMetric || ''}
                                    onChange={e => {
                                      const updated = [...(surveyDraft.questions || [])]
                                      updated[index] = { ...updated[index], linkedMetric: e.target.value }
                                      setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                    }}
                                    className="metric-selector"
                                  >
                                    <option value="">Link to Metric</option>
                                    {(surveyDraft.metrics || []).map(metric => (
                                      <option key={metric.name} value={metric.name}>{metric.name}</option>
                                    ))}
                                  </select>
                                  
                                  <select
                                    value={question.linkedClassifier || ''}
                                    onChange={e => {
                                      const updated = [...(surveyDraft.questions || [])]
                                      updated[index] = { ...updated[index], linkedClassifier: e.target.value }
                                      setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                    }}
                                    className="classifier-selector"
                                  >
                                    <option value="">Link to Classifier</option>
                                    {(surveyDraft.classifiers || []).filter(c => c.name).map(classifier => (
                                      <option key={classifier.name} value={classifier.name}>{classifier.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              
                              {(question.type === 'multiple_choice' || question.type === 'multiple_select') && (
                                <div className="options-builder">
                                  {(question.options || ['', '']).map((option, optIndex) => (
                                    <input
                                      key={optIndex}
                                      type="text"
                                      value={option}
                                      onChange={e => {
                                        const updated = [...(surveyDraft.questions || [])]
                                        const updatedOptions = [...(updated[index].options || [])]
                                        updatedOptions[optIndex] = e.target.value
                                        updated[index] = { ...updated[index], options: updatedOptions }
                                        setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                      }}
                                      placeholder={`Option ${optIndex + 1}`}
                                      className="option-builder-input"
                                    />
                                  ))}
                                  <button
                                    className="add-option-btn"
                                    onClick={() => {
                                      const updated = [...(surveyDraft.questions || [])]
                                      updated[index] = { 
                                        ...updated[index], 
                                        options: [...(updated[index].options || []), ''] 
                                      }
                                      setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                    }}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        <button
                          className="add-question-btn"
                          onClick={() => {
                            const updated = [...(surveyDraft.questions || []), {
                              id: `q${(surveyDraft.questions || []).length + 1}`,
                              text: '',
                              type: 'multiple_choice',
                              required: false,
                              options: ['', '']
                            }]
                            setSurveyDraft(prev => ({ ...prev, questions: updated }))
                          }}
                        >
                          <Plus size={16} />
                          Add Question
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {surveyStep === 6 && (
                  <div className="step-container">
                    <div className="step-header">
                      <h3>Configuration</h3>
                      <p>Set up survey settings, audience, and timing.</p>
                    </div>
                    <div className="step-body">
                      <div className="config-sections">
                        <div className="config-section">
                          <h4>Appearance</h4>
                          <div className="config-row">
                            <label>Background Image</label>
                            <div className="image-upload">
                              <button className="upload-btn">
                                <Image size={16} />
                                Choose Image
                              </button>
                            </div>
                          </div>
                          <div className="config-row">
                            <label>Languages</label>
                            <div className="languages-selector">
                              {['English', 'Spanish', 'French', 'German'].map(lang => (
                                <label key={lang} className="language-option">
                                  <input
                                    type="checkbox"
                                    checked={(surveyDraft.configuration?.languages || ['English']).includes(lang)}
                                    onChange={e => {
                                      const currentLangs = surveyDraft.configuration?.languages || ['English']
                                      const updated = e.target.checked 
                                        ? [...currentLangs, lang]
                                        : currentLangs.filter(l => l !== lang)
                                      setSurveyDraft(prev => ({ 
                                        ...prev, 
                                        configuration: { ...prev.configuration, languages: updated }
                                      }))
                                    }}
                                  />
                                  <span>{lang}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="config-section">
                          <h4>Audience & Timing</h4>
                          <div className="config-row">
                            <label>Target Audience</label>
                            <input
                              type="text"
                              value={surveyDraft.configuration?.targetAudience || ''}
                              onChange={e => setSurveyDraft(prev => ({ 
                                ...prev, 
                                configuration: { ...prev.configuration, targetAudience: e.target.value }
                              }))}
                              placeholder="e.g., Engineering Team, All Employees"
                              className="config-input"
                            />
                          </div>
                          <div className="config-row">
                            <label>Release Date</label>
                            <input
                              type="datetime-local"
                              value={surveyDraft.configuration?.releaseDate || ''}
                              onChange={e => setSurveyDraft(prev => ({ 
                                ...prev, 
                                configuration: { ...prev.configuration, releaseDate: e.target.value }
                              }))}
                              className="config-input"
                            />
                          </div>
                          <div className="config-row">
                            <label>Response Deadline</label>
                            <input
                              type="datetime-local"
                              value={surveyDraft.configuration?.deadline || ''}
                              onChange={e => setSurveyDraft(prev => ({ 
                                ...prev, 
                                configuration: { ...prev.configuration, deadline: e.target.value }
                              }))}
                              className="config-input"
                            />
                          </div>
                          <div className="config-row">
                            <label className="config-checkbox">
                              <input
                                type="checkbox"
                                checked={surveyDraft.configuration?.anonymous || true}
                                onChange={e => setSurveyDraft(prev => ({ 
                                  ...prev, 
                                  configuration: { ...prev.configuration, anonymous: e.target.checked }
                                }))}
                              />
                              <span>Anonymous responses</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {surveyStep === 7 && (
                  <div className="step-container">
                    <div className="step-header">
                      <h3>Publish Survey</h3>
                      <p>Review and launch your culture intelligence survey to your team.</p>
                    </div>
                    <div className="step-body">
                      <div className="publish-summary">
                        <div className="summary-card">
                          <h4>📊 Survey Overview</h4>
                          <div className="summary-item">
                            <strong>Name:</strong> {surveyDraft.name || 'Untitled Survey'}
                          </div>
                          <div className="summary-item">
                            <strong>Questions:</strong> {(surveyDraft.questions || []).length} questions
                          </div>
                          <div className="summary-item">
                            <strong>Classifiers:</strong> {(surveyDraft.classifiers || []).filter(c => c.name).length} categories
                          </div>
                          <div className="summary-item">
                            <strong>Metrics:</strong> {(surveyDraft.metrics || []).length} analytics
                          </div>
                          <div className="summary-item">
                            <strong>Audience:</strong> {surveyDraft.configuration?.targetAudience || 'All employees'}
                          </div>
                        </div>
                        
                        <div className="publish-actions">
                          <button className="publish-btn primary">
                            <CheckCircle size={18} />
                            Publish Survey
                          </button>
                          <button className="publish-btn secondary">
                            <FileText size={16} />
                            Save as Draft
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="wizard-navigation">
                  <button
                    className="nav-btn secondary"
                    onClick={prevStep}
                    disabled={surveyStep === 1}
                  >
                    <ArrowLeft size={16} />
                    Previous
                  </button>
                  
                  <div className="step-indicator">
                    Step {surveyStep} of 7
                  </div>
                  
                  <button
                    className="nav-btn primary"
                    onClick={nextStep}
                    disabled={surveyStep === 7}
                  >
                    Next
                    <ArrowRight size={16} />
                  </button>
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
         
         /* Survey Wizard Styles */
         .survey-wizard {
           height: 100%;
           display: flex;
           flex-direction: column;
         }
         
         .wizard-progress {
           background: rgba(255, 255, 255, 0.6);
           border-bottom: 1px solid rgba(226, 232, 240, 0.3);
           padding: var(--space-4);
           overflow-x: auto;
         }
         
         .progress-steps {
           display: flex;
           gap: 8px;
           min-width: max-content;
         }
         
         .progress-step {
           display: flex;
           align-items: center;
           gap: 8px;
           padding: 12px 16px;
           background: rgba(248, 250, 252, 0.8);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 12px;
           cursor: pointer;
           transition: all 0.3s ease;
           min-width: 140px;
         }
         
         .progress-step.active {
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%);
           border-color: rgba(139, 92, 246, 0.4);
           box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
         }
         
         .progress-step.completed {
           background: rgba(34, 197, 94, 0.05);
           border-color: rgba(34, 197, 94, 0.3);
           color: rgba(34, 197, 94, 0.8);
         }
         
         .progress-step:hover:not(.active) {
           background: rgba(255, 255, 255, 0.9);
           transform: translateY(-1px);
         }
         
         .step-icon {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 32px;
           height: 32px;
           background: rgba(255, 255, 255, 0.8);
           border-radius: 8px;
           color: var(--text-secondary);
           transition: all 0.2s ease;
         }
         
         .progress-step.active .step-icon {
           background: rgba(139, 92, 246, 0.1);
           color: rgba(139, 92, 246, 0.8);
         }
         
         .progress-step.completed .step-icon {
           background: rgba(34, 197, 94, 0.1);
           color: rgba(34, 197, 94, 0.8);
         }
         
         .step-content {
           display: flex;
           flex-direction: column;
           gap: 2px;
         }
         
         .step-label {
           font-weight: 600;
           font-size: 0.9em;
           color: var(--text-primary);
         }
         
         .step-desc {
           font-size: 0.75em;
           color: var(--text-secondary);
           opacity: 0.8;
         }
         
         .wizard-content {
           flex: 1;
           overflow-y: auto;
           padding: var(--space-6);
         }
         
         .step-container {
           max-width: 600px;
           margin: 0 auto;
         }
         
         .step-header {
           text-align: center;
           margin-bottom: var(--space-6);
         }
         
         .step-header h3 {
           font-size: 1.4em;
           font-weight: 700;
           color: var(--text-primary);
           margin-bottom: var(--space-2);
         }
         
         .step-header p {
           font-size: 0.95em;
           color: var(--text-secondary);
           line-height: 1.6;
         }
         
         .step-body {
           display: flex;
           flex-direction: column;
           gap: var(--space-5);
         }
         
         /* Step 1: Name */
         .wizard-input.large {
           width: 100%;
           font-size: 1.2em;
           font-weight: 600;
           padding: 18px 24px;
           border: 2px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.9);
           border-radius: 16px;
           color: var(--text-primary);
           outline: none;
           text-align: center;
           transition: all 0.3s ease;
         }
         
         .wizard-input.large:focus {
           border-color: rgba(139, 92, 246, 0.5);
           box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
           background: white;
         }
         
         .ai-suggestion {
           display: flex;
           justify-content: center;
           margin-top: var(--space-4);
         }
         
         .ai-suggest-btn {
           display: flex;
           align-items: center;
           gap: 8px;
           padding: 12px 20px;
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%);
           border: 1px solid rgba(139, 92, 246, 0.3);
           border-radius: 12px;
           color: rgba(139, 92, 246, 0.8);
           cursor: pointer;
           font-weight: 500;
           transition: all 0.2s ease;
         }
         
         .ai-suggest-btn:hover {
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.08) 100%);
           transform: translateY(-1px);
         }
         
         /* Step 2: Context */
         .form-group {
           display: flex;
           flex-direction: column;
           gap: 12px;
         }
         
         .form-group label {
           font-weight: 600;
           color: var(--text-primary);
           font-size: 0.95em;
         }
         
         .wizard-textarea {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.9);
           border-radius: 12px;
           padding: 16px 20px;
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           resize: vertical;
           transition: all 0.2s ease;
           line-height: 1.6;
         }
         
         .wizard-textarea:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: white;
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
         }
         
         .outcomes-editor {
           display: flex;
           flex-direction: column;
           gap: 12px;
         }
         
         .outcome-item {
           display: flex;
           align-items: center;
           gap: 12px;
         }
         
         .outcome-input {
           flex: 1;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 10px;
           padding: 12px 16px;
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .outcome-input:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: white;
         }
         
         .remove-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 32px;
           height: 32px;
           background: rgba(239, 68, 68, 0.1);
           border: 1px solid rgba(239, 68, 68, 0.2);
           border-radius: 8px;
           color: rgba(239, 68, 68, 0.7);
           cursor: pointer;
           transition: all 0.2s ease;
         }
         
         .remove-btn:hover {
           background: rgba(239, 68, 68, 0.15);
           border-color: rgba(239, 68, 68, 0.3);
         }
         
         .add-outcome-btn {
           display: flex;
           align-items: center;
           gap: 8px;
           padding: 12px 16px;
           background: rgba(139, 92, 246, 0.05);
           border: 2px dashed rgba(139, 92, 246, 0.3);
           border-radius: 12px;
           color: rgba(139, 92, 246, 0.8);
           cursor: pointer;
           font-weight: 500;
           transition: all 0.2s ease;
         }
         
         .add-outcome-btn:hover {
           background: rgba(139, 92, 246, 0.08);
           border-color: rgba(139, 92, 246, 0.4);
         }

         /* Step 3: Classifiers */
         .classifiers-grid {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
           gap: var(--space-4);
         }
         
         .classifier-card {
           background: rgba(255, 255, 255, 0.9);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 16px;
           padding: var(--space-4);
           transition: all 0.2s ease;
         }
         
         .classifier-card:hover {
           border-color: rgba(139, 92, 246, 0.3);
           box-shadow: 0 4px 16px rgba(139, 92, 246, 0.08);
         }
         
         .classifier-number {
           display: inline-flex;
           align-items: center;
           justify-content: center;
           width: 28px;
           height: 28px;
           background: rgba(139, 92, 246, 0.1);
           color: rgba(139, 92, 246, 0.8);
           border-radius: 50%;
           font-weight: 700;
           font-size: 0.8em;
           margin-bottom: 8px;
         }
         
         .classifier-name-input {
           width: 100%;
           border: none;
           background: rgba(248, 250, 252, 0.6);
           border-radius: 8px;
           padding: 10px 12px;
           font-weight: 600;
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           margin-bottom: 12px;
         }
         
         .classifier-name-input:focus {
           background: white;
           box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
         }
         
         .classifier-values {
           display: flex;
           flex-direction: column;
           gap: 6px;
         }
         
         .classifier-value-input {
           border: 1px solid rgba(226, 232, 240, 0.3);
           background: rgba(248, 250, 252, 0.4);
           border-radius: 6px;
           padding: 8px 10px;
           font-size: 0.8em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .classifier-value-input:focus {
           background: white;
           border-color: rgba(139, 92, 246, 0.3);
         }
         
         .add-value-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 100%;
           height: 32px;
           background: rgba(139, 92, 246, 0.05);
           border: 1px dashed rgba(139, 92, 246, 0.3);
           border-radius: 6px;
           color: rgba(139, 92, 246, 0.7);
           cursor: pointer;
           transition: all 0.2s ease;
         }
         
         .add-value-btn:hover {
           background: rgba(139, 92, 246, 0.08);
         }

         /* Step 4: Metrics */
         .metrics-editor {
           display: flex;
           flex-direction: column;
           gap: var(--space-4);
         }
         
         .metric-card {
           background: rgba(255, 255, 255, 0.9);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 16px;
           padding: var(--space-4);
           transition: all 0.2s ease;
         }
         
         .metric-card:hover {
           border-color: rgba(139, 92, 246, 0.3);
           box-shadow: 0 4px 16px rgba(139, 92, 246, 0.08);
         }
         
         .metric-name-input {
           width: 100%;
           border: none;
           background: rgba(248, 250, 252, 0.6);
           border-radius: 10px;
           padding: 12px 16px;
           font-weight: 600;
           font-size: 1em;
           color: var(--text-primary);
           outline: none;
           margin-bottom: 12px;
         }
         
         .metric-name-input:focus {
           background: white;
           box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
         }
         
         .metric-description-input {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.3);
           background: rgba(248, 250, 252, 0.4);
           border-radius: 8px;
           padding: 12px 16px;
           font-size: 0.85em;
           color: var(--text-primary);
           outline: none;
           resize: vertical;
           margin-bottom: 12px;
         }
         
         .metric-formula {
           display: flex;
           align-items: center;
           gap: 12px;
           padding: 12px;
           background: rgba(248, 250, 252, 0.6);
           border-radius: 8px;
           margin-bottom: 8px;
         }
         
         .formula-label {
           font-size: 0.8em;
           color: var(--text-secondary);
           font-weight: 500;
         }
         
         .formula-display {
           background: rgba(139, 92, 246, 0.1);
           color: rgba(139, 92, 246, 0.8);
           padding: 4px 8px;
           border-radius: 4px;
           font-family: 'Monaco', monospace;
           font-size: 0.8em;
         }
         
         .generate-formula-btn {
           display: flex;
           align-items: center;
           gap: 6px;
           padding: 6px 12px;
           background: rgba(139, 92, 246, 0.1);
           border: 1px solid rgba(139, 92, 246, 0.2);
           border-radius: 6px;
           color: rgba(139, 92, 246, 0.8);
           cursor: pointer;
           font-size: 0.8em;
           font-weight: 500;
           transition: all 0.2s ease;
         }
         
         .generate-formula-btn:hover {
           background: rgba(139, 92, 246, 0.15);
         }
         
         .add-metric-btn {
           display: flex;
           align-items: center;
           gap: 8px;
           padding: 16px;
           background: rgba(139, 92, 246, 0.05);
           border: 2px dashed rgba(139, 92, 246, 0.3);
           border-radius: 16px;
           color: rgba(139, 92, 246, 0.8);
           cursor: pointer;
           font-weight: 600;
           transition: all 0.2s ease;
         }
         
         .add-metric-btn:hover {
           background: rgba(139, 92, 246, 0.08);
         }

         /* Step 5: Questions */
         .questions-builder {
           display: flex;
           flex-direction: column;
           gap: var(--space-4);
         }
         
         .question-builder-card {
           background: rgba(255, 255, 255, 0.9);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 16px;
           padding: var(--space-4);
           transition: all 0.2s ease;
         }
         
         .question-builder-card:hover {
           border-color: rgba(139, 92, 246, 0.3);
           box-shadow: 0 4px 16px rgba(139, 92, 246, 0.08);
         }
         
         .question-builder-header {
           display: flex;
           align-items: center;
           gap: var(--space-3);
           margin-bottom: var(--space-3);
         }
         
         .question-builder-number {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 32px;
           height: 32px;
           background: rgba(139, 92, 246, 0.1);
           color: rgba(139, 92, 246, 0.8);
           border-radius: 50%;
           font-weight: 700;
           font-size: 0.9em;
           flex-shrink: 0;
         }
         
         .question-builder-text {
           flex: 1;
           border: 1px solid rgba(226, 232, 240, 0.3);
           background: rgba(248, 250, 252, 0.6);
           border-radius: 10px;
           padding: 12px 16px;
           font-size: 0.95em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .question-builder-text:focus {
           background: white;
           border-color: rgba(139, 92, 246, 0.3);
           box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
         }
         
         .question-builder-type {
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.9);
           border-radius: 8px;
           padding: 10px 12px;
           font-size: 0.85em;
           color: var(--text-primary);
           cursor: pointer;
           outline: none;
         }
         
         .question-builder-options {
           display: flex;
           flex-direction: column;
           gap: 12px;
         }
         
         .builder-row {
           display: flex;
           align-items: center;
           justify-content: space-between;
           gap: var(--space-3);
         }
         
         .builder-checkbox {
           display: flex;
           align-items: center;
           gap: 8px;
           cursor: pointer;
           font-weight: 500;
           color: var(--text-primary);
         }
         
         .linked-selectors {
           display: flex;
           gap: 8px;
         }
         
         .metric-selector, .classifier-selector {
           border: 1px solid rgba(226, 232, 240, 0.3);
           background: rgba(248, 250, 252, 0.6);
           border-radius: 6px;
           padding: 6px 10px;
           font-size: 0.8em;
           color: var(--text-primary);
           cursor: pointer;
           outline: none;
         }
         
         .options-builder {
           display: flex;
           flex-direction: column;
           gap: 8px;
           margin-left: var(--space-5);
         }
         
         .option-builder-input {
           border: 1px solid rgba(226, 232, 240, 0.3);
           background: rgba(248, 250, 252, 0.4);
           border-radius: 8px;
           padding: 10px 12px;
           font-size: 0.85em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .option-builder-input:focus {
           background: white;
           border-color: rgba(139, 92, 246, 0.3);
         }
         
         .add-option-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           height: 32px;
           background: rgba(139, 92, 246, 0.05);
           border: 1px dashed rgba(139, 92, 246, 0.3);
           border-radius: 6px;
           color: rgba(139, 92, 246, 0.7);
           cursor: pointer;
           transition: all 0.2s ease;
         }
         
         .add-option-btn:hover {
           background: rgba(139, 92, 246, 0.08);
         }
         
         .add-question-btn {
           display: flex;
           align-items: center;
           gap: 12px;
           padding: 20px;
           background: rgba(139, 92, 246, 0.05);
           border: 2px dashed rgba(139, 92, 246, 0.3);
           border-radius: 16px;
           color: rgba(139, 92, 246, 0.8);
           cursor: pointer;
           font-weight: 600;
           font-size: 1em;
           transition: all 0.2s ease;
         }
         
         .add-question-btn:hover {
           background: rgba(139, 92, 246, 0.08);
           border-color: rgba(139, 92, 246, 0.4);
           transform: translateY(-2px);
         }

         /* Step 6: Configuration */
         .config-sections {
           display: flex;
           flex-direction: column;
           gap: var(--space-6);
         }
         
         .config-section {
           background: rgba(255, 255, 255, 0.8);
           border: 1px solid rgba(226, 232, 240, 0.3);
           border-radius: 16px;
           padding: var(--space-4);
         }
         
         .config-section h4 {
           font-size: 1.1em;
           font-weight: 600;
           color: var(--text-primary);
           margin-bottom: var(--space-3);
           padding-bottom: 8px;
           border-bottom: 1px solid rgba(226, 232, 240, 0.3);
         }
         
         .config-row {
           display: flex;
           flex-direction: column;
           gap: 8px;
           margin-bottom: var(--space-3);
         }
         
         .config-row label {
           font-weight: 500;
           color: var(--text-primary);
           font-size: 0.9em;
         }
         
         .config-input {
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 10px;
           padding: 12px 16px;
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .config-input:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: white;
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
         }
         
         .image-upload {
           display: flex;
           align-items: center;
         }
         
         .upload-btn {
           display: flex;
           align-items: center;
           gap: 8px;
           padding: 12px 16px;
           background: rgba(248, 250, 252, 0.8);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 8px;
           color: var(--text-secondary);
           cursor: pointer;
           font-weight: 500;
           transition: all 0.2s ease;
         }
         
         .upload-btn:hover {
           background: rgba(255, 255, 255, 0.9);
           border-color: rgba(139, 92, 246, 0.3);
           color: rgba(139, 92, 246, 0.8);
         }
         
         .languages-selector {
           display: flex;
           flex-wrap: wrap;
           gap: 12px;
         }
         
         .language-option {
           display: flex;
           align-items: center;
           gap: 6px;
           cursor: pointer;
           font-size: 0.85em;
           color: var(--text-primary);
         }
         
         .config-checkbox {
           display: flex;
           align-items: center;
           gap: 8px;
           cursor: pointer;
           font-size: 0.9em;
           color: var(--text-primary);
         }

         /* Step 7: Publish */
         .publish-summary {
           display: flex;
           flex-direction: column;
           gap: var(--space-6);
           align-items: center;
         }
         
         .summary-card {
           background: rgba(255, 255, 255, 0.9);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 16px;
           padding: var(--space-5);
           width: 100%;
           max-width: 400px;
         }
         
         .summary-card h4 {
           font-size: 1.2em;
           font-weight: 700;
           color: var(--text-primary);
           margin-bottom: var(--space-4);
           text-align: center;
         }
         
         .summary-item {
           display: flex;
           justify-content: space-between;
           padding: 8px 0;
           border-bottom: 1px solid rgba(226, 232, 240, 0.2);
           font-size: 0.9em;
         }
         
         .summary-item:last-child {
           border-bottom: none;
         }
         
         .publish-actions {
           display: flex;
           gap: var(--space-3);
         }
         
         .publish-btn {
           display: flex;
           align-items: center;
           gap: 8px;
           padding: 16px 24px;
           border-radius: 12px;
           font-weight: 600;
           font-size: 1em;
           cursor: pointer;
           transition: all 0.3s ease;
           border: none;
         }
         
         .publish-btn.primary {
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
           color: white;
           box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
         }
         
         .publish-btn.primary:hover {
           background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(124, 58, 237, 1) 100%);
           transform: translateY(-2px);
           box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
         }
         
         .publish-btn.secondary {
           background: rgba(248, 250, 252, 0.8);
           border: 1px solid rgba(226, 232, 240, 0.5);
           color: var(--text-primary);
         }
         
         .publish-btn.secondary:hover {
           background: rgba(255, 255, 255, 0.9);
           border-color: rgba(226, 232, 240, 0.7);
         }

         /* Wizard Navigation */
         .wizard-navigation {
           display: flex;
           align-items: center;
           justify-content: space-between;
           padding: var(--space-4) var(--space-6);
           background: rgba(255, 255, 255, 0.6);
           border-top: 1px solid rgba(226, 232, 240, 0.3);
           margin-top: auto;
         }
         
         .nav-btn {
           display: flex;
           align-items: center;
           gap: 8px;
           padding: 12px 20px;
           border-radius: 10px;
           font-weight: 600;
           font-size: 0.9em;
           cursor: pointer;
           transition: all 0.2s ease;
           border: none;
         }
         
         .nav-btn.primary {
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
           color: white;
         }
         
         .nav-btn.primary:hover:not(:disabled) {
           background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(124, 58, 237, 1) 100%);
           transform: translateY(-1px);
         }
         
         .nav-btn.secondary {
           background: rgba(248, 250, 252, 0.8);
           border: 1px solid rgba(226, 232, 240, 0.5);
           color: var(--text-primary);
         }
         
         .nav-btn.secondary:hover:not(:disabled) {
           background: rgba(255, 255, 255, 0.9);
         }
         
         .nav-btn:disabled {
           opacity: 0.4;
           cursor: not-allowed;
         }
         
         .step-indicator {
           font-size: 0.85em;
           color: var(--text-secondary);
           font-weight: 500;
           background: rgba(248, 250, 252, 0.8);
           padding: 8px 16px;
           border-radius: 20px;
           border: 1px solid rgba(226, 232, 240, 0.4);
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
           left: calc(288px + 280px + 8px);  /* Minimal spacing */
           transition: left 0.25s ease; 
         }
         .panel-open .chat-messages { 
           margin-left: calc(280px + 8px);  /* Minimal margin for tighter layout */
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
          padding: var(--space-2) var(--space-3);
          resize: none;
          overflow-y: hidden;
          font-family: inherit;
          line-height: 1.5;
          min-height: 24px;
          max-height: 120px;
          text-align: left;
          vertical-align: middle;
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