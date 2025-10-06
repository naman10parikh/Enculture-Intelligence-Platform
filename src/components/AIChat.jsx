import React, { useState, useRef, useEffect } from 'react'
import { Send, BarChart, Users, MessageSquare, PanelLeft, Plus, Search, History, X, Copy, Edit3, RotateCcw, Check, ThumbsUp, Settings, Eye, FileText, Palette, Type, List, Grid, Sliders, ArrowRight, ArrowLeft, CheckCircle, Target, Tag, Calculator, Globe, Calendar, Users as UsersIcon, Image, Wand2, Shield, Bell, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'  // Add syntax highlighting CSS
import { chatService } from '../services/api'
import { chatThreadsApi } from '../services/chatThreadsApi'
import websocketService from '../services/websocketService'
import surveyService from '../services/surveyApi'
import { useUser } from '../context/UserContext'

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
  const [notifications, setNotifications] = useState([])
  
  // Get user context
  const { currentUser, currentUserId, demoUsers, switchUser } = useUser()
  
  // Check if current user can create surveys
  const canCreateSurveys = currentUser?.canCreateSurveys || false
  
  const [websocketConnected, setWebsocketConnected] = useState(false)
  const [receivedSurveys, setReceivedSurveys] = useState([])
  const [surveyTakingMode, setSurveyTakingMode] = useState(false)
  const [activeSurveyData, setActiveSurveyData] = useState(null)
  const [surveyResponses, setSurveyResponses] = useState({})
  const [surveyAssistantMessages, setSurveyAssistantMessages] = useState([])
  const [surveyAssistantInput, setSurveyAssistantInput] = useState('')
  const [showSurveyAssistant, setShowSurveyAssistant] = useState(false)
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
  
  // State for interactive preview responses
  const [previewResponses, setPreviewResponses] = useState({})
  
  // Chat thread management state
  const [currentThreadId, setCurrentThreadId] = useState(null)
  const [recentThreads, setRecentThreads] = useState([])
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState(null)
  
  // Per-user state storage
  const [userStates, setUserStates] = useState({})
  const [editText, setEditText] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState(null)
  const [likedMessages, setLikedMessages] = useState(new Set())
  const messagesEndRef = useRef(null)
  const previousUserRef = useRef(currentUser?.id)
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

  // Check backend connection on mount and periodically
  useEffect(() => {
    checkBackendConnection()
    
    // Check every 30 seconds
    const interval = setInterval(checkBackendConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  // Initialize app and load user-specific state
  useEffect(() => {
    const initializeApp = async () => {
      // Load user-specific state from localStorage
      if (currentUserId) {
        await loadUserState(currentUserId)
      }
      
      // All users can now load backend threads for consistent experience
      try {
        await loadRecentThreads()
        
        // Create a new thread if none exists and no saved state
        if (!currentThreadId) {
          await createNewThread()
        }
      } catch (error) {
        console.error('Failed to load backend threads for', currentUser?.name, ':', error)
        // Continue with local state if backend fails
        console.log(`${currentUser?.name} continuing with local state due to backend error`)
      }
    }
    
    initializeApp()
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
    // For now, return default or from localStorage with user-specific key
    return localStorage.getItem(`enculture_userPersona_${currentUserId}`) || currentPersona
  }

  // API layer stubs for canvas functionality
  const fetchSurvey = async (surveyId) => {
    await new Promise(r => setTimeout(r, 300))
    return { id: surveyId, ...surveyDraft }
  }

  const saveSurveyDraft = async (draft) => {
    try {
      // Show loading state
      setIsLoading(true)
      
      // Persist to localStorage as backup
      const draftWithTimestamp = {
        ...draft,
        id: draft.id || `survey_${Date.now()}`,
        lastSaved: new Date().toISOString(),
        status: 'draft'
      }
      
      localStorage.setItem(`enculture_surveyDraft_${currentUserId}`, JSON.stringify(draftWithTimestamp))
      
      // Try to save to backend if available
      try {
        const response = await chatService.saveSurveyDraft?.(draftWithTimestamp)
        if (response?.ok) {
          // Backend save successful
          // addNotification('Draft saved successfully!', 'success') // Hidden for clean UX
        }
      } catch (backendError) {
        console.warn('Backend save failed, but local save succeeded:', backendError)
        // addNotification('Draft saved locally (backend unavailable)', 'info') // Hidden for clean UX
      }
      
      // Update the current draft state
      setSurveyDraft(draftWithTimestamp)
      
      await new Promise(r => setTimeout(r, 300)) // UI feedback delay
      return { ok: true, draft: draftWithTimestamp }
    } catch (error) {
      console.error('Failed to save draft:', error)
      addNotification('Failed to save draft', 'error')
      return { ok: false, error: error.message }
    } finally {
      setIsLoading(false)
    }
  }

  const submitSurveyResponses = async (surveyId, responses) => {
    await new Promise(r => setTimeout(r, 400))
    return { ok: true, surveyId, responses }
  }

  // Celebration confetti function
  const triggerConfettiCelebration = () => {
    // Create multiple confetti pieces
    const confettiContainer = document.createElement('div')
    confettiContainer.className = 'confetti-container'
    document.body.appendChild(confettiContainer)

    const colors = ['#8B5CF6', '#A855F7', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']
    const shapes = ['square', 'circle', 'triangle']

    for (let i = 0; i < 150; i++) {
      const confetti = document.createElement('div')
      confetti.className = `confetti confetti-${shapes[Math.floor(Math.random() * shapes.length)]}`
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.left = Math.random() * 100 + '%'
      confetti.style.animationDelay = Math.random() * 3 + 's'
      confetti.style.animationDuration = Math.random() * 3 + 2 + 's'
      confettiContainer.appendChild(confetti)
    }

    // Remove confetti after animation
    setTimeout(() => {
      document.body.removeChild(confettiContainer)
    }, 6000)

    // Show celebration message overlay
    const celebrationOverlay = document.createElement('div')
    celebrationOverlay.className = 'celebration-overlay'
    celebrationOverlay.innerHTML = `
      <div class="celebration-content">
        <div class="celebration-icon">🎉</div>
        <h2 class="celebration-title">Survey Published!</h2>
        <p class="celebration-message">Your survey is now live and has been sent to team members!</p>
      </div>
    `
    document.body.appendChild(celebrationOverlay)

    setTimeout(() => {
      celebrationOverlay.style.opacity = '0'
      setTimeout(() => {
        document.body.removeChild(celebrationOverlay)
      }, 500)
    }, 3000)
  }

  // Canvas control helpers
  // Notification helpers
  const addNotification = (message, type = 'info') => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const notification = { id, message, type, timestamp: Date.now() }
    
    setNotifications(prev => [...prev, notification])
    
    // Auto-remove after 1.5 seconds (ephemeral)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 1500)
  }

  // Survey notification with action
  const addSurveyNotification = (survey) => {
    const id = `survey_notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const notification = { 
      id, 
      message: `New survey available: ${survey.name}`, 
      type: 'survey',
      timestamp: Date.now(),
      survey: survey,
      action: () => openSurveyTaking(survey)
    }
    
    setNotifications(prev => [...prev, notification])
    
    // Auto-remove after 8 seconds (longer for survey notifications)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 8000)
  }

  // Survey taking functions
  const openSurveyTaking = (survey) => {
    setActiveSurveyData(survey)
    setSurveyTakingMode(true)
    setSurveyResponses({}) // Reset responses
    setCanvasOpen(true)
    setCanvasView('survey')
    // addNotification(`Opening survey: ${survey.name}`, 'info') // Hidden for clean UX
  }

  const closeSurveyTaking = () => {
    setSurveyTakingMode(false)
    setActiveSurveyData(null)
    setCanvasView('wizard')
    setSurveyResponses({})
  }

  const updateSurveyResponse = (questionId, response) => {
    setSurveyResponses(prev => ({
      ...prev,
      [questionId]: response
    }))
  }

  // Survey Assistant AI Chat Function
  const handleSurveyAssistantMessage = async () => {
    if (!surveyAssistantInput.trim() || !activeSurveyData) return

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: surveyAssistantInput.trim(),
      timestamp: new Date()
    }

    setSurveyAssistantMessages(prev => [...prev, userMessage])
    setSurveyAssistantInput('')
    setIsLoading(true)

    try {
      // Prepare survey context for AI
      const surveyContext = {
        surveyName: activeSurveyData.name,
        context: activeSurveyData.context,
        questions: activeSurveyData.questions.map((q, index) => ({
          number: index + 1,
          id: q.id,
          question: q.question,
          type: q.response_type,
          options: q.options,
          mandatory: q.mandatory
        })),
        currentResponses: surveyResponses
      }

      const systemPrompt = `You are an AI survey assistant helping a user complete a survey. You have full context of the survey they're taking and should help them understand questions, provide clarification, and reduce survey fatigue.

SURVEY CONTEXT:
- Name: ${surveyContext.surveyName}
- Purpose: ${surveyContext.context}
- Questions: ${JSON.stringify(surveyContext.questions, null, 2)}
- Current Responses: ${JSON.stringify(surveyContext.currentResponses, null, 2)}

GUIDELINES:
1. When asked about specific questions (e.g., "explain question 2"), refer to the exact question text and provide helpful context
2. Help users understand what each question is asking for
3. Provide examples when helpful
4. Be encouraging and supportive to reduce survey fatigue
5. Don't provide answers for the user, but help them understand what's being asked
6. Keep responses concise but helpful
7. Reference question numbers and content accurately

The user is currently taking this survey and may ask for help with specific questions or general guidance.`

      const response = await chatService.sendMessage([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage.content }
      ])

      if (response.content) {
        const aiMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: response.content,
          timestamp: new Date()
        }
        setSurveyAssistantMessages(prev => [...prev, aiMessage])
      }
    } catch (error) {
      console.error('Error with survey assistant:', error)
      const errorMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again or contact support if you need help with the survey.",
        timestamp: new Date()
      }
      setSurveyAssistantMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const submitSurvey = async () => {
    if (!activeSurveyData) return

    try {
      setIsLoading(true)
      
      const result = await surveyService.submitSurveyResponse(
        activeSurveyData.id,
        currentUserId,
        surveyResponses
      )

      if (result.success) {
        addNotification('Survey submitted successfully!', 'success')
        
        // Mark survey as completed in localStorage (using new key for completed surveys)
        const completedSurveys = JSON.parse(localStorage.getItem('enculture_completedSurveys') || '[]')
        if (!completedSurveys.includes(activeSurveyData.id)) {
          completedSurveys.push(activeSurveyData.id)
          localStorage.setItem('enculture_completedSurveys', JSON.stringify(completedSurveys))
        }
        
        // Remove the survey thread from recent threads since it's completed
        setRecentThreads(prev => prev.filter(thread => 
          !(thread.id.startsWith('survey_') && thread.surveyData?.id === activeSurveyData.id)
        ))
        
        closeSurveyTaking()
        
        // Add a chat message about survey completion
        const completionMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `✅ **Survey Complete!**\n\nThank you for completing the survey "${activeSurveyData.name}"! Your responses have been recorded and will help improve our workplace culture. You can view insights from this survey in the Insights dashboard.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, completionMessage])
      }
    } catch (error) {
      console.error('Error submitting survey:', error)
      addNotification('Failed to submit survey', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Check for pending surveys for a user and create notification chat if needed
  const checkAndCreateSurveyNotifications = async (userId) => {
    try {
      // Get all published surveys from the backend API instead of localStorage
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
      const response = await fetch(`${baseUrl}/api/v1/surveys/list`)
      if (!response.ok) {
        console.error('Failed to fetch surveys from backend')
        return
      }
      
      const data = await response.json()
      const allSurveys = data.surveys || []
      
      // Filter for published surveys only
      const publishedSurveys = allSurveys.filter(survey => survey.status === 'published')
      console.log(`🔍 Checking notifications for ${userId}. Found ${publishedSurveys.length} published surveys:`, publishedSurveys)
      
      // Get completed surveys from localStorage (user completion state)
      const completedSurveys = JSON.parse(localStorage.getItem('enculture_completedSurveys') || '[]')
      
      // Find surveys for this user that haven't been completed
      const userSurveys = publishedSurveys.filter(survey => {
        // Check if this user is in the survey's target audience
        const isTargeted = survey.configuration?.target_audience?.includes(userId) || false
        const notCompleted = !completedSurveys.includes(survey.id)
        console.log(`📋 Survey "${survey.name}": targeted for ${userId}=${isTargeted}, not completed=${notCompleted}`)
        return isTargeted && notCompleted
      })
      
      console.log(`📬 Found ${userSurveys.length} surveys for ${userId}:`, userSurveys.map(s => s.name))
      
      if (userSurveys.length > 0) {
        // Create survey notifications for all pending surveys
        for (const survey of userSurveys) {
          const surveyThreadId = `survey_${survey.id}_${userId}`
          
          console.log(`🔄 Creating notification for survey: ${survey.name} (ID: ${surveyThreadId})`)
        
        // Check if we already have this survey thread
        const existingSurveyThread = recentThreads.find(thread => thread.id === surveyThreadId)
        
        if (!existingSurveyThread) {
            // Fetch full survey details to get questions
            try {
              const surveyResponse = await fetch(`${baseUrl}/api/v1/surveys/${survey.id}`)
              if (surveyResponse.ok) {
                const fullSurvey = await surveyResponse.json()
                
          // Create survey notification thread
          const surveyThread = {
            id: surveyThreadId,
                  title: `📋 Survey: ${fullSurvey.name}`,
            message_count: 2,
            updated_at: new Date().toISOString(),
            isSurveyThread: true,
                  surveyData: fullSurvey
          }
          
          // Add to recent threads
          setRecentThreads(prev => [surveyThread, ...prev])
          
                console.log(`✅ Created survey notification for ${userId}: ${fullSurvey.name} with ${fullSurvey.questions?.length || 0} questions`)
              }
            } catch (err) {
              console.error(`Error fetching survey details for ${survey.id}:`, err)
            }
        } else {
            console.log(`ℹ️  Survey thread already exists for ${userId}: ${survey.name}`)
          }
        }
      } else {
        console.log(`📭 No pending surveys found for ${userId}`)
      }
    } catch (error) {
      console.error('❌ Error checking survey notifications:', error)
    }
  }

  // Survey publishing function
  const handlePublishSurvey = async () => {
    if (!surveyDraft.name || !surveyDraft.questions || surveyDraft.questions.length === 0) {
      addNotification('Please complete the survey before publishing', 'warning')
      return
    }

    try {
      setIsLoading(true)
      
      // First create the survey
      const surveyData = {
        name: surveyDraft.name || 'Untitled Survey',
        context: surveyDraft.context || 'Survey created to gather feedback and insights.',
        desired_outcomes: surveyDraft.desiredOutcomes || ['Gather feedback', 'Identify improvements'],
        classifiers: surveyDraft.classifiers || [],
        metrics: surveyDraft.metrics || [],
        questions: (surveyDraft.questions || []).filter(q => q.text || q.question).map((q, index) => ({
          id: q.id || `q${index + 1}`,
          question: q.text || q.question || '',
          response_type: q.type || q.response_type || 'multiple_choice',
          options: q.options || [],
          mandatory: q.required || q.mandatory || false
        })),
        configuration: {
          ...surveyDraft.configuration,
          target_audience: surveyDraft.configuration?.selectedEmployees || [],
          anonymous: surveyDraft.configuration?.anonymous !== false
        },
        branding: surveyDraft.branding || { primary_color: '#8B5CF6' },
        created_by: currentUser?.name || currentUserId || 'Anonymous'
      }

      console.log('📤 Sending survey data to backend:', JSON.stringify(surveyData, null, 2))
      const createdSurvey = await surveyService.createSurvey(surveyData)
      
      // Use the target audience selected in the survey configuration
      const targetAudience = surveyDraft.configuration?.selectedEmployees || []
      
      const publishResult = await surveyService.publishSurvey(
        createdSurvey.id,
        targetAudience
      )

      if (publishResult.success) {
        // Trigger celebration confetti
        triggerConfettiCelebration()
        
        // Store the published survey in localStorage for notifications
        const publishedSurveyData = {
          id: createdSurvey.id,
          name: surveyDraft.name,
          context: surveyDraft.context,
          questions: surveyDraft.questions,
          targetAudience: targetAudience,
          publishedBy: currentUserId,
          publishedAt: new Date().toISOString(),
          completedBy: []
        }
        
        const existingPublishedSurveys = JSON.parse(localStorage.getItem('enculture_publishedSurveys') || '[]')
        existingPublishedSurveys.push(publishedSurveyData)
        localStorage.setItem('enculture_publishedSurveys', JSON.stringify(existingPublishedSurveys))
        
        console.log(`🚀 Survey "${surveyDraft.name}" published to ${targetAudience.length} users:`, targetAudience)
        console.log(`📦 Stored survey data:`, publishedSurveyData)
        
        // Add a chat message about successful publish
        const publishMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `🎉 Your survey "${surveyDraft.name}" has been published successfully! It has been sent to ${publishResult.target_audience_count} team members. You'll receive real-time notifications as responses come in, and you can view analytics in the Insights dashboard.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, publishMessage])
        
        // Clear the draft after successful publish
        clearSavedDraft()
        setSurveyDraft({
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
        setSurveyStep(1)
      }
    } catch (error) {
      console.error('Error publishing survey:', error)
      addNotification('Failed to publish survey', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Survey draft persistence helpers
  const loadSavedDraft = () => {
    try {
      const savedDraft = localStorage.getItem(`enculture_surveyDraft_${currentUserId}`)
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft)
        setSurveyDraft(prev => ({ ...prev, ...parsedDraft }))
        // addNotification('Previous draft loaded successfully', 'success') // Hidden for clean UX
        return parsedDraft
      }
    } catch (error) {
      console.error('Failed to load saved draft:', error)
      addNotification('Failed to load previous draft', 'error')
    }
    return null
  }

  const clearSavedDraft = () => {
    localStorage.removeItem(`enculture_surveyDraft_${currentUserId}`)
    // addNotification('Draft cleared', 'info') // Hidden for clean UX
  }

  // Simple debounce function
  const debounce = (func, wait) => {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // Auto-save functionality
  const autoSave = React.useMemo(
    () => debounce(async (draft) => {
      if (draft.name || draft.context || (draft.questions && draft.questions.length > 0)) {
        try {
          await saveSurveyDraft(draft)
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }
    }, 3000),
    []
  )

  // Effect to auto-save when survey draft changes
  React.useEffect(() => {
    if (canvasOpen && surveyDraft && Object.keys(surveyDraft).length > 0) {
      autoSave(surveyDraft)
    }
  }, [surveyDraft, canvasOpen, autoSave])

  // Save current user state before switching - with localStorage persistence
  const saveCurrentUserState = (userId) => {
    if (!userId) return
    
    const currentState = {
      messages,
      currentThreadId,
      recentThreads,
      notifications: notifications.filter(n => n.type !== 'info'), // Don't persist switching notifications
      surveyTakingMode,
      activeSurveyData,
      surveyResponses,
      receivedSurveys,
      savedAt: new Date().toISOString()
    }
    
    // Save to memory
    setUserStates(prev => ({
      ...prev,
      [userId]: currentState
    }))
    
    // Save to localStorage with user-specific key
    try {
      localStorage.setItem(`enculture_userState_${userId}`, JSON.stringify(currentState))
    } catch (error) {
      console.error('Failed to save user state to localStorage:', error)
    }
  }

  // Generate consistent initial data for all users - same logic across profiles
  const getMockDataForUser = (userId) => {
    const currentTime = new Date().toISOString();
    const threadId = `local_${userId}_${Date.now()}`;
    
    // All users get the same initial experience - no profile-specific preset messages
    return {
      messages: initialMessages,
      currentThreadId: threadId,
      recentThreads: [{
        id: threadId,
        title: 'New Chat',
        message_count: 1,
        updated_at: currentTime
      }]
    };
  };

  // Load user state when switching with role-specific defaults - with localStorage persistence
  const loadUserState = async (userId) => {
    if (!userId) return
    
    let savedState = userStates[userId]
    
    // Try to load from localStorage if not in memory
    if (!savedState) {
      try {
        const localStorageState = localStorage.getItem(`enculture_userState_${userId}`)
        if (localStorageState) {
          savedState = JSON.parse(localStorageState)
          
          // Update userStates with loaded data
          setUserStates(prev => ({
            ...prev,
            [userId]: savedState
          }))
        }
      } catch (error) {
        console.error('Failed to load user state from localStorage:', error)
      }
    }
    
    const user = demoUsers.find(u => u.id === userId)
    
    if (savedState) {
      // Load saved state
      setMessages(savedState.messages || initialMessages)
      setCurrentThreadId(savedState.currentThreadId)
      setRecentThreads(savedState.recentThreads || [])
      setNotifications(savedState.notifications || [])
      setSurveyTakingMode(savedState.surveyTakingMode || false)
      setActiveSurveyData(savedState.activeSurveyData)
      setSurveyResponses(savedState.surveyResponses || {})
      setReceivedSurveys(savedState.receivedSurveys || [])
    } else {
      // First time loading this user - set role-specific defaults with mock data
      const mockData = getMockDataForUser(userId);
      
      setMessages(mockData.messages)
      setCurrentThreadId(mockData.currentThreadId)
      setRecentThreads(mockData.recentThreads)
      setNotifications([])
      setSurveyTakingMode(false)
      setActiveSurveyData(null)
      setSurveyResponses({})
      setReceivedSurveys([])
      
      // Each user gets their own isolated chat environment
      console.log(`${user?.name} (${user?.role}) starting with mock chat history`)
      
      // All users can now load backend threads for consistent AI responses
      try {
        await loadRecentThreads()
        console.log(`${user?.name} loaded backend threads successfully`)
      } catch (error) {
        console.error('Failed to load backend threads for', user?.name, ':', error)
        // Fallback to mock data if backend fails
        console.log(`${user?.name} loaded with ${mockData.recentThreads.length} mock threads due to backend error`)
      }
    }
    
    // Always check for survey notifications after loading user state
    await checkAndCreateSurveyNotifications(userId)
  }

  // User switching is now handled in useEffect above

  // WebSocket connection effect
  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect(currentUserId)

    // Set up event listeners
    const handleWebSocketConnected = () => {
      setWebsocketConnected(true)
      // Removed notification - keeping UX clean
    }

    const handleWebSocketDisconnected = () => {
      setWebsocketConnected(false)
      // Only show disconnection notice if it's a persistent issue
    }

    const handleSurveyNotification = (data) => {
      console.log('Survey notification received:', data)
      
      // Add to received surveys
      setReceivedSurveys(prev => [...prev, data.survey])
      
      // Add survey as a chat message card
      const surveyMessage = {
        id: `survey_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'survey',
        content: `📋 **Survey Ready**: ${data.survey.name}`,
        survey: data.survey,
        timestamp: new Date(),
        sender: 'system'
      }
      
      // Add survey message to current chat
      setMessages(prev => [...prev, surveyMessage])
      
      // Also show a brief popup notification
      addSurveyNotification(data.survey)
    }

    const handleWebSocketError = (error) => {
      console.error('WebSocket error:', error)
      // Removed notification - keeping UX clean
    }

    // Attach event listeners
    websocketService.on('connected', handleWebSocketConnected)
    websocketService.on('disconnected', handleWebSocketDisconnected)
    websocketService.on('survey_notification', handleSurveyNotification)
    websocketService.on('error', handleWebSocketError)

    // Cleanup on unmount
    return () => {
      websocketService.off('connected', handleWebSocketConnected)
      websocketService.off('disconnected', handleWebSocketDisconnected)
      websocketService.off('survey_notification', handleSurveyNotification)
      websocketService.off('error', handleWebSocketError)
      websocketService.disconnect()
    }
  }, [currentUserId])

  // Effect to handle user switching from sidebar
  useEffect(() => {
    if (currentUser?.id && previousUserRef.current && previousUserRef.current !== currentUser.id) {
      // Save previous user's state before switching
      saveCurrentUserState(previousUserRef.current);
      
      // Load new user's state
      loadUserState(currentUser.id);
      
      console.log(`User switched from ${previousUserRef.current} to ${currentUser.id}`);
    }
    
    // Update the ref for next time
    previousUserRef.current = currentUser?.id;
  }, [currentUser?.id])

  // Initial load effect removed - now handled in main initialization useEffect above

  // Auto-save user state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser?.id) {
        saveCurrentUserState(currentUser.id)
      }
    }, 5000) // Save every 5 seconds

    return () => clearInterval(interval)
  }, [messages, currentThreadId, recentThreads, notifications, surveyTakingMode, activeSurveyData, surveyResponses, receivedSurveys, currentUser?.id])

  const openCanvasForSurvey = async (surveyId = 'draft', overrideDraft = false) => {
    setActiveSurveyId(surveyId)
    setCanvasView('wizard')  // Start in wizard mode
    setSurveyStep(1)         // Reset to step 1
    setCanvasMode('split')   // Default to split mode
    setCanvasOpen(true)
    if (surveyId && surveyId !== 'draft') {
      const data = await fetchSurvey(surveyId)
      setSurveyDraft(prev => ({ ...prev, ...data }))
    } else {
      // Only load saved draft if not overriding
      if (!overrideDraft) {
      loadSavedDraft()
      } else {
        // Clear any existing draft and start fresh
        clearSavedDraft()
        setSurveyDraft({
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
            selectedEmployees: [],
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
      }
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
  const flipCanvasView = () => setCanvasView(prev => (prev === 'wizard' ? 'preview' : 'wizard'))

  // Chat thread management functions
  const loadRecentThreads = async () => {
    try {
      setThreadsLoading(true)
      const threads = await chatThreadsApi.getRecentThreads(currentUserId, 10)
      setRecentThreads(threads)
    } catch (error) {
      console.error('Failed to load recent threads:', error)
    } finally {
      setThreadsLoading(false)
    }
  }

  const createNewThread = async () => {
    try {
      // STRICT new chat logic: Check if current chat is empty OR any existing thread is empty
      const currentChatIsEmpty = messages.length <= 1 || 
        (messages.length === 1 && messages[0].type === 'ai' && messages[0].content.includes("I'm your Culture Intelligence Assistant"))
      
      const hasEmptyThread = recentThreads.some(thread => 
        (thread.message_count === 0 || !thread.message_count) && 
        (!thread.title || thread.title === 'New Chat')
      )
      
      // If current chat is empty, don't create new - just stay in current
      if (currentChatIsEmpty) {
        console.log('Current chat is empty - not creating new thread')
        return
      }
      
      // If there's already an empty thread, switch to it instead of creating new
      if (hasEmptyThread) {
        const emptyChat = recentThreads.find(thread => 
          (thread.message_count === 0 || !thread.message_count) && 
          (!thread.title || thread.title === 'New Chat')
        )
        if (emptyChat) {
          console.log('Found existing empty thread - switching to it')
          await switchToThread(emptyChat.id)
          return
        }
      }
      
      // Only create a new thread if no empty chat exists
      // All users can now create backend threads for consistent AI responses
      try {
        const newThread = await chatThreadsApi.createThread(null, currentUserId)
        setCurrentThreadId(newThread.id)
        setMessages([]) // Clear current messages
        await loadRecentThreads() // Refresh the list
        console.log(`${currentUser?.name} created backend thread: ${newThread.id}`)
      } catch (error) {
        console.error('Failed to create backend thread, falling back to local:', error)
        // Fallback to local thread if backend fails
        const localThreadId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        setCurrentThreadId(localThreadId)
        setMessages([]) // Clear current messages
        setRecentThreads([{ id: localThreadId, title: 'New Chat', message_count: 0, updated_at: new Date().toISOString() }])
        console.log(`${currentUser?.name} created fallback local thread: ${localThreadId}`)
      }
    } catch (error) {
      console.error('Failed to create new thread:', error)
    }
  }

  const switchToThread = async (threadId) => {
    try {
      // Check if this is a survey thread
      if (threadId.startsWith('survey_')) {
        const surveyThread = recentThreads.find(thread => thread.id === threadId)
        if (surveyThread && surveyThread.isSurveyThread && surveyThread.surveyData) {
          setCurrentThreadId(threadId)
          
          // Create survey notification messages
          const surveyMessages = [
            {
              id: `survey-welcome-${Date.now()}`,
              type: 'ai',
              content: `📋 **New Survey Available**\n\nHi ${currentUser?.name}! You have been invited to participate in a new survey: **"${surveyThread.surveyData.name}"**\n\n${surveyThread.surveyData.context}\n\nThis survey will help us understand and improve our workplace culture. Your responses are valuable and will be used to create actionable insights for our team.`,
              timestamp: new Date()
            },
            {
              id: `survey-action-${Date.now()}`,
              type: 'ai',
              content: `🎯 **Ready to get started?**\n\nClick the button below to begin the survey. It should take about 5-10 minutes to complete.\n\n**Survey Details:**\n• ${surveyThread.surveyData.questions.length} questions\n• Anonymous responses\n• Results will be shared with the team\n\n[Take Survey Now]`,
              timestamp: new Date(),
              isSurveyPrompt: true,
              surveyData: surveyThread.surveyData
            }
          ]
          
          setMessages(surveyMessages)
          console.log(`Opened survey thread: ${surveyThread.surveyData.name}`)
          return
        }
      }
      
      // Regular thread handling
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
      const results = await chatThreadsApi.searchThreads(query, currentUserId, 20)
      
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

  // Check if new chat button should be disabled (when current chat is empty)
  const isNewChatDisabled = () => {
    const currentChatIsEmpty = messages.length <= 1 || 
      (messages.length === 1 && messages[0].type === 'ai' && messages[0].content.includes("I'm your Culture Intelligence Assistant"))
    
    const hasEmptyThread = recentThreads.some(thread => 
      (thread.message_count === 0 || !thread.message_count) && 
      (!thread.title || thread.title === 'New Chat')
    )
    
    return currentChatIsEmpty || hasEmptyThread
  }

  // Generate role-specific responses for local threads
  const getRoleSpecificResponse = (input, user) => {
    const inputLower = input.toLowerCase();
    
    // Common responses for all users
    if (inputLower.includes('help') || inputLower.includes('what can you do')) {
      switch (user?.role) {
        case 'Employee':
          return `Hi ${user.name}! As a ${user.role} in ${user.department}, I can help you with:\n\n• Understanding team culture and dynamics\n• Providing feedback on workplace experiences\n• Participating in culture surveys\n• Getting insights on professional development\n• Discussing collaboration and communication\n\nWhat would you like to explore today?`;
        
        case 'HR Admin':
          return `Hello ${user.name}! As an ${user.role}, you have access to advanced features:\n\n• Create and manage culture surveys\n• Analyze team engagement metrics\n• Generate culture insights and reports\n• Track organizational health indicators\n• Develop action plans for culture improvement\n• Monitor survey responses and trends\n\nHow can I assist you with culture intelligence today?`;
        
        default:
          return `Hello ${user.name}! I'm here to help you with culture intelligence. I can assist with team insights, communication patterns, and workplace dynamics. What would you like to know?`;
      }
    }
    
    // Role-specific responses based on input content
    if (user?.role === 'Employee' && user?.department === 'Design') {
      if (inputLower.includes('team') || inputLower.includes('collaboration')) {
        return "Great question about team dynamics! As a designer, effective collaboration is crucial. I can help you understand communication patterns, provide feedback strategies, and suggest ways to enhance creative collaboration across teams. What specific aspect of teamwork would you like to explore?";
      }
      if (inputLower.includes('culture') || inputLower.includes('environment')) {
        return "Culture in creative environments is so important! I can help you understand the current team culture, identify areas for improvement, and suggest ways to foster a more innovative and inclusive design environment. What's your experience been like so far?";
      }
    }
    
    if (user?.role === 'HR Admin') {
      if (inputLower.includes('survey') || inputLower.includes('create')) {
        return "Excellent! As an HR Admin, you can create comprehensive culture surveys. I can help you design questions that capture meaningful insights about employee engagement, team dynamics, and organizational culture. Would you like me to guide you through creating a survey or analyzing existing data?";
      }
      if (inputLower.includes('analytics') || inputLower.includes('metrics')) {
        return "Perfect! I can help you dive deep into culture analytics. We can analyze engagement scores, identify trends across departments, track sentiment over time, and generate actionable insights for leadership. What specific metrics are you most interested in exploring?";
      }
    }
    
    // Default personalized response
    return `Thanks for your message, ${user.name}! As a ${user.role} in ${user.department}, you bring valuable perspective to our culture intelligence platform. I'm here to help you with insights, analysis, and understanding workplace dynamics. Could you tell me more about what you'd like to explore?`;
  };

  const deleteThread = async (threadId) => {
    try {
      // All users can now delete backend threads
      if (!threadId.startsWith('local_')) {
        await chatThreadsApi.deleteThread(threadId)
      }
      
      // Remove from local state for all users
      setRecentThreads(prev => prev.filter(t => t.id !== threadId))
      
      // If deleting current thread, create a new one
      if (threadId === currentThreadId) {
        await createNewThread()
      }
      
      // Refresh backend threads for all users
      if (!threadId.startsWith('local_')) {
        await loadRecentThreads()
      }
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

    // ✨ Enhanced: Check for survey creation/update intent FIRST (before /survey command)
    const surveyIntent = detectSurveyIntent(currentInput)
    
    if (surveyIntent) {
      // Add user message to UI first
      const userMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: currentInput,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      
      // Handle survey creation intent
      if (surveyIntent.type === 'create') {
        // Check if user has permission to create surveys
        if (!canCreateSurveys) {
          const errorMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: `I'm sorry, but your current role (${currentUser?.role || 'Employee'}) doesn't have permission to create surveys. Survey creation is available for Managers, HR Admins, and leadership roles. You can still take surveys and view insights! 📊`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, errorMessage])
          return
        }
        
        // Check if there's an existing draft
        if (hasExistingDraft() && !canvasOpen) {
          const confirmMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: `📋 I noticed you have an existing survey draft with "${surveyDraft.name || 'unsaved work'}". Would you like to:\n\n1️⃣ **Continue editing** the existing draft\n2️⃣ **Start fresh** with a new survey\n\nPlease let me know your preference!`,
            timestamp: new Date()
          }
          setMessages(prev => [...prev, confirmMessage])
          return
        }
        
        // Extract survey description from input
        const description = currentInput
          .replace(/create (a |an )?survey/gi, '')
          .replace(/make (a |an )?survey/gi, '')
          .replace(/generate (a |an )?survey/gi, '')
          .replace(/build (a |an )?survey/gi, '')
          .replace(/(for|about|on)/gi, '')
          .trim()
        
        // Open canvas
        openCanvasForSurvey('draft', true)
        
        // If there's a description, generate template (no intermediate message)
        if (description && description.length > 5) {
          // Show loading state briefly, then generate
          setIsTyping(true)
          setTimeout(() => {
            setIsTyping(false)
            generateSurveyFromAIStreaming(description)
          }, 800)
        } else {
          const aiMessage = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: '📝 I\'ve opened the Survey Creation Wizard for you! You can now build a professional culture intelligence survey step by step. Need help with any section? Just ask!',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, aiMessage])
        }
        return
      }
      
      // Handle update intent with auto-navigation
      if (surveyIntent.type === 'update' && surveyIntent.section) {
        handleSectionEditRequest(surveyIntent.section, currentInput)
        return
      }
    }
    
    // Handle special commands (fallback for explicit /survey command)
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
      
      // Check permission
      if (!canCreateSurveys) {
        const errorMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `I'm sorry, but your current role (${currentUser?.role || 'Employee'}) doesn't have permission to create surveys.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        return
      }
      
      // Open canvas - override any existing draft when using /survey command
      openCanvasForSurvey('draft', true)
      
      // If there's a description, generate template (no intermediate message)
      if (description) {
        setIsTyping(true)
        setTimeout(() => {
          setIsTyping(false)
          generateSurveyFromAIStreaming(description)
        }, 800)
      } else {
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

    // Handle page-specific AI editing requests (single or multi-component)
    const detectedSections = detectAllSectionEdits(currentInput)
    if (detectedSections.length > 0) {
      // Add user message to UI first
      const userMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: currentInput,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])
      
      // Open canvas if not already open
      if (!canvasOpen) {
        openCanvasForSurvey('draft', false) // Don't override existing draft
        addNotification('Opening survey wizard...', 'info')
      }
      
      // Ensure we're in wizard view
      if (canvasView !== 'wizard') {
        setCanvasView('wizard')
      }
      
      // Process multi-component updates if multiple sections detected
      if (detectedSections.length > 1) {
        handleMultiComponentUpdate(detectedSections, currentInput)
      } else {
        // Single section update
        handleSectionEditRequest(detectedSections[0], currentInput)
      }
      return
    }
    
    // Handle "continue" or "start fresh" responses for draft confirmation
    if (hasExistingDraft() && !canvasOpen) {
      const lowerInput = currentInput.toLowerCase()
      if (lowerInput.includes('continue') || lowerInput.includes('existing') || lowerInput.includes('edit') || lowerInput === '1') {
        const confirmMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `Great! I'll open your existing draft "${surveyDraft.name || 'Untitled Survey'}". You can continue where you left off. 📋`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, confirmMessage])
        openCanvasForSurvey('draft', false) // Don't override
        return
      }
      
      if (lowerInput.includes('fresh') || lowerInput.includes('new') || lowerInput.includes('start over') || lowerInput === '2') {
        const confirmMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `Understood! I'll create a brand new survey for you. Your previous draft has been cleared. Let's start fresh! 🆕`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, confirmMessage])
        openCanvasForSurvey('draft', true) // Override/clear
        return
      }
    }

    try {
      if (backendConnected) {
        // All users can use backend API for real AI responses
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
        
        // Add survey context if Canvas is open
        let contextualPrompt = currentInput
        if (canvasOpen && canvasView === 'wizard') {
          const stepNames = ['', 'name', 'context', 'classifiers', 'metrics', 'questions', 'configuration', 'publish']
          const currentStepName = stepNames[surveyStep] || 'unknown'
          
          contextualPrompt = `[Survey Creation Context: Currently working on survey "${surveyDraft.name || 'Untitled'}" at step ${surveyStep} (${currentStepName}). Current survey data: name="${surveyDraft.name}", context="${surveyDraft.context}", ${(surveyDraft.questions || []).length} questions defined, ${(surveyDraft.classifiers || []).filter(c => c.name).length} classifiers, ${(surveyDraft.metrics || []).length} metrics.] User request: ${currentInput}`
        }
        
        // Stop typing animation immediately when stream starts (not after first chunk)
        setIsTyping(false)
        
        await chatThreadsApi.streamChatWithThread(
          currentThreadId,
          contextualPrompt,
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
              // Refresh the threads list to show new title - for all users with backend threads
              if (!currentThreadId.startsWith('local_')) {
                loadRecentThreads()
              }
            }
            
            if (data.done) {
              setIsTyping(false)
              
              // Parse AI response for survey updates if in survey context
              if (canvasOpen && canvasView === 'wizard') {
                parseSurveyUpdatesFromResponse(fullResponse, currentInput)
              }
            }
            
            if (data.error) {
              console.error('Streaming error:', data.error)
              setIsTyping(false)
            }
          }
        )
      } else {
        // Handle local threads (for non-manager users) or backend not available
        const userMessage = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: currentInput,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, userMessage])
        setIsTyping(true)

        // For local threads, provide role-specific responses
        const responseContent = currentThreadId.startsWith('local_') ? 
          getRoleSpecificResponse(currentInput, currentUser) : 
          getFallbackResponse(currentInput);

        setTimeout(() => {
          const aiResponse = {
            id: `ai-${Date.now()}`,
            type: 'ai',
            content: responseContent,
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

      // Stop typing animation immediately when stream starts
      setIsTyping(false)
      
      // Stream response from backend
      let fullResponse = ''
      
      await chatThreadsApi.streamChatWithThread(
        currentThreadId,
        userMessage.content,
        (data) => {
          if (data.content) {
            fullResponse += data.content
            
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
        // Transform questions from backend format to frontend format
        const transformedQuestions = (template.questions || []).map(q => ({
          id: q.id,
          text: q.question || q.text || '',
          description: q.description || '',
          type: q.response_type || q.type || 'multiple_choice',
          options: q.options || [],
          required: q.mandatory !== undefined ? q.mandatory : (q.required || false),
          linkedMetric: q.linkedMetric || '',
          linkedClassifier: q.linkedClassifier || ''
        }))
        
        setSurveyDraft(prev => ({ 
          ...prev, 
          ...template,
          questions: transformedQuestions
        }))
        setCanvasView('editor') // Switch to editor to show the generated survey
      }
    } catch (error) {
      console.error('Failed to generate survey template:', error)
    }
  }

  // AI Survey Template Generation - Manual Navigation
  const generateSurveyFromAIStreaming = async (description) => {
    try {
      console.log('Generating survey template for:', description)
      const template = await chatService.generateSurveyTemplate(description)
      console.log('Received template:', template)
      
      if (template) {
        // Open the canvas if it's not already open
        if (!canvasOpen) {
          setCanvasOpen(true)
        }
        
        // Transform questions from backend format (question field) to frontend format (text field)
        const transformedQuestions = (template.questions || []).map(q => ({
          id: q.id,
          text: q.question || q.text || '', // Backend uses 'question', frontend uses 'text'
          description: q.description || '', // Helper text for respondents
          type: q.response_type || q.type || 'multiple_choice',
          options: q.options || [],
          required: q.mandatory !== undefined ? q.mandatory : (q.required || false),
          linkedMetric: q.linkedMetric || '', // Which metric this question measures
          linkedClassifier: q.linkedClassifier || '' // Which classifier to segment by
        }))
        
        // Start at step 1 and populate all data at once for manual navigation
        setSurveyStep(1)
        setSurveyDraft(prev => ({ 
          ...prev, 
          name: template.name || template.title || '',
          context: template.context || template.description || '',
          desiredOutcomes: template.desiredOutcomes || [],
          questions: transformedQuestions,
          classifiers: template.classifiers || [],
          metrics: template.metrics || []
        }))
        
        setCanvasView('wizard') // Stay in wizard to show the generated survey
        
        // Add dynamic success message to chat
        const numQuestions = (template.questions || []).length
        const numMetrics = (template.metrics || []).length
        const surveyName = template.name || 'your survey'
        
        // Create a more natural, varied message
        const successVariants = [
          `I've created "${surveyName}" with ${numQuestions} carefully crafted questions and ${numMetrics} analytics metrics. The survey is ready for your review in the wizard! Feel free to customize any aspect.`,
          `Your survey "${surveyName}" is ready! I've designed ${numQuestions} questions that will help measure the key areas you're interested in, along with ${numMetrics} metrics for deeper insights. Check it out in the wizard on the right.`,
          `Done! "${surveyName}" includes ${numQuestions} research-backed questions and ${numMetrics} measurement metrics. Take a look in the survey wizard and adjust anything you'd like to refine.`
        ]
        
        const randomVariant = successVariants[Math.floor(Math.random() * successVariants.length)]
        
        const successMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: randomVariant,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, successMessage])
            } else {
        // Add error message to chat
        const errorMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `❌ I couldn't generate the survey template. Please try again with a more specific description.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Failed to generate survey template:', error)
      
      // Add error message to chat
      const errorMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: `❌ There was an error generating the survey template: ${error.message}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  // Enhanced: Detect user intent for survey creation, updates, or modifications
  const detectSurveyIntent = (input) => {
    const lowerInput = input.toLowerCase()
    
    // Intent patterns for survey creation
    const createPatterns = [
      'create a survey', 'create survey', 'make a survey', 'make survey',
      'new survey', 'build a survey', 'build survey', 'generate a survey',
      'generate survey', 'design a survey', 'design survey', 'set up a survey',
      'set up survey', 'start a survey', 'start survey', 'i want to create',
      'i need to create', 'help me create', 'can you create'
    ]
    
    // Intent patterns for survey updates (when canvas is open)
    const updatePatterns = [
      'update the', 'change the', 'modify the', 'edit the', 'revise the',
      'improve the', 'enhance the', 'fix the', 'correct the', 'adjust the'
    ]
    
    const isCreateIntent = createPatterns.some(pattern => lowerInput.includes(pattern))
    const isUpdateIntent = updatePatterns.some(pattern => lowerInput.includes(pattern))
    
    if (isCreateIntent) {
      return { type: 'create', input }
    }
    
    if (isUpdateIntent && canvasOpen) {
      return { type: 'update', section: detectSectionEditRequest(input), input }
    }
    
    return null
  }

  // Detect ALL sections mentioned in a request (for multi-component updates)
  const detectAllSectionEdits = (input) => {
    const lowerInput = input.toLowerCase()
    const detectedSections = []
    
    // Check for each section type
    if (lowerInput.includes('language') || lowerInput.includes('spanish') || lowerInput.includes('french') || 
        lowerInput.includes('german') || lowerInput.includes('translation') ||
        lowerInput.includes('anonymous') || lowerInput.includes('deadline') || lowerInput.includes('release date') ||
        lowerInput.includes('target audience') || lowerInput.includes('selected employees') ||
        lowerInput.includes('config') || lowerInput.includes('setting')) {
      detectedSections.push('configuration')
    }
    
    if (lowerInput.includes('question') || lowerInput.includes('response type') || 
        lowerInput.includes('required') || lowerInput.includes('mandatory') ||
        lowerInput.includes('optional') || lowerInput.match(/question\s*\d+/)) {
      detectedSections.push('questions')
    }
    
    if (lowerInput.includes('metric') || lowerInput.includes('formula') || lowerInput.includes('analytics')) {
      if (!detectedSections.includes('metrics')) detectedSections.push('metrics')
    }
    
    if (lowerInput.includes('classifier') || lowerInput.includes('categor') || lowerInput.includes('demographic')) {
      detectedSections.push('classifiers')
    }
    
    if (lowerInput.includes('desired outcome') || (lowerInput.includes('outcome') && !lowerInput.includes('outcomes'))) {
      detectedSections.push('outcomes')
    }
    
    if (lowerInput.includes('context') || lowerInput.includes('description') || lowerInput.includes('purpose') || lowerInput.includes('background')) {
      detectedSections.push('context')
    }
    
    if ((lowerInput.includes('name') || lowerInput.includes('title')) && !lowerInput.includes('classifier')) {
      detectedSections.push('name')
    }
    
    // Check for action keywords
    const updateKeywords = ['update', 'change', 'modify', 'edit', 'adjust', 'set', 'make']
    const hasUpdateKeyword = updateKeywords.some(keyword => lowerInput.includes(keyword))
    
    // If no specific sections detected but has update keywords, try to infer
    if (detectedSections.length === 0 && hasUpdateKeyword) {
      const actionKeywords = ['fill', 'generate', 'create', 'enhance', 'improve', 'add', 'suggest']
      const hasActionKeyword = actionKeywords.some(keyword => lowerInput.includes(keyword))
      if (hasActionKeyword) {
        detectedSections.push('context') // Default
      }
    }
    
    return detectedSections
  }
  
  // Keep single section detection for backward compatibility
  const detectSectionEditRequest = (input) => {
    const sections = detectAllSectionEdits(input)
    return sections.length > 0 ? sections[0] : null
  }
  
  // Map section names to wizard steps
  const sectionToStep = {
    'name': 1,
    'context': 2,
    'outcomes': 2, // Outcomes are on context page
    'classifiers': 3,
    'metrics': 4,
    'questions': 5,
    'configuration': 6
  }
  
  // Check if there's an existing draft with meaningful content
  const hasExistingDraft = () => {
    return !!(
      surveyDraft.name || 
      surveyDraft.context || 
      (surveyDraft.questions && surveyDraft.questions.length > 0) ||
      (surveyDraft.classifiers && surveyDraft.classifiers.length > 0) ||
      (surveyDraft.metrics && surveyDraft.metrics.length > 0)
    )
  }

  // Handle multi-component updates (when multiple sections are mentioned)
  const handleMultiComponentUpdate = async (sectionTypes, userRequest) => {
    try {
      // Show loading state
      setIsTyping(true)
      addNotification(`Processing updates for ${sectionTypes.length} components...`, 'info')
      
      console.log(`Multi-component update for sections:`, sectionTypes)
      
      // Process all sections in parallel
      const updatePromises = sectionTypes.map(async (sectionType) => {
        try {
          console.log(`Calling aiEditSection for ${sectionType}`)
          const result = await chatService.aiEditSection(
            sectionType,
            surveyDraft,
            userRequest,
            {}
          )
          console.log(`Received result for ${sectionType}:`, result)
          // The service already extracts updated_content, so result IS the content
          return { sectionType, content: result, success: true }
        } catch (error) {
          console.error(`Failed to update ${sectionType}:`, error)
          return { sectionType, error: error.message, success: false }
        }
      })
      
      const results = await Promise.all(updatePromises)
      console.log('All update results:', results)
      
      // Apply all successful updates to the draft
      let newDraft = { ...surveyDraft }
      const successfulSections = []
      const failedSections = []
      
      for (const result of results) {
        if (result.success && result.content) {
          successfulSections.push(result.sectionType)
          
          switch (result.sectionType) {
            case 'name':
              newDraft.name = result.content
              break
            case 'context':
              newDraft.context = result.content
              break
            case 'outcomes':
              newDraft.desiredOutcomes = result.content
              break
            case 'classifiers':
              newDraft.classifiers = result.content
              break
            case 'metrics':
              newDraft.metrics = result.content
              break
            case 'questions':
              // Transform questions
              const transformedQuestions = Array.isArray(result.content) ? result.content.map(q => ({
                id: q.id,
                text: q.text || q.question || '',
                description: q.description || '',
                type: q.type || q.response_type || 'multiple_choice',
                options: q.options || [],
                required: q.required !== undefined ? q.required : (q.mandatory || false),
                linkedMetric: q.linkedMetric || '',
                linkedClassifier: q.linkedClassifier || ''
              })) : result.content
              newDraft.questions = transformedQuestions
              break
            case 'configuration':
              // Merge configuration updates
              newDraft.configuration = { ...(newDraft.configuration || {}), ...result.content }
              break
          }
        } else {
          failedSections.push(result.sectionType)
        }
      }
      
      // Update state with all changes
      setSurveyDraft(newDraft)
      await saveSurveyDraft(newDraft)
      
      setIsTyping(false)
      
      // Navigate to the first updated section
      if (successfulSections.length > 0) {
        const firstSection = successfulSections[0]
        const targetStep = sectionToStep[firstSection]
        if (targetStep) {
          setSurveyStep(targetStep)
        }
      }
      
      // Provide comprehensive feedback
      if (successfulSections.length > 0) {
        const sectionList = successfulSections.join(', ')
        const successMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: `✅ Successfully updated ${successfulSections.length} component(s): ${sectionList}. Review the changes in the wizard!`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, successMessage])
        addNotification(`${successfulSections.length} components updated!`, 'success')
      }
      
      if (failedSections.length > 0) {
        const failedList = failedSections.join(', ')
        addNotification(`Failed to update: ${failedList}`, 'error')
      }
      
    } catch (error) {
      setIsTyping(false)
      console.error('Failed multi-component update:', error)
      addNotification('Failed to process updates', 'error')
      
      const errorMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: `❌ I encountered an issue while processing your updates: ${error.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  // Handle section-specific AI edit requests with auto-navigation
  const handleSectionEditRequest = async (sectionType, userRequest) => {
    try {
      // Show loading state
      setIsTyping(true)
      addNotification(`Processing your ${sectionType} update...`, 'info')
      
      console.log(`Single-component update for ${sectionType}`)
      console.log('Current survey draft:', surveyDraft)
      console.log('User request:', userRequest)
      
      // Call the backend AI section editing service
      const result = await chatService.aiEditSection(
        sectionType,
        surveyDraft,
        userRequest,
        {}
      )
      
      console.log(`Received result for ${sectionType}:`, result)
      
      // The service already extracts updated_content, so result IS the content
      if (!result) {
        throw new Error('No content received from AI service')
      }
      
      // For configuration, even an empty object is valid (no changes needed)
      const updatedContent = result
      
      // Update the survey draft based on section type
      let newDraft = { ...surveyDraft }
      
      switch (sectionType) {
        case 'name':
          newDraft.name = updatedContent
          break
        case 'context':
          newDraft.context = updatedContent
          break
        case 'outcomes':
          newDraft.desiredOutcomes = updatedContent
          break
        case 'classifiers':
          newDraft.classifiers = updatedContent
          break
        case 'metrics':
          newDraft.metrics = updatedContent
          break
        case 'questions':
          // Transform questions if needed
          const transformedQuestions = Array.isArray(updatedContent) ? updatedContent.map(q => ({
            id: q.id,
            text: q.text || q.question || '',
            description: q.description || '',
            type: q.type || q.response_type || 'multiple_choice',
            options: q.options || [],
            required: q.required !== undefined ? q.required : (q.mandatory || false),
            linkedMetric: q.linkedMetric || '',
            linkedClassifier: q.linkedClassifier || ''
          })) : updatedContent
          newDraft.questions = transformedQuestions
          break
        case 'configuration':
          // Merge configuration updates
          newDraft.configuration = { ...(newDraft.configuration || {}), ...updatedContent }
          break
      }
      
      console.log('New draft after update:', newDraft)
      
      // Update state
      setSurveyDraft(newDraft)
      
      // Save draft automatically after updates
      await saveSurveyDraft(newDraft)
      
      setIsTyping(false)
      
      // Navigate to the appropriate wizard step
      const targetStep = sectionToStep[sectionType]
      if (targetStep) {
        setSurveyStep(targetStep)
      }

      // Add success message
      const successMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: `✅ Updated ${sectionType} successfully! Check step ${targetStep || surveyStep} in the wizard to review the changes.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, successMessage])
      
      addNotification(`${sectionType} updated!`, 'success')

    } catch (error) {
      setIsTyping(false)
      console.error('Failed to edit section:', error)
      addNotification(`Failed to update ${sectionType}`, 'error')
      
      const errorMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: `❌ I encountered an issue while updating the ${sectionType} section: ${error.message || 'Unknown error'}. Please try again or make sure the canvas is open with a survey draft.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  // Utility function to format question types for display
  const formatQuestionType = (type) => {
    const typeMap = {
      'multiple_choice': 'Multiple Choice',
      'multiple_select': 'Multiple Select',
      'scale': 'Rating Scale',
      'text': 'Open Text',
      'yes_no': 'Yes/No'
    }
    return typeMap[type] || type
  }

  // Handle preview question responses
  const handlePreviewResponse = (questionId, value) => {
    setPreviewResponses(prev => ({
                ...prev, 
      [questionId]: value
    }))
  }

  // Handle multiple select responses in preview
  const handlePreviewMultiSelect = (questionId, option) => {
    setPreviewResponses(prev => {
      const currentSelections = prev[questionId] || []
      const newSelections = currentSelections.includes(option)
        ? currentSelections.filter(item => item !== option)
        : [...currentSelections, option]
      return {
        ...prev,
        [questionId]: newSelections
      }
    })
  }

  // Parse AI responses for survey field updates
  const parseSurveyUpdatesFromResponse = (aiResponse, userRequest) => {
    try {
      const lowerResponse = aiResponse.toLowerCase()
      const lowerRequest = userRequest.toLowerCase()
      
      // Extract specific field updates based on AI response patterns
      const updates = {}
      
      // Context updates
      if (lowerRequest.includes('context') || lowerRequest.includes('background') || lowerRequest.includes('purpose')) {
        const contextMatch = aiResponse.match(/(?:survey context|background|purpose):\s*["']?([^"'\n]+)["']?/i)
        if (contextMatch) {
          updates.context = contextMatch[1].trim()
        }
      }
      
      // Name/title updates
      if (lowerRequest.includes('name') || lowerRequest.includes('title') || lowerRequest.includes('rename')) {
        const nameMatch = aiResponse.match(/(?:survey (?:name|title)|title):\s*["']?([^"'\n]+)["']?/i)
        if (nameMatch) {
          updates.name = nameMatch[1].trim()
        }
      }
      
      // Desired outcomes updates
      if (lowerRequest.includes('outcome') || lowerRequest.includes('goal') || lowerRequest.includes('objective')) {
        const outcomeMatches = aiResponse.match(/(?:outcomes?|goals?|objectives?):\s*(.+?)(?:\n\n|$)/is)
        if (outcomeMatches) {
          const outcomes = outcomeMatches[1]
            .split(/\n|•|\d+\./)
            .map(o => o.trim())
            .filter(o => o && !o.match(/^[-•]\s*$/))
            .slice(0, 5) // Limit to 5 outcomes
          if (outcomes.length > 0) {
            updates.desiredOutcomes = outcomes
          }
        }
      }
      
      // Questions updates
      if (lowerRequest.includes('question') || lowerRequest.includes('add question')) {
        const questionMatch = aiResponse.match(/(?:question|q\d+):\s*["']?([^"'\n]+)["']?/i)
        if (questionMatch) {
          const newQuestion = {
            id: `q${(surveyDraft.questions || []).length + 1}`,
            text: questionMatch[1].trim(),
            type: 'multiple_choice',
            required: false,
            options: ['Yes', 'No', 'Somewhat']
          }
          updates.questions = [...(surveyDraft.questions || []), newQuestion]
        }
      }
      
      // Classifier updates  
      if (lowerRequest.includes('classifier') || lowerRequest.includes('category')) {
        const classifierMatch = aiResponse.match(/(?:classifier|category):\s*["']?([^"'\n]+)["']?/i)
        if (classifierMatch) {
          const newClassifier = {
            name: classifierMatch[1].trim(),
            values: ['Option 1', 'Option 2', 'Option 3']
          }
          const updatedClassifiers = [...(surveyDraft.classifiers || [])]
          updatedClassifiers.push(newClassifier)
          updates.classifiers = updatedClassifiers
        }
      }
      
      // Apply any detected updates
      if (Object.keys(updates).length > 0) {
        setSurveyDraft(prev => ({ ...prev, ...updates }))
        
        // Show a subtle notification about what was updated
        const updatedFields = Object.keys(updates).join(', ')
        addNotification(`Updated: ${updatedFields}`, 'success')
      }
    } catch (error) {
      console.error('Failed to parse survey updates:', error)
    }
  }

  // Generate intelligent default formula based on selected classifiers
  const generateDefaultFormula = (selectedClassifiers = []) => {
    if (!selectedClassifiers || selectedClassifiers.length === 0) {
      return 'avg(survey_responses)'
    }
    
    const primaryClassifier = selectedClassifiers[0]?.toLowerCase().replace(/\s+/g, '_')
    
    if (selectedClassifiers.length === 1) {
      return `segmented_analysis(avg(responses), group_by_${primaryClassifier})`
    } else if (selectedClassifiers.length === 2) {
      const secondaryClassifier = selectedClassifiers[1]?.toLowerCase().replace(/\s+/g, '_')
      return `cross_analysis(avg(responses), ${primaryClassifier}_vs_${secondaryClassifier})`
            } else {
      return `multi_dimensional_analysis(responses, [${selectedClassifiers.map(c => c.toLowerCase().replace(/\s+/g, '_')).join(', ')}])`
    }
  }

  // AI Context Enhancement
  const enhanceContextWithAI = async (basicContext, surveyName = '') => {
    try {
      // Check if context is too basic (less than 20 words or very generic)
      const wordCount = basicContext.split(' ').length
      const isVague = wordCount < 20 || 
                      basicContext.toLowerCase().includes('employee satisfaction') ||
                      basicContext.toLowerCase().includes('feedback') ||
                      basicContext.toLowerCase().includes('survey')
      
      if (isVague) {
        // For vague inputs, first try to get clarification through chat
        const clarificationPrompt = `The user provided this basic survey context: "${basicContext}" for survey "${surveyName}". This seems quite vague. Can you suggest 3 specific clarifying questions they should consider to make their survey context more comprehensive and actionable?`
        
        // Instead of auto-asking, we'll enhance with what we have but suggest improvements
        const enhancement = `${basicContext}\n\nSuggested areas to consider:\n- What specific aspects do you want to measure?\n- What recent changes or challenges prompted this survey?\n- What actions will you take based on the results?\n- Who is your target audience and what do they need to know?\n\nChat with AI to refine these details further.`
        
        return enhancement
      }
      
      // For detailed contexts, enhance with structure and best practices
      const enhancementPrompt = `Enhance this survey context to be more comprehensive and structured: "${basicContext}"`
      
      // Try to use backend AI service if available
      if (backendConnected) {
        const response = await chatService.enhanceContext?.(basicContext, surveyName)
        if (response?.enhancedContext) {
          return response.enhancedContext
        }
      }
      
      // Fallback enhancement
      const sections = []
      sections.push(`Background: ${basicContext}`)
      
      if (!basicContext.toLowerCase().includes('objective')) {
        sections.push(`\nObjectives: [AI Suggestion: Define what specific outcomes you're trying to achieve with this survey]`)
      }
      
      if (!basicContext.toLowerCase().includes('audience') && !basicContext.toLowerCase().includes('employee')) {
        sections.push(`\nTarget Audience: [AI Suggestion: Specify which groups/departments this survey targets]`)
      }
      
      if (!basicContext.toLowerCase().includes('confidential') && !basicContext.toLowerCase().includes('anonymous')) {
        sections.push(`\nConfidentiality: Responses will be kept confidential and used only for organizational improvement purposes.`)
      }
      
      return sections.join('')
      
    } catch (error) {
      console.error('Failed to enhance context:', error)
      return basicContext // Return original if enhancement fails
    }
  }

  // AI Formula Generation
  const generateFormulaFromAI = async (description, classifierNames = []) => {
    try {
      // Enhanced formula generation using AI service
      const response = await chatService.generateFormula?.(description, classifierNames)
      if (response && response.formula) {
        return response.formula
      }
      
      // Enhanced fallback intelligent formula generation
      let formula = '';
      const descLower = description.toLowerCase();
      
      if (classifierNames.length > 0) {
        // Create meaningful formulas with classifiers
        const primaryClassifier = classifierNames[0]?.toLowerCase().replace(/\s+/g, '_') || 'segment'
        
        if (descLower.includes('engagement') || descLower.includes('satisfaction')) {
          formula = `engagement_index(avg(responses), weight_by_${primaryClassifier})`
        } else if (descLower.includes('performance') || descLower.includes('productivity')) {
          formula = `performance_score(responses) * classifier_multiplier(${primaryClassifier})`
        } else if (descLower.includes('culture') || descLower.includes('environment')) {
          formula = `culture_health_score(avg(responses), segment_variance(${primaryClassifier}))`
        } else if (descLower.includes('communication')) {
          formula = `communication_effectiveness(avg(responses), cross_${primaryClassifier}_correlation)`
      } else {
          formula = `insight_metric(weighted_avg(responses, ${primaryClassifier}_weights))`
        }
      } else {
        // Intelligent formulas without classifiers
        if (descLower.includes('engagement')) {
          formula = 'engagement_score((q1 + q2 + q3) / 3, response_completeness)'
        } else if (descLower.includes('satisfaction')) {
          formula = 'satisfaction_index(avg(all_responses), response_variance)'
        } else if (descLower.includes('culture')) {
          formula = 'culture_health_indicator(avg(culture_questions), positive_sentiment_ratio)'
        } else if (descLower.includes('performance')) {
          formula = 'performance_metric(weighted_avg(performance_questions))'
        } else if (descLower.includes('communication')) {
          formula = 'communication_score(avg(communication_questions), response_depth)'
        } else {
          formula = 'composite_insight_score(normalized_avg(all_responses))'
        }
      }
      
      return formula;
    } catch (error) {
      console.error('Failed to generate formula:', error)
      return classifierNames.length > 0 
        ? `weighted_avg(responses, ${classifierNames[0]?.toLowerCase().replace(/\s+/g, '_') || 'default'}_weights)`
        : 'avg(all_responses)'
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
              <button 
                className={`panel-item new-chat-btn ${isNewChatDisabled() ? 'disabled' : ''}`}
                onClick={createNewThread}
                disabled={isNewChatDisabled()}
                title={isNewChatDisabled() ? 'Current chat is empty - add content before creating a new chat' : 'Create new chat'}
              >
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
                 <div className="message-wrapper">
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
                      
                      {/* Display survey action button if this is a survey prompt */}
                      {message.isSurveyPrompt && message.surveyData && (
                        <div className="survey-action-section">
                          <button 
                            className="survey-take-btn"
                            onClick={() => {
                              setActiveSurveyData(message.surveyData)
                              setSurveyTakingMode(true)
                              setCanvasOpen(true)
                              setCanvasView('survey')
                            }}
                          >
                            📋 Take Survey Now
                          </button>
                        </div>
                      )}
                    </>
                  ) : message.type === 'survey' ? (
                    <div className="survey-card" onClick={() => openSurveyTaking(message.survey)}>
                      <div className="survey-card-header">
                        <div className="survey-card-icon">📋</div>
                        <div className="survey-card-title">Survey Ready</div>
                      </div>
                      <div className="survey-card-content">
                        <h4>{message.survey.name}</h4>
                        <p>{message.survey.context}</p>
                        <div className="survey-card-meta">
                          <span>👤 From: {message.survey.created_by}</span>
                          <span>⏱️ {message.survey.questions?.length || 0} questions</span>
                        </div>
                      </div>
                      <div className="survey-card-action">
                        <button className="survey-take-btn">
                          <Bell size={16} />
                          Take Survey
                        </button>
                      </div>
                    </div>
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
            <span className="title-text">{surveyDraft.name || 'New Survey'}</span>
          </div>
          </div>
          
          <div className="canvas-toolbar">
            <div className="view-controls">
              {!surveyTakingMode ? (
                <>
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
                </>
              ) : (
                <button 
                  className={`view-btn active`} 
                  title="Taking Survey"
                >
                  <Bell size={16} />
                  <span>Taking Survey</span>
                </button>
              )}
            </div>
            
            <div className="canvas-actions">
              {!surveyTakingMode && canCreateSurveys && surveyStep < 7 ? (
                <>
                  <button 
                    className="save-btn" 
                    onClick={async () => { 
                      const result = await saveSurveyDraft(surveyDraft)
                      // Removed persistent notification for better UX
                      // Success is already indicated by visual feedback
                    }}
                  >
                    💾 Save Draft
                  </button>
                </>
              ) : null}
              <button className="close-btn" onClick={() => {
                if (surveyTakingMode) {
                  closeSurveyTaking()
                } else {
                  setCanvasOpen(false)
                }
              }}>
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="canvas-body">
          {canvasView === 'wizard' && (
            <div className="survey-wizard">
              {/* Progress Indicator */}
              <div className="wizard-progress">
                <div className="progress-indicator">
                  <div className="current-step-info">
                    {(() => {
                      const stepInfo = [
                        { step: 1, icon: FileText, label: 'Name', desc: 'Give your survey a clear, descriptive title' },
                        { step: 2, icon: Target, label: 'Context', desc: 'Define the purpose and goals of your survey' },
                        { step: 3, icon: Tag, label: 'Classifiers', desc: 'Create categories to segment and analyze responses' },
                        { step: 4, icon: Calculator, label: 'Metrics', desc: 'Define formulas to measure key insights from your data' },
                        { step: 5, icon: List, label: 'Questions', desc: 'Craft questions that will gather meaningful feedback' },
                        { step: 6, icon: Settings, label: 'Configuration', desc: 'Set up timing, audience, and survey preferences' },
                        { step: 7, icon: CheckCircle, label: 'Publish', desc: 'Review and launch your survey to selected recipients' }
                      ].find(s => s.step === surveyStep)
                      const Icon = stepInfo.icon
                      return (
                        <div className="minimal-step-header">
                          <div className="step-icon-title-row">
                            <Icon size={18} />
                            <h2 className="step-title-minimal">{stepInfo.label}</h2>
                            </div>
                          <div className="step-explanation">
                            <em>{stepInfo.desc}</em>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${(surveyStep / 7) * 100}%`}}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Step Content */}
              <div className="wizard-content">
                {surveyStep === 1 && (
                  <div className="step-container">
                    <div className="step-body">
                      <textarea
                        className="wizard-input large name-field-wrap"
                        value={surveyDraft.name}
                        onChange={e => {
                          setSurveyDraft(prev => ({ ...prev, name: e.target.value }))
                          // Auto-expand on change
                          e.target.style.height = 'auto'
                          e.target.style.height = e.target.scrollHeight + 'px'
                        }}
                        placeholder="e.g., Q4 Team Engagement Survey"
                        autoFocus
                        rows={1}
                        style={{
                          resize: 'none',
                          overflow: 'hidden',
                          minHeight: '3rem',
                          maxHeight: '12rem' // Prevent it from getting too tall
                        }}
                        onInput={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        ref={(el) => {
                          // Auto-expand when value is set programmatically
                          if (el && surveyDraft.name) {
                            el.style.height = 'auto'
                            el.style.height = el.scrollHeight + 'px'
                          }
                        }}
                      />
                        <div className="enhance-ai-center">
                        <button 
                          className="minimal-enhance-btn"
                          onClick={async () => {
                            try {
                              if (!surveyDraft.name?.trim()) {
                                addNotification('Please enter a survey name first', 'warning')
                                return
                              }
                              
                              addNotification('Enhancing survey name with AI...', 'info')
                              const enhancedName = await chatService.enhanceSurveyName(
                                surveyDraft.name, 
                                surveyDraft.context || ''
                              )
                              
                              if (enhancedName && enhancedName !== surveyDraft.name) {
                                setSurveyDraft(prev => ({ ...prev, name: enhancedName }))
                                addNotification('Survey name enhanced successfully!', 'success')
                              } else {
                                addNotification('No enhancements suggested for this name', 'info')
                              }
                            } catch (error) {
                              console.error('Name enhancement error:', error)
                              addNotification('Failed to enhance survey name', 'error')
                            }
                          }}
                          disabled={!surveyDraft.name?.trim()}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Enhance with AI
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {surveyStep === 2 && (
                  <div className="minimal-step-container">
                    <div className="field-group">
                      <label className="field-label-emphatic">Survey Context</label>
                          <textarea
                        className="minimal-textarea"
                            value={surveyDraft.context}
                            onChange={e => setSurveyDraft(prev => ({ ...prev, context: e.target.value }))}
                        placeholder="Describe what you want to learn from this survey..."
                        rows={4}
                      />
                      <div className="enhance-ai-center">
                        <button 
                          className="minimal-enhance-btn"
                          onClick={async () => {
                            if (!surveyDraft.context?.trim()) {
                              alert('Please enter some initial context first')
                              return
                            }
                            
                            try {
                              const enhancedContext = await chatService.enhanceSurveyContext(surveyDraft.context, surveyDraft.name)
                              if (enhancedContext && enhancedContext !== surveyDraft.context) {
                                setSurveyDraft(prev => ({ ...prev, context: enhancedContext }))
                              }
                            } catch (error) {
                              console.error('Failed to enhance context:', error)
                              alert('Failed to enhance context. Please try again.')
                            }
                          }}
                          disabled={!surveyDraft.context?.trim()}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Enhance with AI
                        </button>
                          </div>
                        </div>
                        
                      <div className="field-group">
                        <label className="field-label-emphatic">Desired Outcomes</label>
                        <div className="outcomes-minimal">
                          {(surveyDraft.desiredOutcomes || []).map((outcome, index) => (
                              <div key={index} className="outcome-row">
                                <div className="outcome-number">{index + 1}</div>
                                <input
                                  type="text"
                                  value={outcome}
                                  onChange={e => {
                                    const updated = [...(surveyDraft.desiredOutcomes || [])]
                                    updated[index] = e.target.value
                                    setSurveyDraft(prev => ({ ...prev, desiredOutcomes: updated }))
                                  }}
                                  placeholder="e.g., Improve team communication effectiveness"
                                  className="modern-input"
                                />
                                <button
                                  className="modern-remove-btn"
                                  onClick={() => {
                                    const updated = [...(surveyDraft.desiredOutcomes || [])]
                                    updated.splice(index, 1)
                                    setSurveyDraft(prev => ({ ...prev, desiredOutcomes: updated }))
                                  }}
                                  title="Remove outcome"
                                >
                                  <X size={16} />
                                </button>
                            </div>
                          ))}
                          <button
                            className="modern-add-btn"
                            onClick={() => {
                              const updated = [...(surveyDraft.desiredOutcomes || []), '']
                              setSurveyDraft(prev => ({ ...prev, desiredOutcomes: updated }))
                            }}
                          >
                            <Plus size={16} />
                              <span>Add New Outcome</span>
                          </button>
                            
                      </div>
                    </div>
                  </div>
                )}

                {surveyStep === 3 && (
                  <div className="minimal-step-container">
                    <div className="classifiers-section">
                      <div className="classifiers-grid">
                            {Array.from({ length: 4 }, (_, index) => {
                              const classifier = (surveyDraft.classifiers || [])[index] || { name: '', values: [''] }
                          const suggestions = [
                            { name: 'Classifier 1', values: ['Option A', 'Option B', 'Option C', 'Option D'] },
                            { name: 'Classifier 2', values: ['Category 1', 'Category 2', 'Category 3', 'Category 4'] },
                            { name: 'Classifier 3', values: ['Type A', 'Type B', 'Type C'] },
                            { name: 'Classifier 4', values: ['Group 1', 'Group 2', 'Group 3', 'Group 4'] }
                          ]
                              const suggestion = suggestions[index] || { name: '', values: [] }
                              
                              return (
                              <div key={index} className="classifier-item">
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
                                    placeholder={suggestion.name}
                                    className="classifier-title-input"
                                  />
                                <div className="classifier-values-section">
                                    <label className="section-label">Category Options:</label>
                                    <div className="classifier-values-list">
                                    {(classifier.values || ['']).map((value, valueIndex) => (
                                        <div key={valueIndex} className="value-input-row">
                                        <input
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
                                            placeholder={suggestion.values[valueIndex] || `Option ${valueIndex + 1}`}
                                            className="value-input"
                                        />
                                          {valueIndex > 0 && (
                                          <button
                                              className="remove-value-btn"
                                            onClick={() => {
                                              const updated = [...(surveyDraft.classifiers || [])]
                                                const values = [...(updated[index]?.values || [])]
                                                values.splice(valueIndex, 1)
                                                if (updated[index]) {
                                                  updated[index] = { ...updated[index], values }
                                              setSurveyDraft(prev => ({ ...prev, classifiers: updated }))
                                                }
                                            }}
                                          >
                                              <X size={14} />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                    <button
                                        className="add-option-btn"
                                      onClick={() => {
                                        const updated = [...(surveyDraft.classifiers || [])]
                                          while (updated.length <= index) {
                                            updated.push({ name: '', values: [''] })
                                        }
                                          updated[index].values = [...(updated[index].values || []), '']
                                        setSurveyDraft(prev => ({ ...prev, classifiers: updated }))
                                      }}
                                    >
                                      <Plus size={14} />
                                        <span>Add Option</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              )
                            })}
                        
                        <div className="enhance-ai-center">
                          <button 
                            className="minimal-enhance-btn"
                            onClick={async () => {
                              try {
                                addNotification('Generating classifiers with AI...', 'info')
                                // Generate AI-powered classifiers based on survey context and name
                                const aiClassifiers = await chatService.generateClassifiers(
                                  surveyDraft.context || '', 
                                  surveyDraft.name || ''
                                )
                              
                              setSurveyDraft(prev => ({ 
                                ...prev, 
                                classifiers: aiClassifiers 
                              }))
                              addNotification('Classifiers generated by AI successfully!', 'success')
                            } catch (error) {
                              console.error('Failed to generate classifiers:', error)
                              addNotification('Failed to generate classifiers. Please try again.', 'error')
                            }
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          Enhance with AI
                        </button>
                            </div>
                            </div>
                    </div>
                  </div>
                )}

                {surveyStep === 4 && (
                  <div className="minimal-step-container">
                    <div className="metrics-section">
                      <div className="metrics-list">
                            {(surveyDraft.metrics || [{ name: '', description: '', formula: '' }]).map((metric, index) => (
                              <div key={index} className="modern-metric-card">
                                <div className="metric-card-header">
                                  <div className="metric-badge">
                                    <Calculator size={16} />
                                  </div>
                                  <input
                                    type="text"
                                    value={metric.name || ''}
                                    onChange={e => {
                                      const updated = [...(surveyDraft.metrics || [])]
                                      updated[index] = { ...updated[index], name: e.target.value }
                                      setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                                    }}
                                    placeholder="e.g., Employee Engagement Score"
                                    className="metric-title-input"
                                  />
                                    <button
                                    className="modern-remove-metric-btn"
                                      onClick={() => {
                                      if ((surveyDraft.metrics || []).length > 1) {
                                        const updated = [...(surveyDraft.metrics || [])]
                                        updated.splice(index, 1)
                                        setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                                      }
                                      }}
                                    disabled={(surveyDraft.metrics || []).length <= 1}
                                    >
                                      <X size={16} />
                                    </button>
                                </div>
                                
                                  <textarea
                                    value={metric.description || ''}
                                    onChange={e => {
                                      const updated = [...(surveyDraft.metrics || [])]
                                      updated[index] = { ...updated[index], description: e.target.value }
                                      setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                                    }}
                                  placeholder="Describe what this metric measures and why it's important for your analysis..."
                                  className="metric-description"
                                    rows={3}
                                  />
                                
                                <div className="metric-formula-section">
                                  <div className="formula-header">
                                    <label className="formula-label">Analysis Formula</label>
                                  </div>
                                  
                                  <div className="classifier-selection">
                                    <label className="selection-label">Include Classifiers:</label>
                                    <div className="classifier-checkboxes">
                                      {(surveyDraft.classifiers || []).filter(c => c.name).map((classifier, classIndex) => (
                                        <label key={classIndex} className="classifier-checkbox">
                                          <input 
                                            type="checkbox"
                                            checked={metric.selectedClassifiers?.includes(classifier.name) || false}
                                            onChange={(e) => {
                                        const updated = [...(surveyDraft.metrics || [])]
                                              const selectedClassifiers = metric.selectedClassifiers || []
                                              if (e.target.checked) {
                                                updated[index] = { 
                                                  ...updated[index], 
                                                  selectedClassifiers: [...selectedClassifiers, classifier.name]
                                                }
                                              } else {
                                                updated[index] = { 
                                                  ...updated[index], 
                                                  selectedClassifiers: selectedClassifiers.filter(name => name !== classifier.name)
                                                }
                                              }
                                        setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                                      }}
                                          />
                                          <span>{classifier.name}</span>
                                        </label>
                                      ))}
                                  </div>
                                  </div>
                                  
                                  <div className="formula-editor-section">
                                    <div className="formula-editor-header">
                                      <label className="formula-label">Analysis Formula</label>
                                      <button
                                        type="button"
                                        className="enhance-formula-btn"
                                        onClick={async () => {
                                          const enhanced = await chatService.enhanceMetricFormula(
                                            metric.name, 
                                            metric.description, 
                                            surveyDraft.questions || [],
                                            metric.selectedClassifiers || []
                                          )
                                          if (enhanced) {
                                            const updated = [...(surveyDraft.metrics || [])]
                                            updated[index] = { ...updated[index], formula: enhanced }
                                            setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                                          }
                                        }}
                                      >
                                        <Sparkles size={14} />
                                        Enhance with AI
                                      </button>
                                    </div>
                                    <textarea
                                      value={metric.formula || generateDefaultFormula(metric.selectedClassifiers)}
                                      onChange={e => {
                                        const updated = [...(surveyDraft.metrics || [])]
                                        updated[index] = { ...updated[index], formula: e.target.value }
                                        setSurveyDraft(prev => ({ ...prev, metrics: updated }))
                                      }}
                                      placeholder="e.g., AVG(satisfaction_rating, engagement_score) BY Department"
                                      className="formula-editor"
                                      rows={2}
                                    />
                                    <div className="formula-help">
                                      <div className="formula-examples">
                                        <strong>Examples:</strong> AVG(q1,q2), COUNT(responses &gt;= 4), PERCENT(yes_responses) BY Department
                                      </div>
                                    </div>
                                  </div>
                                  
                                </div>
                              </div>
                            ))}
                            
                            <button
                          className="add-btn-minimal"
                              onClick={() => {
                            const updated = [...(surveyDraft.metrics || []), { name: '', description: '', formula: '', selectedClassifiers: [] }]
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
                  <div className="minimal-step-container">
                    <div className="questions-section">
                      <div className="questions-list">
                            {(surveyDraft.questions || [{ text: '', type: 'multiple_choice', required: false, options: [''] }]).map((question, index) => (
                          <div key={index} className="question-card">
                                <div className="question-card-header">
                                  <div className="question-drag-handle">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                      <circle cx="9" cy="12" r="1" fill="currentColor"/>
                                      <circle cx="15" cy="12" r="1" fill="currentColor"/>
                                      <circle cx="9" cy="6" r="1" fill="currentColor"/>
                                      <circle cx="15" cy="6" r="1" fill="currentColor"/>
                                      <circle cx="9" cy="18" r="1" fill="currentColor"/>
                                      <circle cx="15" cy="18" r="1" fill="currentColor"/>
                                    </svg>
                                  </div>
                                  <div className="question-number-badge">Q{index + 1}</div>
                                  <button
                                    className="modern-question-remove-btn"
                                    onClick={() => {
                                      if ((surveyDraft.questions || []).length > 1) {
                                        const updated = [...(surveyDraft.questions || [])]
                                        updated.splice(index, 1)
                                        setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                      }
                                    }}
                                    disabled={(surveyDraft.questions || []).length <= 1}
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                
                                <div className="question-content-section">
                                  <input
                                    type="text"
                                    value={question.text || ''}
                                    onChange={e => {
                                      const updated = [...(surveyDraft.questions || [])]
                                      updated[index] = { ...updated[index], text: e.target.value }
                                      setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                    }}
                                    placeholder="e.g., How satisfied are you with our team communication?"
                                    className="modern-question-input"
                                  />
                                </div>
                                
                                <div className="question-type-section">
                                  <div className="type-selector-header">
                                    <label>Question Type</label>
                                    <div className="question-settings">
                                      <label className="modern-checkbox">
                                        <input
                                          type="checkbox"
                                          checked={question.required || false}
                                    onChange={e => {
                                      const updated = [...(surveyDraft.questions || [])]
                                            updated[index] = { ...updated[index], required: e.target.checked }
                                      setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                    }}
                                        />
                                        <div className="checkbox-custom"></div>
                                        <span>Required</span>
                                      </label>
                                    </div>
                                  </div>
                                  
                            <div className="question-type-section">
                              <label className="section-label">Response Type:</label>
                              <select
                                className="modern-select"
                                value={question.type}
                                onChange={(e) => {
                                          const updated = [...(surveyDraft.questions || [])]
                                  updated[index] = { ...updated[index], type: e.target.value }
                                          setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                        }}
                                      >
                                <option value="multiple_choice">◉ Multiple Choice</option>
                                <option value="scale">⭐ Rating Scale</option>
                                <option value="likert">📊 Likert Scale</option>
                                <option value="text">✏️ Text Response</option>
                                <option value="yes_no">✓ Yes/No</option>
                                <option value="multiple_select">☑️ Multiple Select</option>
                              </select>
                                  </div>
                                </div>
                                
                                {(question.type === 'multiple_choice' || question.type === 'multiple_select') && (
                                  <div className="question-options-section">
                                    <label className="section-label">Answer Options</label>
                                    <div className="options-list">
                                      {(question.options || ['']).map((option, optIndex) => (
                                        <div key={optIndex} className="option-row">
                                          <div className="option-indicator">
                                            {question.type === 'multiple_choice' ? '◉' : '☑'}
                                          </div>
                                          <input
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
                                            className="modern-option-input"
                                          />
                                          {optIndex > 0 && (
                                            <button
                                              className="remove-option-btn"
                                              onClick={() => {
                                                const updated = [...(surveyDraft.questions || [])]
                                                const updatedOptions = [...(updated[index].options || [])]
                                                updatedOptions.splice(optIndex, 1)
                                                updated[index] = { ...updated[index], options: updatedOptions }
                                                setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                              }}
                                            >
                                              <X size={14} />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      <button
                                        className="add-option-btn-modern"
                                        onClick={() => {
                                          const updated = [...(surveyDraft.questions || [])]
                                          updated[index] = { 
                                            ...updated[index], 
                                            options: [...(updated[index].options || []), ''] 
                                          }
                                          setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                        }}
                                      >
                                        <Plus size={14} />
                                        <span>Add Option</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="question-analytics-section">
                                  <div className="analytics-selectors">
                                    <div className="analytics-selector">
                                      <label>Link to Metric</label>
                                      <select 
                                        value={question.linkedMetric || ''}
                                      onChange={e => {
                                        const updated = [...(surveyDraft.questions || [])]
                                          updated[index] = { ...updated[index], linkedMetric: e.target.value }
                                        setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                      }}
                                className="modern-select full-width"
                                      >
                                        <option value="">Choose metric...</option>
                                        {(surveyDraft.metrics || []).filter(m => m.name).map(metric => (
                                          <option key={metric.name} value={metric.name}>{metric.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    
                                    <div className="analytics-selector">
                                      <label>Link to Classifier</label>
                                      <select
                                        value={question.linkedClassifier || ''}
                                        onChange={e => {
                                        const updated = [...(surveyDraft.questions || [])]
                                          updated[index] = { ...updated[index], linkedClassifier: e.target.value }
                                        setSurveyDraft(prev => ({ ...prev, questions: updated }))
                                      }}
                                        className="modern-select"
                                      >
                                        <option value="">Choose classifier...</option>
                                        {(surveyDraft.classifiers || []).filter(c => c.name).map(classifier => (
                                          <option key={classifier.name} value={classifier.name}>{classifier.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            <button
                              className="modern-add-question-btn"
                              onClick={() => {
                                const updated = [...(surveyDraft.questions || []), {
                                  id: `q${(surveyDraft.questions || []).length + 1}`,
                                  text: '',
                                  type: 'multiple_choice',
                                  required: false,
                                  options: ['']
                                }]
                                setSurveyDraft(prev => ({ ...prev, questions: updated }))
                              }}
                            >
                              <Plus size={20} />
                              <span>Add New Question</span>
                            </button>
                            
                            <div className="enhance-ai-center">
                              <button 
                                className="minimal-enhance-btn"
                              onClick={async () => {
                                try {
                                  addNotification('Generating questions with AI...', 'info')
                                  // Generate AI-powered survey questions based on context and metrics
                                  const metrics = (surveyDraft.metrics || []).map(m => m.name || '')
                                  const aiQuestions = await chatService.generateEnhancedQuestions(
                                    surveyDraft.context || '',
                                    6, // Generate 6 questions
                                    ['multiple_choice', 'scale', 'text', 'yes_no'],
                                    metrics
                                  )
                                  
                                  // Ensure questions are in the correct format (text field)
                                  const transformedQuestions = (aiQuestions || []).map((q, index) => ({
                                    id: q.id || `q${index + 1}`,
                                    text: q.text || q.question || '',
                                    description: q.description || '',
                                    type: q.type || q.response_type || 'multiple_choice',
                                    options: q.options || [],
                                    required: q.required || q.mandatory || false,
                                    linkedMetric: q.linkedMetric || '',
                                    linkedClassifier: q.linkedClassifier || ''
                                  }))
                                  
                                  setSurveyDraft(prev => ({ ...prev, questions: transformedQuestions }))
                                  addNotification('Survey questions generated by AI successfully!', 'success')
                                } catch (error) {
                                  console.error('Failed to generate questions:', error)
                                  addNotification('Failed to generate questions. Please try again.', 'error')
                                }
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                                Enhance with AI
                              </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {surveyStep === 6 && (
                  <div className="minimal-step-container">
                    <div className="config-section">
                          {/* Appearance Section */}
                      <div className="config-group">
                        <label className="field-label-emphatic">Background Image</label>
                            <div className="config-grid">
                              <div className="config-item">
                                <div className="image-upload-modern">
                                  <input
                                    type="file"
                                    id="background-upload"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                      const file = e.target.files[0]
                                      if (file) {
                                        const reader = new FileReader()
                                        reader.onload = (event) => {
                                          setSurveyDraft(prev => ({
                                            ...prev,
                                            configuration: {
                                              ...prev.configuration,
                                              backgroundImage: event.target.result
                                            }
                                          }))
                                        }
                                        reader.readAsDataURL(file)
                                      }
                                    }}
                                  />
                                  <button 
                                    className="modern-upload-btn"
                                    onClick={() => document.getElementById('background-upload').click()}
                                  >
                                    <Image size={18} />
                                    <span>
                                      {surveyDraft.configuration?.backgroundImage ? 'Change Image' : 'Upload Image'}
                                    </span>
                                  </button>
                                  {surveyDraft.configuration?.backgroundImage && (
                                    <div className="image-preview">
                                      <img 
                                        src={surveyDraft.configuration.backgroundImage} 
                                        alt="Survey background preview"
                                        className="preview-image"
                                      />
                                      <button
                                        className="remove-image-btn"
                                        onClick={() => setSurveyDraft(prev => ({
                                          ...prev,
                                          configuration: {
                                            ...prev.configuration,
                                            backgroundImage: null
                                          }
                                        }))}
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="config-item">
                                <label className="config-label">Survey Languages</label>
                                <div className="languages-grid">
                                  {['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese'].map(lang => (
                                    <label key={lang} className="language-option-modern">
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
                                      <div className="checkbox-custom"></div>
                                      <span>{lang}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="config-group">
                        <label className="field-label-emphatic">Target Audience</label>

                            <div className="audience-selector">
                              <div className="employees-grid">
                                {demoUsers
                                  .filter(user => user.id !== currentUserId) // Don't show current user
                                  .map(employee => (
                                  <div key={employee.id} className="employee-card">
                                    <label className="employee-selector">
                                      <input
                                        type="checkbox"
                                        checked={(surveyDraft.configuration?.selectedEmployees || []).includes(employee.id)}
                                        onChange={e => {
                                          const currentSelection = surveyDraft.configuration?.selectedEmployees || []
                                          const updated = e.target.checked
                                            ? [...currentSelection, employee.id]
                                            : currentSelection.filter(id => id !== employee.id)
                                          setSurveyDraft(prev => ({
                                            ...prev,
                                            configuration: {
                                              ...prev.configuration,
                                              selectedEmployees: updated
                                            }
                                          }))
                                        }}
                                      />
                                      <div className="employee-info">
                                        <div className="employee-avatar">{employee.avatar}</div>
                                        <div className="employee-details">
                                          <div className="employee-name">{employee.name}</div>
                                          <div className="employee-role">{employee.role}</div>
                                          <div className="employee-department">{employee.department}</div>
                                        </div>
                                      </div>
                                      <div className="selection-indicator">
                                        {(surveyDraft.configuration?.selectedEmployees || []).includes(employee.id) && (
                                          <div className="selected-badge">✓</div>
                                        )}
                                      </div>
                                    </label>
                                  </div>
                                ))}
                              </div>

                              <div className="audience-summary">
                                <div className="summary-stats">
                                  <div className="stat-item">
                                    <span className="stat-number">
                                      {(surveyDraft.configuration?.selectedEmployees || []).length}
                                    </span>
                                    <span className="stat-label">Recipients Selected</span>
                                  </div>
                                </div>
                                <button 
                                  className="select-all-btn"
                                  onClick={() => {
                                    const allEmployeeIds = demoUsers.filter(u => u.id !== currentUserId).map(u => u.id)
                                    const currentSelection = surveyDraft.configuration?.selectedEmployees || []
                                    const allSelected = allEmployeeIds.every(id => currentSelection.includes(id))
                                    
                                    setSurveyDraft(prev => ({
                                      ...prev,
                                      configuration: {
                                        ...prev.configuration,
                                        selectedEmployees: allSelected ? [] : allEmployeeIds
                                      }
                                    }))
                                  }}
                                >
                                  {((surveyDraft.configuration?.selectedEmployees || []).length === demoUsers.filter(u => u.id !== currentUserId).length) ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="config-group">
                        <label className="field-label-emphatic">Survey Timing</label>

                            <div className="timing-grid">
                              <div className="date-picker-item">
                                <label className="config-label">Release Date & Time</label>
                                <input
                                  type="datetime-local"
                                  value={surveyDraft.configuration?.releaseDate || ''}
                                  onChange={e => setSurveyDraft(prev => ({ 
                                    ...prev, 
                                    configuration: { ...prev.configuration, releaseDate: e.target.value }
                                  }))}
                                  className="modern-datetime-input"
                                />
                              </div>

                              <div className="date-picker-item">
                                <label className="config-label">Response Deadline</label>
                                <input
                                  type="datetime-local"
                                  value={surveyDraft.configuration?.deadline || ''}
                                  onChange={e => setSurveyDraft(prev => ({ 
                                    ...prev, 
                                    configuration: { ...prev.configuration, deadline: e.target.value }
                                  }))}
                                  className="modern-datetime-input"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="config-group">
                        <label className="field-label-emphatic">Privacy & Settings</label>

                            <div className="privacy-options">
                              <label className="modern-checkbox-large">
                                <input
                                  type="checkbox"
                                  checked={surveyDraft.configuration?.anonymous !== false}
                                  onChange={e => setSurveyDraft(prev => ({ 
                                    ...prev, 
                                    configuration: { ...prev.configuration, anonymous: e.target.checked }
                                  }))}
                                />
                                <div className="checkbox-custom"></div>
                                <div className="checkbox-content">
                                  <span className="checkbox-title">Anonymous Responses</span>
                                  <span className="checkbox-description">Participant identities will not be tracked or stored</span>
                                </div>
                              </label>

                              <label className="modern-checkbox-large">
                                <input
                                  type="checkbox"
                                  checked={surveyDraft.configuration?.reminders !== false}
                                  onChange={e => setSurveyDraft(prev => ({ 
                                    ...prev, 
                                    configuration: { ...prev.configuration, reminders: e.target.checked }
                                  }))}
                                />
                                <div className="checkbox-custom"></div>
                                <div className="checkbox-content">
                                  <span className="checkbox-title">Send Reminders</span>
                                  <span className="checkbox-description">Automatically remind participants to complete the survey</span>
                                </div>
                              </label>
                            </div>
                          </div>

                    </div>
                  </div>
                )}

                {surveyStep === 7 && (
                  <div className="minimal-step-container">
                    <div className="publish-section">
                      {/* Primary Publish Action */}
                      <div className="publish-primary">
                                <button 
                          className="primary-publish-btn"
                                  onClick={async () => {
                                    try {
                                      const selectedEmployees = surveyDraft.configuration?.selectedEmployees || []
                                      if (selectedEmployees.length === 0) {
                                        addNotification('Please select at least one recipient', 'error')
                                        return
                                      }
                                      
                                      setIsLoading(true)
                                      
                                      // Actually publish the survey through the backend API
                                      await handlePublishSurvey()
                                      
                                      // Clear the current draft after successful publish
                                      clearSavedDraft()
                                      setCanvasOpen(false)
                                    } catch (error) {
                                      addNotification('Failed to publish survey', 'error')
                                      console.error('Publishing error:', error)
                                    } finally {
                                      setIsLoading(false)
                                    }
                                  }}
                                  disabled={isLoading || (surveyDraft.configuration?.selectedEmployees || []).length === 0}
                                >
                          Publish Survey Now
                                </button>
                              </div>

                      
                      {/* Additional Options */}
                      <div className="publish-options">
                        <div className="schedule-option">
                          <label className="field-label">Schedule for Later</label>
                                <div className="schedule-controls">
                                  <input
                                    type="datetime-local"
                                    value={surveyDraft.configuration?.scheduledPublishDate || ''}
                                    onChange={e => setSurveyDraft(prev => ({
                                      ...prev,
                                      configuration: {
                                        ...prev.configuration,
                                        scheduledPublishDate: e.target.value
                                      }
                                    }))}
                              className="minimal-input"
                                  />
                                  <button 
                              className="secondary-btn"
                                    onClick={async () => {
                                      const scheduleDate = surveyDraft.configuration?.scheduledPublishDate
                                      const selectedEmployees = surveyDraft.configuration?.selectedEmployees || []
                                      
                                      if (!scheduleDate) {
                                        addNotification('Please select a publishing date', 'error')
                                        return
                                      }
                                      
                                      if (selectedEmployees.length === 0) {
                                        addNotification('Please select at least one recipient', 'error')
                                        return
                                      }
                                      
                                      try {
                                        setIsLoading(true)
                                        
                                        await new Promise(resolve => setTimeout(resolve, 1500))
                                        
                                        const scheduledSurvey = {
                                          ...surveyDraft,
                                          id: `scheduled_${Date.now()}`,
                                          status: 'scheduled',
                                          scheduledFor: scheduleDate,
                                          recipients: selectedEmployees
                                        }
                                        
                                        clearSavedDraft()
                                        addNotification(`Survey scheduled for ${new Date(scheduleDate).toLocaleString()}`, 'success')
                                        setCanvasOpen(false)
                                      } catch (error) {
                                        addNotification('Failed to schedule survey', 'error')
                                      } finally {
                                        setIsLoading(false)
                                      }
                                    }}
                                    disabled={isLoading || !surveyDraft.configuration?.scheduledPublishDate || (surveyDraft.configuration?.selectedEmployees || []).length === 0}
                                  >
                                    Schedule Survey
                                  </button>
                                </div>
                              </div>

                        <div className="save-option-centered">
                                <button 
                            className="tertiary-btn-centered"
                                  onClick={async () => {
                                    const result = await saveSurveyDraft(surveyDraft)
                                    // Removed persistent notification for better UX
                                    // Success is already indicated by visual feedback
                                  }}
                                  disabled={isLoading}
                                >
                                  Save Draft
                                </button>
                              </div>
                            </div>

                      
                      {/* Recipients Summary */}
                      <div className="recipients-summary">
                        <p className="recipients-count">
                          {(surveyDraft.configuration?.selectedEmployees || []).length > 0 
                            ? `Ready to send to ${(surveyDraft.configuration?.selectedEmployees || []).length} recipients`
                            : 'No recipients selected - go back to step 6'}
                        </p>
                          </div>
                            </div>
                                </div>
                )}

              </div>
                              </div>
                            )}
          {canvasView === 'preview' && (
            <div className="survey-preview-modern">
              {/* Modern Survey Header */}
              <div className="preview-header-modern">
                <div className="survey-branding">
                  <img 
                    src="/EncultureLogo.png" 
                    alt="enCulture Intelligence" 
                    className="survey-logo"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="survey-logo-fallback" style={{display: 'none'}}>
                    <span className="logo-text">enCulture</span>
                  </div>
                          </div>

                <div className="survey-overview">
                  <h1 className="survey-title-modern">{surveyDraft.name || 'Untitled Survey'}</h1>
                  
                  <div className="survey-stats-grid">
                    <div className="stat-card">
                      <span className="stat-number">{(surveyDraft.questions || []).filter(q => q.text && q.text.trim()).length}</span>
                      <span className="stat-label">Questions</span>
                                  </div>
                    <div className="stat-card">
                      <span className="stat-number">~{Math.ceil(((surveyDraft.questions || []).filter(q => q.text && q.text.trim()).length * 45) / 60)}</span>
                      <span className="stat-label">Minutes</span>
                            </div>
                    <div className="stat-card">
                      <span className="stat-number">{(surveyDraft.classifiers || []).length}</span>
                      <span className="stat-label">Categories</span>
                                </div>
                      </div>
                    </div>
                  </div>
              
              {/* Modern Questions Preview */}
              <div className="preview-content-modern">
                {(surveyDraft.questions || []).filter(q => q.text && q.text.trim()).length === 0 ? (
                  <div className="empty-state-modern">
                    <div className="empty-icon">📝</div>
                    <h3>No Questions Yet</h3>
                    <p>Add questions in the Create tab to see them here</p>
                                <button 
                      className="empty-action-btn"
                      onClick={() => {setCanvasView('wizard'); setSurveyStep(5)}}
                                >
                      Add Questions
                                </button>
                  </div>
                ) : (
                  <div className="questions-grid-modern">
                    {(surveyDraft.questions || []).filter(q => q.text && q.text.trim()).map((question, index) => (
                      <div key={question.id || index} className="question-card-modern">
                        <div className="question-header-modern">
                          <span className="question-number-modern">Q{index + 1}</span>
                          <div className="question-meta-modern">
                            <span className="question-type-modern">{formatQuestionType(question.type)}</span>
                            {question.required && <span className="required-badge-modern">Required</span>}
                </div>
              </div>
              
                        <h4 className="question-text-modern">{question.text}</h4>
                        
                        <div className="question-interactive-modern">
                          {question.type === 'multiple_choice' && (
                            <div className="options-interactive-modern">
                              {(question.options || []).map((option, optIndex) => (
                                <label key={optIndex} className="option-interactive-modern">
                                  <input 
                                    type="radio" 
                                    name={`preview_q_${question.id || index}`}
                                    value={option}
                                    checked={previewResponses[question.id || index] === option}
                                    onChange={(e) => handlePreviewResponse(question.id || index, e.target.value)}
                                  />
                                  <span className="option-indicator"></span>
                                  <span className="option-text">{option}</span>
                        </label>
                      ))}
                              </div>
                            )}
                    
                          {question.type === 'multiple_select' && (
                            <div className="options-interactive-modern">
                              {(question.options || []).map((option, optIndex) => (
                                <label key={optIndex} className="option-interactive-modern">
                                  <input 
                                    type="checkbox" 
                                    value={option}
                                    checked={(previewResponses[question.id || index] || []).includes(option)}
                                    onChange={() => handlePreviewMultiSelect(question.id || index, option)}
                                  />
                                  <span className="option-indicator checkbox"></span>
                                  <span className="option-text">{option}</span>
                          </label>
                        ))}
                          </div>
                    )}
                    
                          {question.type === 'scale' && (
                            <div className="scale-interactive-modern">
                              <div className="scale-input-container">
                                <span>1</span>
                        <input 
                          type="range" 
                                  min="1" 
                                  max="10" 
                                  value={previewResponses[question.id || index] || 5}
                                  onChange={(e) => handlePreviewResponse(question.id || index, parseInt(e.target.value))}
                                  className="scale-slider-modern"
                                />
                                <span>10</span>
                            </div>
                              <div className="scale-value-modern">
                                Value: {previewResponses[question.id || index] || 5}
                          </div>
                              <div className="scale-labels-modern">
                                <span>Poor</span>
                                <span>Excellent</span>
                        </div>
                      </div>
                    )}
                    
                          {question.type === 'text' && (
                            <div className="text-interactive-modern">
                      <textarea 
                                className="text-area-interactive"
                                placeholder="Share your thoughts..."
                                value={previewResponses[question.id || index] || ''}
                                onChange={(e) => handlePreviewResponse(question.id || index, e.target.value)}
                        rows="3" 
                              />
                    </div>
                          )}
                          
                          {question.type === 'yes_no' && (
                            <div className="yesno-interactive-modern">
                              <label className="option-interactive-modern">
                                <input 
                                  type="radio" 
                                  name={`preview_q_${question.id || index}`}
                                  value="yes"
                                  checked={previewResponses[question.id || index] === 'yes'}
                                  onChange={(e) => handlePreviewResponse(question.id || index, e.target.value)}
                                />
                                <span className="option-indicator"></span>
                                <span className="option-text">Yes</span>
                              </label>
                              <label className="option-interactive-modern">
                                <input 
                                  type="radio" 
                                  name={`preview_q_${question.id || index}`}
                                  value="no"
                                  checked={previewResponses[question.id || index] === 'no'}
                                  onChange={(e) => handlePreviewResponse(question.id || index, e.target.value)}
                                />
                                <span className="option-indicator"></span>
                                <span className="option-text">No</span>
                              </label>
                  </div>
                )}
                        </div>
                </div>
              ))}
                  </div>
                )}
              </div>
              
              {/* Preview Actions */}
              <div className="preview-actions-modern">
                  <button
                  className="preview-action-btn secondary"
                  onClick={() => setCanvasView('wizard')}
                >
                  <Edit3 size={16} />
                  Edit Survey
                </button>
                <button 
                  className="preview-action-btn primary"
                  onClick={() => {
                    // Navigate to step 7 (confirmation/publish page)
                    setCanvasView('wizard')
                    setSurveyStep(7)
                    addNotification('Review and confirm your survey details before publishing', 'info')
                  }}
                >
                  <Send size={16} />
                  Publish Survey
                </button>
              </div>
              
            </div>
          )}
          
          {/* Static Footer Navigation - Only show in wizard view */}
          {canvasView === 'wizard' && (
            <div className="wizard-navigation-static">
              <button
                className={`nav-btn secondary ${surveyStep <= 1 ? 'disabled' : ''}`}
                onClick={() => setSurveyStep(prev => Math.max(1, prev - 1))}
                disabled={surveyStep <= 1}
                  >
                    <ArrowLeft size={16} />
                    Previous
                  </button>
                  
                  <div className="step-indicator">
                <span className="step-text">Page {surveyStep} of 7</span>
                  </div>
                  
                  <button
                className={`nav-btn primary ${surveyStep >= 7 ? 'disabled' : ''}`}
                onClick={() => setSurveyStep(prev => Math.min(7, prev + 1))}
                disabled={surveyStep >= 7}
                  >
                    Next
                    <ArrowRight size={16} />
                  </button>
                </div>
          )}
          {canvasView === 'survey' && (
            <div className="survey-container-with-assistant">
              {/* AI Survey Assistant Panel */}
              <div className={`survey-assistant-panel ${showSurveyAssistant ? 'open' : 'closed'}`}>
                <div className="assistant-header">
                  <div className="assistant-title">
                    <span className="assistant-icon">🤖</span>
                    AI Survey Assistant
              </div>
                  <button 
                    className="assistant-toggle"
                    onClick={() => setShowSurveyAssistant(!showSurveyAssistant)}
                  >
                    {showSurveyAssistant ? '✕' : '💬'}
                  </button>
              </div>
              
                {showSurveyAssistant && (
                  <div className="assistant-content">
                    <div className="assistant-messages">
                      {surveyAssistantMessages.length === 0 && (
                        <div className="assistant-welcome">
                          <p>👋 Hi! I'm here to help you with this survey.</p>
                          <p>Feel free to ask me:</p>
                          <ul>
                            <li>"Explain question 2 to me"</li>
                            <li>"What does this question mean?"</li>
                            <li>"Give me an example for this"</li>
                            <li>"Help me understand the survey"</li>
                          </ul>
                    </div>
                  )}
                      {surveyAssistantMessages.map((message) => (
                        <div key={message.id} className={`assistant-message ${message.type}`}>
                          <div className="message-content">{message.content}</div>
                        </div>
                        ))}
                      </div>
                    
                    <div className="assistant-input-area">
                        <input 
                        type="text"
                        value={surveyAssistantInput}
                        onChange={(e) => setSurveyAssistantInput(e.target.value)}
                        placeholder="Ask me about any question..."
                        onKeyPress={(e) => e.key === 'Enter' && handleSurveyAssistantMessage()}
                        disabled={isLoading}
                      />
                      <button 
                        onClick={handleSurveyAssistantMessage}
                        disabled={isLoading || !surveyAssistantInput.trim()}
                        className="assistant-send-btn"
                      >
                        {isLoading ? '⏳' : '➤'}
                      </button>
                    </div>
                      </div>
                )}
              </div>
              
              {/* Main Survey Content */}
              <div className="survey-preview-modern">
                {/* Survey Header - Same as Preview */}
                <div className="preview-header-modern">
                <div className="survey-branding">
                  <img 
                    src="/EncultureLogo.png" 
                      alt="enCulture Intelligence" 
                    className="survey-logo"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="survey-logo-fallback" style={{display: 'none'}}>
                      <span className="logo-text">enCulture</span>
                  </div>
                </div>
                  
                  <div className="survey-overview">
                    <h1 className="survey-title-modern">{activeSurveyData?.name || 'Culture Intelligence Survey'}</h1>
                    
                    {/* AI Assistant Toggle Button */}
                    <button 
                      className="ai-assistant-toggle-main"
                      onClick={() => setShowSurveyAssistant(!showSurveyAssistant)}
                      title="Need help? Chat with AI Assistant"
                    >
                      🤖 Need Help?
                    </button>
                  
                  <div className="survey-stats-grid">
                    <div className="stat-card">
                      <span className="stat-number">{activeSurveyData?.questions?.length || 0}</span>
                      <span className="stat-label">Questions</span>
                  </div>
                    <div className="stat-card">
                      <span className="stat-number">{Object.keys(surveyResponses).length}</span>
                      <span className="stat-label">Completed</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-number">{Math.round(((Object.keys(surveyResponses).length) / (activeSurveyData?.questions?.length || 1)) * 100)}%</span>
                      <span className="stat-label">Progress</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Modern Survey Content - Same as Preview */}
              <div className="preview-content-modern">
                <div className="questions-grid-modern">
                  {(activeSurveyData?.questions || []).map((question, index) => (
                    <div key={question.id || index} className="question-card-modern">
                      <div className="question-header-modern">
                        <span className="question-number-modern">Q{index + 1}</span>
                        <div className="question-meta-modern">
                          <span className="question-type-modern">{formatQuestionType(question.response_type || question.type)}</span>
                          {(question.mandatory || question.required) && <span className="required-badge-modern">Required</span>}
                        </div>
                      </div>
                      
                      <h4 className="question-text-modern">{question.question || question.text}</h4>
                      
                      <div className="question-interactive-modern">
                        {(question.response_type === 'multiple_choice' || question.type === 'multiple_choice') && (
                          <div className="options-interactive-modern">
                            {(question.options || []).map((option, optIndex) => (
                              <label key={optIndex} className="option-interactive-modern">
                            <input 
                              type="radio" 
                                  name={`survey_q_${question.id || index}`}
                              value={option}
                              checked={surveyResponses[question.id] === option}
                              onChange={(e) => updateSurveyResponse(question.id, e.target.value)}
                            />
                                <span className="option-indicator"></span>
                                <span className="option-text">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                        {(question.response_type === 'multiple_select' || question.type === 'multiple_select') && (
                          <div className="options-interactive-modern">
                            {(question.options || []).map((option, optIndex) => (
                              <label key={optIndex} className="option-interactive-modern">
                            <input 
                              type="checkbox"
                              value={option}
                              checked={Array.isArray(surveyResponses[question.id]) && surveyResponses[question.id].includes(option)}
                              onChange={(e) => {
                                const currentResponses = Array.isArray(surveyResponses[question.id]) ? surveyResponses[question.id] : [];
                                if (e.target.checked) {
                                  updateSurveyResponse(question.id, [...currentResponses, option]);
                                } else {
                                  updateSurveyResponse(question.id, currentResponses.filter(r => r !== option));
                                }
                              }}
                            />
                                <span className="option-indicator checkbox"></span>
                                <span className="option-text">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                        {(question.response_type === 'scale' || question.type === 'scale') && (
                          <div className="scale-interactive-modern">
                            <div className="scale-input-container">
                          <span>1</span>
                        <input 
                          type="range" 
                          min="1" 
                          max="10" 
                          value={surveyResponses[question.id] || 5}
                          onChange={(e) => updateSurveyResponse(question.id, parseInt(e.target.value))}
                                className="scale-slider-modern"
                        />
                              <span>10</span>
                            </div>
                            <div className="scale-value-modern">
                          Value: {surveyResponses[question.id] || 5}
                        </div>
                            <div className="scale-labels-modern">
                              <span>Poor</span>
                              <span>Excellent</span>
                        </div>
                      </div>
                    )}
                    
                        {(question.response_type === 'text' || question.type === 'text') && (
                          <div className="text-interactive-modern">
                      <textarea 
                              className="text-area-interactive"
                              placeholder="Share your thoughts..."
                        value={surveyResponses[question.id] || ''}
                        onChange={(e) => updateSurveyResponse(question.id, e.target.value)}
                              rows="3"
                            />
                          </div>
                        )}
                        
                        {(question.response_type === 'yes_no' || question.type === 'yes_no') && (
                          <div className="yesno-interactive-modern">
                            <label className="option-interactive-modern">
                              <input 
                                type="radio" 
                                name={`survey_q_${question.id || index}`}
                                value="yes"
                                checked={surveyResponses[question.id] === 'yes'}
                                onChange={(e) => updateSurveyResponse(question.id, e.target.value)}
                              />
                              <span className="option-indicator"></span>
                              <span className="option-text">Yes</span>
                            </label>
                            <label className="option-interactive-modern">
                              <input 
                                type="radio" 
                                name={`survey_q_${question.id || index}`}
                                value="no"
                                checked={surveyResponses[question.id] === 'no'}
                                onChange={(e) => updateSurveyResponse(question.id, e.target.value)}
                              />
                              <span className="option-indicator"></span>
                              <span className="option-text">No</span>
                            </label>
                          </div>
                        )}
                      </div>
                  </div>
                ))}
                </div>
              </div>
              
              {/* Survey Actions - Same as Preview Style */}
              <div className="preview-actions-modern">
                <button 
                  className="preview-action-btn secondary"
                  onClick={() => {
                    closeSurveyTaking()
                  }}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button 
                  className="preview-action-btn primary"
                  onClick={submitSurvey}
                  disabled={isLoading}
                >
                  <Send size={16} />
                  {isLoading ? 'Submitting...' : 'Submit Survey'}
                </button>
              </div>
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
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          padding: 0 var(--space-4);
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
          position: fixed;
          top: var(--space-4);
          bottom: 160px;
          left: 320px;
          right: var(--space-4);
          overflow-y: auto;
          overflow-x: hidden;
          padding: 120px var(--space-4) 120px var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          
          /* Custom scrollbar styling */
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        /* Hide scrollbar by default */
        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        /* Show scrollbar on hover */
        .chat-messages:hover::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
        }

        .chat-messages:hover::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.4);
        }

        .message {
          display: flex;
          gap: var(--space-3);
          animation: fadeInUp 0.4s ease-out;
          max-width: 100%;
          width: 100%;
          justify-content: flex-start;
          padding: 0 var(--space-2);
        }

        .user-message {
          justify-content: flex-end;
        }
        
        .ai-message {
          justify-content: flex-start;
        }

         .message-bubble {
           max-width: min(70%, 600px);
           min-width: 120px;
           padding: var(--space-4) var(--space-5);
           position: relative;
           border-radius: var(--radius-lg);
           word-wrap: break-word;
           overflow-wrap: break-word;
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
           backdrop-filter: blur(12px);
           padding: var(--space-4) var(--space-5);
           box-shadow: 
             0 2px 12px rgba(0, 0, 0, 0.06),
             0 1px 4px rgba(0, 0, 0, 0.04);
           position: relative;
           text-align: left;
           min-width: 150px;
           width: fit-content;
         }

         .message-time {
           font-size: var(--text-xs);
           color: var(--text-tertiary);
           display: block;
           margin-top: var(--space-2);
         }

         .user-message .message-time {
           color: var(--text-secondary);
           text-align: right;
         }

         /* Responsive chat messages */
         @media (max-width: 1024px) {
           .chat-messages {
             left: var(--space-4);
             right: var(--space-4);
             padding: 80px var(--space-2) 80px var(--space-2);
           }
           
           .message {
             padding: 0 var(--space-1);
           }
           
           .message-bubble {
             max-width: min(85%, 500px);
             min-width: 100px;
             padding: var(--space-3) var(--space-4);
           }
           
           .user-message .message-bubble {
             min-width: 120px;
           }
         }

         @media (max-width: 768px) {
           .chat-messages {
             padding: 60px var(--space-2) 60px var(--space-2);
           }
           
           .message-bubble {
             max-width: min(90%, 400px);
             min-width: 80px;
             padding: var(--space-3) var(--space-3);
           }
           
           .user-message .message-bubble {
             min-width: 100px;
           }
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
           color: rgba(94, 74, 143, 0.9);
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
         
         .mode-btn, .save-btn, .publish-btn, .close-btn {
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

         .publish-btn {
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
           color: white;
           border-color: transparent;
         }
         
         .publish-btn:hover {
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
           width: 100%;
           min-height: calc(100vh - 200px); /* Ensure proper height accounting for static footer */
         }
         
         .wizard-progress {
           padding: var(--space-4);
           border-bottom: 1px solid rgba(239, 246, 255, 0.4);
           background: rgba(250, 251, 255, 0.6);
         }
         
         .progress-indicator {
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
         }
         
         .current-step-info {
           display: flex;
           align-items: center;
           justify-content: center;
           gap: var(--space-4);
         }
         
        .step-explanation {
          font-size: 0.9em;
          color: var(--text-secondary);
          text-align: center;
          padding: var(--space-2) 0 var(--space-4) 0;
          opacity: 0.8;
          margin-top: var(--space-2);
        }
        
        .minimal-step-header {
           display: flex;
           flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--space-2) 0;
          border-bottom: 1px solid rgba(226, 232, 240, 0.3);
        }
        
        .step-icon-title-row {
          display: flex;
           align-items: center;
           gap: var(--space-3);
          margin-bottom: var(--space-2);
        }
        
        .step-title-minimal {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0;
          color: var(--text-primary);
        }
        
        .minimal-step-container {
          padding: 0;
          width: 100%; /* Use full width instead of max-width constraint */
          margin: 0;
        }
        
        .field-group {
          margin-bottom: var(--space-8);
        }
        
        .field-label {
          display: block;
          font-size: 1em;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: var(--space-3);
        }
        
        .field-label-emphatic {
          display: block;
          font-size: 1.2em;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-3);
        }
        
        .minimal-input {
          width: 100%;
          padding: var(--space-3);
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 8px;
          font-size: 1em;
          transition: all 0.2s ease;
          background: white;
        }
        
        .minimal-input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        
        .minimal-textarea {
          width: 100%;
          padding: var(--space-3);
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 8px;
          font-size: 1em;
          font-family: inherit;
          line-height: 1.5;
          resize: vertical;
          transition: all 0.2s ease;
          background: white;
        }
        
        .minimal-textarea:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        
        .enhance-ai-center {
          display: flex;
          justify-content: center;
          margin-top: var(--space-4);
          width: 100%;
        }
        
        .minimal-enhance-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.8) 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.85em;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(139, 92, 246, 0.2);
          min-width: 140px;
        }
        
        .minimal-enhance-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(124, 58, 237, 1) 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        
        .minimal-enhance-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          background: rgba(156, 163, 175, 0.4);
        }
        
        .outcomes-minimal {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        
        .outcome-minimal {
          display: flex;
          gap: var(--space-2);
          align-items: center;
        }
        
        .add-btn-minimal {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          background: transparent;
          border: 1px dashed rgba(139, 92, 246, 0.3);
          border-radius: 6px;
          color: rgba(139, 92, 246, 0.7);
          font-size: 0.9em;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: var(--space-2);
        }
        
        .add-btn-minimal:hover {
          background: rgba(139, 92, 246, 0.05);
          border-color: rgba(139, 92, 246, 0.4);
        }
        
        .remove-btn-minimal {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: rgba(239, 68, 68, 0.7);
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        
        .remove-btn-minimal:hover {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.4);
        }
        
        .classifiers-section {
          padding: 0;
        }
        
        .classifiers-grid {
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
          margin-top: var(--space-6);
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .classifier-item {
          background: rgba(255, 255, 255, 0.8);
          border: 2px solid rgba(226, 232, 240, 0.3);
          border-radius: 16px;
          padding: var(--space-6);
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        
        .classifier-item:hover {
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.08);
          transform: translateY(-2px);
        }
        
        .classifier-title-input {
          width: 100%;
          border: none;
          background: rgba(248, 250, 252, 0.6);
          border-radius: 10px;
          padding: 16px 20px;
          font-weight: 600;
          font-size: 1.1em;
          color: var(--text-primary);
          outline: none;
          margin-bottom: var(--space-4);
          transition: all 0.2s ease;
        }
        
        .classifier-title-input:focus {
          background: white;
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
        }
        
        .classifier-values-section {
          margin-top: var(--space-4);
        }
        
        .section-label {
          display: block;
          font-size: 0.9em;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: var(--space-3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .classifier-values-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }
        
        .value-input-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        
        .value-input {
          flex: 1;
          border: 1px solid rgba(226, 232, 240, 0.4);
          background: rgba(248, 250, 252, 0.4);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 0.95em;
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s ease;
        }
        
        .value-input:focus {
          background: white;
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
        }
        
        .remove-value-btn {
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
          flex-shrink: 0;
        }
        
        .remove-value-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
          transform: scale(1.05);
        }
        
        .add-option-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 10px 16px;
          background: transparent;
          border: 1px dashed rgba(139, 92, 246, 0.4);
          border-radius: 8px;
          color: rgba(139, 92, 246, 0.7);
          font-size: 0.9em;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: var(--space-2);
        }
        
        .add-option-btn:hover {
          background: rgba(139, 92, 246, 0.05);
          border-color: rgba(139, 92, 246, 0.6);
        }
        
        .classifier-card {
          padding: var(--space-4);
          border: 1px solid rgba(226, 232, 240, 0.4);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.6);
          transition: all 0.2s ease;
        }
        
        .classifier-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          background: rgba(255, 255, 255, 0.8);
        }
        
        .classifier-name-input {
          width: 100%;
          padding: var(--space-3);
          font-size: 1.1em;
          font-weight: 600;
          border: 2px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          background: white;
          margin-bottom: var(--space-4);
          transition: all 0.2s ease;
        }
        
        .classifier-name-input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        
        .classifier-values {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        
        .value-input-row {
          display: flex;
          gap: var(--space-2);
          align-items: center;
        }
        
        .value-input {
          flex: 1;
          padding: var(--space-2) var(--space-3);
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 6px;
          font-size: 0.9em;
          transition: all 0.2s ease;
        }
        
        .value-input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
        }
        
        .remove-value-btn {
          width: 24px;
          height: 24px;
          border: 1px solid rgba(239, 68, 68, 0.3);
          background: transparent;
          border-radius: 4px;
          color: rgba(239, 68, 68, 0.7);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .remove-value-btn:hover {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.4);
        }
        
        .add-value-btn {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-2) var(--space-3);
          margin-top: var(--space-2);
          background: transparent;
          border: 1px dashed rgba(139, 92, 246, 0.3);
          border-radius: 6px;
          color: rgba(139, 92, 246, 0.7);
          font-size: 0.85em;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .add-value-btn:hover {
          background: rgba(139, 92, 246, 0.05);
          border-color: rgba(139, 92, 246, 0.4);
        }
        
        /* Metrics Section Styling */
        .metrics-section {
          padding: 0;
        }
        
        .metrics-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          margin-top: var(--space-4);
        }
        
        .metric-card {
          padding: var(--space-5);
          border: 1px solid rgba(226, 232, 240, 0.4);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.7);
          transition: all 0.2s ease;
        }
        
        .metric-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          background: rgba(255, 255, 255, 0.9);
        }
        
        .metric-name-input {
          width: 100%;
          padding: var(--space-3);
          font-size: 1.1em;
          font-weight: 600;
          border: 2px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          background: white;
          margin-bottom: var(--space-3);
          transition: all 0.2s ease;
        }
        
        .metric-name-input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        
        .metric-description-input {
          width: 100%;
          padding: var(--space-3);
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.9em;
          margin-bottom: var(--space-4);
          resize: vertical;
          transition: all 0.2s ease;
        }
        
        .metric-description-input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
        }
        
        .classifier-selection-section {
          margin-bottom: var(--space-4);
        }
        
        .section-label {
          display: block;
          font-size: 0.9em;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: var(--space-2);
        }
        
        .classifier-selection-sleek {
          margin-bottom: var(--space-4);
        }
        
        .classifier-toggle-chips {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        
        .classifier-toggle-chip {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          background: rgba(248, 250, 252, 0.8);
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.85em;
        }
        
        .classifier-toggle-chip:hover {
          background: rgba(139, 92, 246, 0.05);
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateY(-1px);
        }
        
        .classifier-toggle-chip.selected {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.4);
          color: rgba(139, 92, 246, 0.9);
        }
        
        .classifier-toggle-chip.selected .plus-icon {
          transform: rotate(45deg);
        }
        
        .classifier-toggle-chip .plus-icon {
          transition: transform 0.2s ease;
        }
        
        .chip-text {
          font-size: 0.85em;
          transition: all 0.2s ease;
        }
        
        .formula-section {
          background: rgba(248, 250, 252, 0.5);
          border: 1px solid rgba(226, 232, 240, 0.4);
          border-radius: 8px;
          padding: var(--space-4);
        }
        
        .formula-display {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.9em;
          background: white;
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 6px;
          padding: var(--space-3);
          margin-bottom: var(--space-3);
          color: var(--text-primary);
          white-space: pre-wrap;
          word-break: break-word;
        }
        
        /* Publish Section Styling */
        .publish-section {
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          margin-top: var(--space-4);
        }
        
        .publish-primary {
           text-align: center;
         }
        
        .primary-publish-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-6);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
          margin: 0 auto;
          min-width: 200px;
        }
        
        .primary-publish-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(124, 58, 237, 1) 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
        }
        
        .primary-publish-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .publish-summary {
          margin-top: var(--space-2);
          font-size: 0.9em;
          color: var(--text-secondary);
        }
        
        .publish-options {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        
        .schedule-option, .save-option, .save-option-centered {
          padding: var(--space-4);
          border: 1px solid rgba(226, 232, 240, 0.4);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.7);
        }
        
        .save-option-centered {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .schedule-controls {
          display: flex;
          gap: var(--space-3);
          margin-top: var(--space-3);
        }
        
        .secondary-btn, .tertiary-btn, .tertiary-btn-centered {
          padding: var(--space-2) var(--space-4);
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .secondary-btn {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          color: rgba(59, 130, 246, 0.9);
        }
        
        .secondary-btn:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.15);
          transform: translateY(-1px);
        }
        
        .tertiary-btn, .tertiary-btn-centered {
          background: rgba(156, 163, 175, 0.1);
          border: 1px solid rgba(156, 163, 175, 0.3);
          color: rgba(75, 85, 99, 0.8);
        }
        
        .tertiary-btn:hover:not(:disabled), .tertiary-btn-centered:hover:not(:disabled) {
          background: rgba(156, 163, 175, 0.15);
          transform: translateY(-1px);
        }
        
        .recipients-summary {
          text-align: center;
          padding: var(--space-3);
          background: rgba(248, 250, 252, 0.6);
          border-radius: 8px;
        }
        
        .recipients-count {
          margin: 0;
          font-size: 0.9em;
          color: var(--text-secondary);
        }
        
         /* Modern Preview Styling */
        .survey-preview-modern {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto;
          background: linear-gradient(135deg, 
            rgba(248, 250, 252, 0.9) 0%, 
            rgba(255, 255, 255, 0.95) 100%);
        }

        .preview-header-modern {
          padding: var(--space-6);
          background: white;
          border-bottom: 1px solid rgba(226, 232, 240, 0.6);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .survey-overview {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .survey-title-modern {
          font-size: 2.25em;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--space-3);
          line-height: 1.2;
        }


        .survey-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: var(--space-4);
          max-width: 400px;
          margin: 0 auto;
        }

        .stat-card {
          background: rgba(139, 92, 246, 0.05);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 12px;
          padding: var(--space-4);
          text-align: center;
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          background: rgba(139, 92, 246, 0.08);
          transform: translateY(-1px);
        }

        .stat-number {
          display: block;
          font-size: 1.8em;
          font-weight: 700;
          color: rgba(139, 92, 246, 0.9);
          line-height: 1;
        }

        .stat-label {
          font-size: 0.85em;
          color: var(--text-secondary);
          font-weight: 500;
          margin-top: 4px;
        }

        .preview-content-modern {
          flex: 1;
          padding: var(--space-6);
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
        }

        .empty-state-modern {
          text-align: center;
          padding: var(--space-8) var(--space-4);
          background: white;
          border-radius: 16px;
          border: 1px solid rgba(226, 232, 240, 0.6);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .empty-icon {
          font-size: 3em;
          margin-bottom: var(--space-4);
          opacity: 0.6;
        }

        .empty-state-modern h3 {
          font-size: 1.5em;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-2);
        }

        .empty-state-modern p {
          color: var(--text-secondary);
          margin-bottom: var(--space-5);
        }

        .empty-action-btn {
          background: rgba(139, 92, 246, 0.9);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .empty-action-btn:hover {
          background: rgba(139, 92, 246, 1);
          transform: translateY(-1px);
        }

        .questions-grid-modern {
          display: grid;
          gap: var(--space-5);
        }

        .question-card-modern {
          background: white;
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 16px;
          padding: var(--space-5);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: all 0.3s ease;
        }

        .question-card-modern:hover {
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
        }

        .question-header-modern {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-3);
        }

        .question-number-modern {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(124, 58, 237, 0.9));
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9em;
          letter-spacing: 0.5px;
        }

        .question-meta-modern {
          display: flex;
          gap: var(--space-2);
          align-items: center;
        }

        .question-type-modern {
          background: rgba(34, 197, 94, 0.1);
          color: rgba(34, 197, 94, 0.8);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75em;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .required-badge-modern {
          background: rgba(239, 68, 68, 0.1);
          color: rgba(239, 68, 68, 0.8);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75em;
          font-weight: 600;
          text-transform: uppercase;
        }

        .question-text-modern {
          font-size: 1.1em;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          margin-bottom: var(--space-4);
        }

        .question-preview-modern {
          padding-top: var(--space-3);
          border-top: 1px solid rgba(226, 232, 240, 0.4);
        }

        .options-preview-modern {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .option-preview-modern {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 8px 0;
          font-size: 0.9em;
          color: var(--text-secondary);
        }

        .radio-preview, .checkbox-preview {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(139, 92, 246, 0.3);
          background: rgba(139, 92, 246, 0.05);
          flex-shrink: 0;
        }

        .radio-preview {
          border-radius: 50%;
        }

        .checkbox-preview {
          border-radius: 3px;
        }

        .more-options-modern {
          font-size: 0.8em;
          color: rgba(139, 92, 246, 0.7);
          font-style: italic;
          margin-top: 4px;
        }

        .scale-preview-modern {
          padding: var(--space-3) 0;
        }

        .scale-visual {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-2);
        }

        .scale-track {
          flex: 1;
          height: 6px;
          background: rgba(226, 232, 240, 0.6);
          border-radius: 3px;
          position: relative;
        }

        .scale-thumb {
          position: absolute;
          left: 40%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: rgba(139, 92, 246, 0.9);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .scale-labels-modern {
          display: flex;
          justify-content: space-between;
          font-size: 0.8em;
          color: var(--text-secondary);
        }

        .text-preview-modern {
          padding: var(--space-3) 0;
        }

        .text-area-placeholder {
          background: rgba(248, 250, 252, 0.8);
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 8px;
          padding: var(--space-3);
          color: var(--text-muted);
          font-style: italic;
          font-size: 0.9em;
        }

        .yesno-preview-modern {
          display: flex;
          gap: var(--space-4);
        }

        /* Interactive Preview Styles */
        .question-interactive-modern {
          padding-top: var(--space-3);
          border-top: 1px solid rgba(226, 232, 240, 0.4);
        }

        .options-interactive-modern {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .option-interactive-modern {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid rgba(226, 232, 240, 0.6);
          background: rgba(248, 250, 252, 0.5);
        }

        .option-interactive-modern:hover {
          background: rgba(139, 92, 246, 0.05);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .option-interactive-modern input[type="radio"],
        .option-interactive-modern input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .option-indicator {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(139, 92, 246, 0.4);
          border-radius: 50%;
          background: white;
          transition: all 0.2s ease;
          position: relative;
          flex-shrink: 0;
        }

        .option-indicator.checkbox {
          border-radius: 4px;
        }

        .option-interactive-modern input:checked + .option-indicator {
          background: rgba(139, 92, 246, 0.9);
          border-color: rgba(139, 92, 246, 0.9);
        }

        .option-interactive-modern input:checked + .option-indicator::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
        }

        .option-interactive-modern input:checked + .option-indicator.checkbox::after {
          width: 8px;
          height: 4px;
          border: none;
          border-left: 2px solid white;
          border-bottom: 2px solid white;
          transform: translate(-50%, -70%) rotate(-45deg);
          border-radius: 0;
        }

        .option-text {
          font-size: 0.95em;
          color: var(--text-primary);
          font-weight: 500;
        }

        .scale-interactive-modern {
          padding: var(--space-4) 0;
        }

        .scale-input-container {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-3);
        }

        .scale-slider-modern {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: rgba(226, 232, 240, 0.6);
          outline: none;
          -webkit-appearance: none;
          appearance: none;
        }

        .scale-slider-modern::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.9);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
          transition: all 0.2s ease;
        }

        .scale-slider-modern::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .scale-slider-modern::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.9);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
        }

        .scale-value-modern {
          text-align: center;
          font-weight: 600;
          color: rgba(139, 92, 246, 0.9);
          font-size: 1.1em;
          margin-bottom: var(--space-2);
        }

        .scale-labels-modern {
          display: flex;
          justify-content: space-between;
          font-size: 0.85em;
          color: var(--text-secondary);
        }

        .text-interactive-modern {
          padding: var(--space-3) 0;
        }

        .text-area-interactive {
          width: 100%;
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 8px;
          padding: var(--space-3);
          font-family: inherit;
          font-size: 0.95em;
          resize: vertical;
          transition: all 0.2s ease;
          background: rgba(248, 250, 252, 0.8);
        }

        .text-area-interactive:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          background: white;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .yesno-interactive-modern {
          display: flex;
          gap: var(--space-4);
        }

        .preview-actions-modern {
          padding: var(--space-5) var(--space-6);
          background: white;
          border-top: 1px solid rgba(226, 232, 240, 0.6);
          display: flex;
          justify-content: center;
          gap: var(--space-3);
        }

        .preview-action-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9em;
        }

        .preview-action-btn.secondary {
          background: rgba(248, 250, 252, 0.9);
          color: var(--text-secondary);
          border: 1px solid rgba(226, 232, 240, 0.6);
        }

        .preview-action-btn.secondary:hover {
          background: rgba(226, 232, 240, 0.3);
          border-color: rgba(139, 92, 246, 0.3);
          color: var(--text-primary);
        }

        .preview-action-btn.primary {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(124, 58, 237, 0.9));
          color: white;
          border: none;
        }

        .preview-action-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        /* Legacy Preview Styles (for backward compatibility) */
        .survey-branding-centered {
          text-align: center;
          margin-bottom: var(--space-6);
          padding: var(--space-5) 0;
        }
        
        .survey-logo-centered {
          height: 80px;
          width: auto;
          max-width: 300px;
          object-fit: contain;
        }
        
        .survey-logo-fallback-centered {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 80px;
        }
        
        .logo-text-centered {
          font-size: 2em;
          font-weight: 700;
          color: #392A48;
        }
        
        .survey-header-centered {
          text-align: center;
          margin-bottom: var(--space-6);
        }
        
        .survey-title-centered {
          font-size: 2.2em;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--space-4);
          line-height: 1.2;
        }
        
        .survey-description-centered {
          font-size: 1.1em;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: var(--space-5);
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        
        .survey-progress-centered {
          max-width: 400px;
          margin: 0 auto;
        }
        
        .progress-info-centered {
          text-align: center;
          font-size: 0.9em;
          color: var(--text-secondary);
          margin-bottom: var(--space-2);
        }
        
        .progress-bar-centered {
          width: 100%;
          height: 8px;
          background: rgba(226, 232, 240, 0.4);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: var(--space-2);
        }
        
        .survey-navigation-centered {
          text-align: center;
          padding-top: var(--space-4);
          border-top: 1px solid rgba(226, 232, 240, 0.3);
        }
        
        .survey-nav-btn {
          padding: var(--space-3) var(--space-6);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 1em;
        }
        
        .survey-nav-btn:hover {
          background: linear-gradient(135deg, rgba(139, 92, 246, 1) 0%, rgba(124, 58, 237, 1) 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }
        
        /* Static Footer Navigation */
        .wizard-navigation-static {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border-top: 1px solid rgba(226, 232, 240, 0.4);
          padding: var(--space-4);
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 1000;
          box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
        }
        
        /* Questions Section Styling */
        .questions-section {
          padding: 0;
        }
        
        .questions-list {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-5);
          margin-top: var(--space-4);
          width: 100%;
        }
        
        .question-card {
          padding: var(--space-4);
          border: 1px solid rgba(226, 232, 240, 0.4);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.7);
          transition: all 0.2s ease;
          width: 100%;
        }
        
        .question-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.08);
        }
        
        .question-type-section {
          margin: var(--space-3) 0;
        }
        
        .modern-select {
          width: 100%;
          padding: var(--space-2) var(--space-3);
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 8px;
          background: white;
          font-size: 0.9em;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .modern-select:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        
        .modern-select:hover {
          border-color: rgba(139, 92, 246, 0.3);
        }
        
        .modern-select.full-width {
          width: 100%;
        }
        
        /* Config Section Styling */
        .config-section {
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
          margin-top: var(--space-4);
          width: 100%;
        }
        
        .config-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-4) 0;
          border-bottom: 1px solid rgba(226, 232, 240, 0.3);
          width: 100%;
        }
        
        .config-group:last-child {
          border-bottom: none;
        }
        
        .employees-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-3);
          margin-top: var(--space-3);
          width: 100%;
        }
        
        .config-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-4);
          width: 100%;
        }
        
        .timing-grid, .privacy-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-4);
          width: 100%;
         }
         
         .step-icon-wrapper {
           width: 56px;
           height: 56px;
           border-radius: 50%;
           display: flex;
           align-items: center;
           justify-content: center;
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.15) 0%, 
             rgba(124, 58, 237, 0.10) 100%);
           border: 2px solid rgba(139, 92, 246, 0.3);
           color: rgb(139, 92, 246);
           margin-bottom: var(--space-2);
         }
         
         .step-title {
           font-size: 1.5em;
           font-weight: 700;
           color: var(--text-primary);
           margin: 0 0 var(--space-2) 0;
           text-align: center;
         }
         
         .step-description {
           font-size: var(--text-base);
           color: var(--text-secondary);
           margin: 0;
           opacity: 0.8;
           text-align: center;
         }
         
         .progress-bar {
           width: 100%;
           height: 6px;
           background: rgba(226, 232, 240, 0.4);
           border-radius: 3px;
           overflow: hidden;
         }
         
         .progress-fill {
           height: 100%;
           background: linear-gradient(135deg, 
             rgba(94, 74, 143, 0.8) 0%, 
             rgba(84, 64, 133, 0.9) 100%);
           border-radius: 3px;
           transition: width 0.3s ease;
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
           padding: var(--space-4) var(--space-4) 120px var(--space-4); /* Add bottom padding for static footer */
           display: flex;
           flex-direction: column;
         }
         
         .step-container {
           max-width: 100%;
           width: 100%;
           flex: 1;
           display: flex;
           flex-direction: column;
           justify-content: center;
           align-items: center;
           padding: var(--space-6) var(--space-4);
           text-align: center;
         }
         
         .step-body {
           display: flex;
           flex-direction: column;
           gap: var(--space-4);
           flex: 1;
           width: 100%;
           max-width: 600px;
         }
         
         /* Consistent Input Styling Across All Steps */
         .wizard-input, .wizard-textarea, .wizard-input.large,
         .classifier-name-input, .metric-name-input, .question-builder-text,
         .outcome-input, .config-input {
           font-family: inherit;
           font-weight: 500;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         /* Step 1: Name */
         .wizard-input.large {
           width: 100%;
           font-size: 1.4em;
           font-weight: 600;
           padding: var(--space-5) var(--space-6);
           border: 2px solid rgba(139, 92, 246, 0.15);
           background: rgba(255, 255, 255, 0.95);
           border-radius: 20px;
           color: var(--text-primary);
           outline: none;
           text-align: center;
           transition: all 0.3s ease;
           box-shadow: 0 4px 20px rgba(139, 92, 246, 0.08);
           min-height: 70px;
         }
         
         .wizard-input.large:focus {
           border-color: rgba(139, 92, 246, 0.4);
           box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.12), 0 8px 32px rgba(139, 92, 246, 0.15);
           background: white;
           transform: translateY(-2px);
         }
         
         .ai-suggestion {
           display: flex;
           flex-direction: column;
           align-items: center;
           gap: var(--space-3);
           margin-top: var(--space-5);
         }
         
         .ai-suggest-btn, .generate-formula-btn, .add-outcome-btn,
         .add-metric-btn, .add-question-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           gap: 8px;
           padding: 12px 20px;
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(124, 58, 237, 0.06) 100%);
           border: 1px solid rgba(139, 92, 246, 0.3);
           border-radius: 12px;
           color: rgba(139, 92, 246, 0.9);
           cursor: pointer;
           font-weight: 600;
           font-size: 0.9em;
           transition: all 0.3s ease;
           box-shadow: 0 2px 8px rgba(139, 92, 246, 0.1);
         }
         
         .ai-suggest-btn:hover, .generate-formula-btn:hover, .add-outcome-btn:hover,
         .add-metric-btn:hover, .add-question-btn:hover {
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.08) 100%);
           transform: translateY(-2px);
           border-color: rgba(139, 92, 246, 0.4);
           box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);
         }
         
         .ai-icon {
           opacity: 0.8;
           transition: transform 0.2s ease;
         }
         
         .ai-suggest-btn:hover .ai-icon {
           transform: scale(1.1);
         }
         
         .step-help {
           margin-top: var(--space-3);
           padding: 12px 16px;
           background: rgba(139, 92, 246, 0.05);
           border-radius: 10px;
           text-align: center;
         }
         
         .step-help span {
           font-size: 0.8em;
           color: rgba(139, 92, 246, 0.7);
           font-weight: 500;
         }
         
         /* Modern Step Styling */
         .step-container.modern {
           max-width: 800px;
           gap: var(--space-6);
         }
         
         .modern-card {
           background: white;
           border-radius: 20px;
           border: 1px solid rgba(226, 232, 240, 0.6);
           box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
           overflow: hidden;
           transition: all 0.3s ease;
           margin-bottom: var(--space-5);
         }
         
         .modern-card:hover {
           transform: translateY(-2px);
           box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
         }
         
         .card-header {
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.05) 0%, 
             rgba(124, 58, 237, 0.02) 100%);
           border-bottom: 1px solid rgba(226, 232, 240, 0.4);
           padding: var(--space-5);
           display: flex;
           align-items: flex-start;
           gap: var(--space-4);
         }
         
         .card-header-compact {
           display: flex;
           align-items: center;
           gap: var(--space-2);
           margin-bottom: var(--space-4);
           padding: var(--space-2) var(--space-3);
           background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(124, 58, 237, 0.02) 100%);
           border-radius: 8px;
           border-left: 3px solid rgba(139, 92, 246, 0.3);
         }
         
         .card-header-compact h3 {
           margin: 0;
           font-size: 1.1em;
           font-weight: 600;
           color: var(--text-primary);
         }
         
         .card-header-compact span {
           font-size: 0.85em;
           color: var(--text-secondary);
           opacity: 0.8;
         }
         
         .header-icon {
           width: 48px;
           height: 48px;
           border-radius: 12px;
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.1) 0%, 
             rgba(124, 58, 237, 0.06) 100%);
           border: 1px solid rgba(139, 92, 246, 0.2);
           display: flex;
           align-items: center;
           justify-content: center;
           color: rgb(139, 92, 246);
           flex-shrink: 0;
         }
         
         .card-header h3 {
           font-size: 1.25em;
           font-weight: 700;
           color: var(--text-primary);
           margin: 0 0 var(--space-1) 0;
         }
         
         .card-header p {
           font-size: 0.9em;
           color: var(--text-secondary);
           margin: 0;
           opacity: 0.8;
           line-height: 1.5;
         }
         
         .card-content {
           padding: var(--space-5);
         }
         
         .modern-textarea {
           width: 100%;
           min-height: 120px;
           border: 2px solid rgba(226, 232, 240, 0.4);
           background: rgba(248, 250, 252, 0.4);
           border-radius: 16px;
           padding: var(--space-4);
           font-size: 0.95em;
           font-family: inherit;
           color: var(--text-primary);
           line-height: 1.6;
           resize: vertical;
           outline: none;
           transition: all 0.3s ease;
         }
         
         .modern-textarea:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: white;
           box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
         }
         
         .modern-input {
           flex: 1;
           height: 48px;
           border: 2px solid rgba(226, 232, 240, 0.4);
           background: rgba(248, 250, 252, 0.4);
           border-radius: 12px;
           padding: 0 var(--space-4);
           font-size: 0.95em;
           font-family: inherit;
           color: var(--text-primary);
           outline: none;
           transition: all 0.3s ease;
         }
         
         .modern-input:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: white;
           box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
         }
         
         .outcomes-list {
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
         }
         
         .outcome-row {
           display: flex;
           align-items: center;
           gap: var(--space-3);
           padding: var(--space-2);
           border-radius: 12px;
           transition: background 0.2s ease;
         }
         
         .outcome-row:hover {
           background: rgba(248, 250, 252, 0.6);
         }
         
         .outcome-number {
           width: 32px;
           height: 32px;
           border-radius: 8px;
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.1) 0%, 
             rgba(124, 58, 237, 0.06) 100%);
           border: 1px solid rgba(139, 92, 246, 0.2);
           color: rgba(139, 92, 246, 0.8);
           font-weight: 700;
           font-size: 0.85em;
           display: flex;
           align-items: center;
           justify-content: center;
           flex-shrink: 0;
         }
         
         .modern-remove-btn {
           width: 40px;
           height: 40px;
           border: none;
           border-radius: 10px;
           background: rgba(239, 68, 68, 0.05);
           color: rgba(239, 68, 68, 0.7);
           cursor: pointer;
           display: flex;
           align-items: center;
           justify-content: center;
           transition: all 0.2s ease;
           flex-shrink: 0;
         }
         
         .modern-remove-btn:hover {
           background: rgba(239, 68, 68, 0.1);
           transform: scale(1.05);
         }
         
         .modern-add-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           gap: var(--space-2);
           width: 100%;
           height: 56px;
           border: 2px dashed rgba(139, 92, 246, 0.3);
           background: rgba(139, 92, 246, 0.02);
           border-radius: 16px;
           color: rgba(139, 92, 246, 0.8);
           font-weight: 600;
           cursor: pointer;
           transition: all 0.3s ease;
           margin-top: var(--space-2);
         }
         
         .modern-add-btn:hover {
           background: rgba(139, 92, 246, 0.05);
           border-color: rgba(139, 92, 246, 0.4);
           transform: translateY(-1px);
         }
         
         .ai-help-card {
           display: flex;
           align-items: flex-start;
           gap: var(--space-3);
           margin-top: var(--space-4);
           padding: var(--space-4);
           background: linear-gradient(135deg, 
             rgba(59, 130, 246, 0.05) 0%, 
             rgba(37, 99, 235, 0.02) 100%);
           border: 1px solid rgba(59, 130, 246, 0.15);
           border-radius: 12px;
         }
         
         .help-icon {
           color: rgba(59, 130, 246, 0.7);
           flex-shrink: 0;
           margin-top: 2px;
         }
         
         .ai-help-card strong {
           font-size: 0.9em;
           color: var(--text-primary);
           font-weight: 600;
           display: block;
           margin-bottom: var(--space-1);
         }
         
         .ai-help-card p {
           font-size: 0.8em;
           color: var(--text-secondary);
           margin: 0;
           opacity: 0.8;
           line-height: 1.4;
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

         /* Modern Classifiers Styling */
         .classifiers-modern-grid {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
           gap: var(--space-5);
         }
         
        .classifier-item {
          padding: var(--space-4) 0;
          border-bottom: 1px solid rgba(226, 232, 240, 0.3);
          transition: all 0.2s ease;
        }
        
        .classifier-item:last-child {
          border-bottom: none;
        }
        
        .classifier-title-input {
          width: 100%;
          padding: var(--space-3);
          font-size: 1.1em;
          font-weight: 600;
          border: 2px solid rgba(139, 92, 246, 0.2);
           border-radius: 8px;
          background: white;
          margin-bottom: var(--space-3);
          transition: all 0.2s ease;
        }
        
        .classifier-title-input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        
        .classifier-values-section {
          margin-bottom: var(--space-4);
        }
        
        .classifier-values-list {
           display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
         
         
         .classifier-title-input {
           width: 100%;
           border: none;
           background: transparent;
           font-size: 1.1em;
           font-weight: 700;
           color: var(--text-primary);
           padding: var(--space-2) 0;
           margin-bottom: var(--space-4);
           border-bottom: 2px solid rgba(226, 232, 240, 0.4);
           outline: none;
           transition: all 0.3s ease;
         }
         
         .classifier-title-input:focus {
           border-bottom-color: rgba(139, 92, 246, 0.6);
         }
         
         .classifier-values-section {
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
         }
         
         .section-label {
           font-size: 0.85em;
           font-weight: 600;
           color: var(--text-secondary);
           text-transform: uppercase;
           letter-spacing: 0.5px;
           margin-bottom: var(--space-2);
         }
         
         .classifier-values-list {
           display: flex;
           flex-direction: column;
           gap: var(--space-2);
         }
         
         .value-input-row {
           display: flex;
           align-items: center;
           gap: var(--space-2);
         }
         
         .value-input {
           flex: 1;
           height: 40px;
           border: 1px solid rgba(226, 232, 240, 0.6);
           background: rgba(255, 255, 255, 0.7);
           border-radius: 8px;
           padding: 0 var(--space-3);
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .value-input:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: white;
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
         }
         
         .remove-value-btn {
           width: 32px;
           height: 32px;
           border: none;
           border-radius: 6px;
           background: rgba(239, 68, 68, 0.1);
           color: rgba(239, 68, 68, 0.7);
           cursor: pointer;
           display: flex;
           align-items: center;
           justify-content: center;
           transition: all 0.2s ease;
           flex-shrink: 0;
         }
         
         .remove-value-btn:hover {
           background: rgba(239, 68, 68, 0.2);
           transform: scale(1.1);
         }
         
         .add-value-btn-modern {
           display: flex;
           align-items: center;
           justify-content: center;
           gap: var(--space-2);
           height: 36px;
           border: 1px dashed rgba(139, 92, 246, 0.4);
           background: rgba(139, 92, 246, 0.02);
           border-radius: 8px;
           color: rgba(139, 92, 246, 0.8);
           font-size: 0.85em;
           font-weight: 500;
           cursor: pointer;
           transition: all 0.2s ease;
           margin-top: var(--space-1);
         }
         
         .add-value-btn-modern:hover {
           background: rgba(139, 92, 246, 0.05);
           border-color: rgba(139, 92, 246, 0.6);
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

         /* Modern Metrics Styling */
         .metrics-modern-list {
           display: flex;
           flex-direction: column;
           gap: var(--space-5);
         }
         
         .modern-metric-card {
           background: linear-gradient(135deg, 
             rgba(248, 250, 252, 0.9) 0%, 
             rgba(255, 255, 255, 0.95) 100%);
           border: 2px solid rgba(226, 232, 240, 0.5);
           border-radius: 20px;
           padding: var(--space-5);
           transition: all 0.3s ease;
           position: relative;
         }
         
         .modern-metric-card:hover {
           transform: translateY(-3px);
           box-shadow: 0 12px 32px rgba(139, 92, 246, 0.15);
           border-color: rgba(139, 92, 246, 0.3);
         }
         
         .metric-card-header {
           display: flex;
           align-items: center;
           gap: var(--space-3);
           margin-bottom: var(--space-4);
         }
         
         .metric-badge {
           width: 40px;
           height: 40px;
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.1) 0%, 
             rgba(124, 58, 237, 0.08) 100%);
           border: 2px solid rgba(139, 92, 246, 0.2);
           border-radius: 12px;
           display: flex;
           align-items: center;
           justify-content: center;
           color: rgba(139, 92, 246, 0.8);
           flex-shrink: 0;
         }
         
         .metric-title-input {
           flex: 1;
           border: none;
           background: transparent;
           font-size: 1.2em;
           font-weight: 700;
           color: var(--text-primary);
           padding: var(--space-2) 0;
           border-bottom: 2px solid rgba(226, 232, 240, 0.4);
           outline: none;
           transition: all 0.3s ease;
         }
         
         .metric-title-input:focus {
           border-bottom-color: rgba(139, 92, 246, 0.6);
         }
         
         .modern-remove-metric-btn {
           width: 36px;
           height: 36px;
           border: none;
           border-radius: 10px;
           background: rgba(239, 68, 68, 0.08);
           color: rgba(239, 68, 68, 0.7);
           cursor: pointer;
           display: flex;
           align-items: center;
           justify-content: center;
           transition: all 0.2s ease;
           flex-shrink: 0;
         }
         
         .modern-remove-metric-btn:hover:not(:disabled) {
           background: rgba(239, 68, 68, 0.15);
           transform: scale(1.05);
         }
         
         .modern-remove-metric-btn:disabled {
           opacity: 0.3;
           cursor: not-allowed;
         }
         
         .metric-description {
           width: 100%;
           min-height: 80px;
           border: 2px solid rgba(226, 232, 240, 0.4);
           background: rgba(248, 250, 252, 0.3);
           border-radius: 12px;
           padding: var(--space-3);
           font-size: 0.9em;
           font-family: inherit;
           color: var(--text-primary);
           line-height: 1.6;
           resize: vertical;
           outline: none;
           transition: all 0.3s ease;
           margin-bottom: var(--space-4);
         }
         
         .metric-description:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: white;
           box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
         }
         
         .metric-formula-section {
           background: rgba(248, 250, 252, 0.6);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 16px;
           padding: var(--space-4);
         }
         
         .formula-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-bottom: var(--space-3);
         }
         
         .formula-label {
           font-size: 0.9em;
           font-weight: 600;
           color: var(--text-primary);
         }
         
         .generate-formula-btn-modern {
           display: flex;
           align-items: center;
           gap: var(--space-2);
           padding: 8px 16px;
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.1) 0%, 
             rgba(124, 58, 237, 0.06) 100%);
           border: 1px solid rgba(139, 92, 246, 0.3);
           border-radius: 10px;
           color: rgba(139, 92, 246, 0.9);
           font-size: 0.8em;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.2s ease;
         }
         
         .generate-formula-btn-modern:hover {
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.15) 0%, 
             rgba(124, 58, 237, 0.08) 100%);
           transform: translateY(-1px);
           box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
         }
         
         .formula-display-modern {
           background: rgba(15, 23, 42, 0.95);
           border-radius: 8px;
           padding: var(--space-3);
           margin-bottom: var(--space-3);
         }
         
         .formula-display-modern code {
           font-family: 'Monaco', 'Menlo', monospace;
           color: #64dd17;
           font-size: 0.9em;
           line-height: 1.5;
         }
         
         .formula-explanation {
           display: flex;
           align-items: flex-start;
           gap: var(--space-2);
           font-size: 0.8em;
           color: var(--text-secondary);
           opacity: 0.8;
         }
         
         .formula-explanation svg {
           flex-shrink: 0;
           margin-top: 2px;
           color: rgba(34, 197, 94, 0.7);
         }
         
         .modern-add-metric-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           gap: var(--space-3);
           height: 60px;
           border: 2px dashed rgba(139, 92, 246, 0.4);
           background: rgba(139, 92, 246, 0.03);
           border-radius: 20px;
           color: rgba(139, 92, 246, 0.8);
           font-size: 1em;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.3s ease;
           margin-top: var(--space-2);
         }
         
         .modern-add-metric-btn:hover {
           background: rgba(139, 92, 246, 0.06);
           border-color: rgba(139, 92, 246, 0.6);
           transform: translateY(-2px);
         }
         
         .metrics-preview-section {
           margin-top: var(--space-6);
           padding-top: var(--space-5);
           border-top: 1px solid rgba(226, 232, 240, 0.4);
         }
         
         .metrics-preview-section h4 {
           font-size: 1.1em;
           font-weight: 600;
           color: var(--text-primary);
           margin-bottom: var(--space-4);
         }
         
         .metrics-preview-grid {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
           gap: var(--space-3);
         }
         
         .metric-preview-card {
           background: rgba(248, 250, 252, 0.8);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 12px;
           padding: var(--space-4);
         }
         
         .preview-metric-name {
           font-weight: 600;
           color: var(--text-primary);
           margin-bottom: var(--space-2);
         }
         
         .preview-metric-formula {
           font-family: 'Monaco', monospace;
           font-size: 0.8em;
           color: rgba(139, 92, 246, 0.8);
           background: rgba(139, 92, 246, 0.05);
           padding: 4px 8px;
           border-radius: 6px;
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
         
         .formula-editor-section {
           margin-top: 16px;
         }
         
         .formula-editor-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-bottom: 8px;
         }
         
         .enhance-formula-btn {
           display: flex;
           align-items: center;
           gap: 6px;
           padding: 6px 12px;
           background: linear-gradient(135deg, #8B5CF6, #A855F7);
           color: white;
           border: none;
           border-radius: 6px;
           font-size: 0.8em;
           font-weight: 500;
           cursor: pointer;
           transition: all 0.2s ease;
         }
         
         .enhance-formula-btn:hover {
           background: linear-gradient(135deg, #7C3AED, #9333EA);
           transform: translateY(-1px);
         }
         
         .formula-editor {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.3);
           background: rgba(248, 250, 252, 0.4);
           border-radius: 8px;
           padding: 12px 16px;
           font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
           font-size: 0.85em;
           color: var(--text-primary);
           outline: none;
           resize: vertical;
           line-height: 1.4;
         }
         
         .formula-editor:focus {
           background: white;
           border-color: rgba(139, 92, 246, 0.3);
           box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.1);
         }
         
         .formula-help {
           margin-top: 8px;
           padding: 8px 12px;
           background: rgba(139, 92, 246, 0.05);
           border-radius: 6px;
           border-left: 3px solid rgba(139, 92, 246, 0.3);
         }
         
         .formula-examples {
           font-size: 0.8em;
           color: var(--text-secondary);
           line-height: 1.4;
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

         /* Modern Questions Builder Styling */
         .questions-modern-builder {
           display: flex;
           flex-direction: column;
           gap: var(--space-6);
         }
         
         .modern-question-card {
           background: linear-gradient(135deg, 
             rgba(248, 250, 252, 0.95) 0%, 
             rgba(255, 255, 255, 0.98) 100%);
           border: 2px solid rgba(226, 232, 240, 0.6);
           border-radius: 24px;
           padding: var(--space-6);
           transition: all 0.3s ease;
           position: relative;
         }
         
         .modern-question-card:hover {
           transform: translateY(-4px);
           box-shadow: 0 16px 40px rgba(139, 92, 246, 0.15);
           border-color: rgba(139, 92, 246, 0.3);
         }
         
         .question-card-header {
           display: flex;
           align-items: center;
           justify-content: space-between;
           margin-bottom: var(--space-5);
         }
         
         .question-drag-handle {
           width: 20px;
           height: 20px;
           color: rgba(156, 163, 175, 0.6);
           cursor: grab;
           transition: color 0.2s ease;
         }
         
         .question-drag-handle:hover {
           color: rgba(139, 92, 246, 0.8);
         }
         
         .question-number-badge {
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.9) 0%, 
             rgba(124, 58, 237, 0.8) 100%);
           color: white;
           padding: 8px 16px;
           border-radius: 12px;
           font-weight: 700;
           font-size: 0.9em;
           box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
         }
         
         .modern-question-remove-btn {
           width: 36px;
           height: 36px;
           border: none;
           border-radius: 10px;
           background: rgba(239, 68, 68, 0.08);
           color: rgba(239, 68, 68, 0.7);
           cursor: pointer;
           display: flex;
           align-items: center;
           justify-content: center;
           transition: all 0.2s ease;
         }
         
         .modern-question-remove-btn:hover:not(:disabled) {
           background: rgba(239, 68, 68, 0.15);
           transform: scale(1.1);
         }
         
         .modern-question-remove-btn:disabled {
           opacity: 0.3;
           cursor: not-allowed;
         }
         
         .question-content-section {
           margin-bottom: var(--space-5);
         }
         
         .modern-question-input {
           width: 100%;
           border: none;
           background: rgba(248, 250, 252, 0.8);
           border-radius: 16px;
           padding: var(--space-4) var(--space-5);
           font-size: 1.1em;
           font-weight: 500;
           color: var(--text-primary);
           line-height: 1.5;
           outline: none;
           transition: all 0.3s ease;
           min-height: 60px;
         }
         
         .modern-question-input:focus {
           background: white;
           box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
           transform: scale(1.01);
         }
         
         .question-type-section {
           margin-bottom: var(--space-5);
           padding: var(--space-4);
           background: rgba(248, 250, 252, 0.6);
           border-radius: 16px;
           border: 1px solid rgba(226, 232, 240, 0.4);
         }
         
         .type-selector-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-bottom: var(--space-4);
         }
         
         .type-selector-header label {
           font-weight: 600;
           color: var(--text-primary);
           font-size: 0.95em;
         }
         
         .question-settings {
           display: flex;
           align-items: center;
           gap: var(--space-3);
         }
         
         .modern-checkbox {
           display: flex;
           align-items: center;
           gap: var(--space-2);
           cursor: pointer;
           font-size: 0.9em;
           font-weight: 500;
         }
         
         .modern-checkbox input[type="checkbox"] {
           display: none;
         }
         
         .checkbox-custom {
           width: 20px;
           height: 20px;
           border: 2px solid rgba(139, 92, 246, 0.3);
           border-radius: 4px;
           background: white;
           transition: all 0.2s ease;
           display: flex;
           align-items: center;
           justify-content: center;
         }
         
         .modern-checkbox input[type="checkbox"]:checked + .checkbox-custom {
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.9) 0%, 
             rgba(124, 58, 237, 0.8) 100%);
           border-color: rgba(139, 92, 246, 0.6);
         }
         
         .modern-checkbox input[type="checkbox"]:checked + .checkbox-custom::after {
           content: '✓';
           color: white;
           font-size: 12px;
           font-weight: bold;
         }
         
         .question-type-grid {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
           gap: var(--space-3);
         }
         
         .question-type-option {
           display: flex;
           flex-direction: column;
           align-items: center;
           gap: var(--space-2);
           padding: var(--space-3);
           background: white;
           border: 2px solid rgba(226, 232, 240, 0.4);
           border-radius: 12px;
           cursor: pointer;
           transition: all 0.2s ease;
           min-height: 80px;
           justify-content: center;
         }
         
         .question-type-option:hover {
           border-color: rgba(139, 92, 246, 0.4);
           background: rgba(139, 92, 246, 0.02);
           transform: translateY(-1px);
         }
         
         .question-type-option.active {
           border-color: rgba(139, 92, 246, 0.6);
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.08) 0%, 
             rgba(124, 58, 237, 0.04) 100%);
           box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
         }
         
         .type-icon {
           font-size: 1.5em;
           margin-bottom: var(--space-1);
         }
         
         .type-label {
           font-size: 0.85em;
           font-weight: 600;
           color: var(--text-secondary);
           text-align: center;
           line-height: 1.2;
         }
         
         .question-options-section {
           margin-bottom: var(--space-4);
           padding: var(--space-4);
           background: rgba(248, 250, 252, 0.4);
           border-radius: 16px;
           border: 1px solid rgba(226, 232, 240, 0.3);
         }
         
         .options-list {
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
         }
         
         .option-row {
           display: flex;
           align-items: center;
           gap: var(--space-3);
           padding: var(--space-2);
           background: white;
           border-radius: 12px;
           transition: background 0.2s ease;
         }
         
         .option-row:hover {
           background: rgba(248, 250, 252, 0.8);
         }
         
         .option-indicator {
           width: 24px;
           height: 24px;
           display: flex;
           align-items: center;
           justify-content: center;
           background: rgba(139, 92, 246, 0.1);
           border-radius: 6px;
           color: rgba(139, 92, 246, 0.7);
           font-size: 0.9em;
           flex-shrink: 0;
         }
         
         .modern-option-input {
           flex: 1;
           border: 1px solid rgba(226, 232, 240, 0.4);
           background: rgba(255, 255, 255, 0.8);
           border-radius: 8px;
           padding: 10px var(--space-3);
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }
         
         .modern-option-input:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: white;
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
         }
         
         .remove-option-btn {
           width: 28px;
           height: 28px;
           border: none;
           border-radius: 6px;
           background: rgba(239, 68, 68, 0.08);
           color: rgba(239, 68, 68, 0.7);
           cursor: pointer;
           display: flex;
           align-items: center;
           justify-content: center;
           transition: all 0.2s ease;
           flex-shrink: 0;
         }
         
         .remove-option-btn:hover {
           background: rgba(239, 68, 68, 0.15);
           transform: scale(1.1);
         }
         
         .add-option-btn-modern {
           display: flex;
           align-items: center;
           justify-content: center;
           gap: var(--space-2);
           height: 40px;
           border: 1px dashed rgba(139, 92, 246, 0.4);
           background: rgba(139, 92, 246, 0.02);
           border-radius: 12px;
           color: rgba(139, 92, 246, 0.8);
           font-size: 0.85em;
           font-weight: 500;
           cursor: pointer;
           transition: all 0.2s ease;
           margin-top: var(--space-2);
         }
         
         .add-option-btn-modern:hover {
           background: rgba(139, 92, 246, 0.05);
           border-color: rgba(139, 92, 246, 0.6);
         }
         
         .question-analytics-section {
           padding: var(--space-4);
           background: rgba(59, 130, 246, 0.03);
           border: 1px solid rgba(59, 130, 246, 0.1);
           border-radius: 16px;
         }
         
         .analytics-selectors {
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: var(--space-4);
         }
         
         .analytics-selector label {
           display: block;
           font-size: 0.85em;
           font-weight: 600;
           color: var(--text-secondary);
           margin-bottom: var(--space-2);
         }
         
         .modern-select {
           width: 100%;
           border: 1px solid rgba(226, 232, 240, 0.6);
           background: white;
           border-radius: 8px;
           padding: 10px var(--space-3);
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           cursor: pointer;
           transition: all 0.2s ease;
         }
         
         .modern-select:focus {
           border-color: rgba(139, 92, 246, 0.4);
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
         }
         
         .modern-add-question-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           gap: var(--space-3);
           height: 70px;
           border: 2px dashed rgba(139, 92, 246, 0.4);
           background: rgba(139, 92, 246, 0.03);
           border-radius: 24px;
           color: rgba(139, 92, 246, 0.8);
           font-size: 1.1em;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.3s ease;
           margin-top: var(--space-4);
         }
         
         .modern-add-question-btn:hover {
           background: rgba(139, 92, 246, 0.06);
           border-color: rgba(139, 92, 246, 0.6);
           transform: translateY(-2px);
           box-shadow: 0 8px 24px rgba(139, 92, 246, 0.15);
         }
         
         .questions-preview-section {
           margin-top: var(--space-6);
           padding-top: var(--space-5);
           border-top: 1px solid rgba(226, 232, 240, 0.4);
         }
         
         .questions-preview-section h4 {
           font-size: 1.2em;
           font-weight: 600;
           color: var(--text-primary);
           margin-bottom: var(--space-4);
         }
         
         .survey-preview-container {
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
           max-height: 300px;
           overflow-y: auto;
           padding-right: var(--space-2);
         }
         
         .preview-question {
           background: rgba(248, 250, 252, 0.6);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 12px;
           padding: var(--space-4);
           display: flex;
           align-items: flex-start;
           gap: var(--space-3);
         }
         
         .preview-question-number {
           background: rgba(139, 92, 246, 0.1);
           color: rgba(139, 92, 246, 0.8);
           padding: 4px 8px;
           border-radius: 6px;
           font-weight: 600;
           font-size: 0.8em;
           flex-shrink: 0;
         }
         
         .preview-question-text {
           flex: 1;
           font-size: 0.9em;
           color: var(--text-primary);
           line-height: 1.4;
         }
         
         .required-indicator {
           color: rgba(239, 68, 68, 0.8);
           font-weight: bold;
           margin-left: 2px;
         }
         
         .preview-question-type {
           background: rgba(34, 197, 94, 0.1);
           color: rgba(34, 197, 94, 0.8);
           padding: 2px 8px;
           border-radius: 4px;
           font-size: 0.7em;
           font-weight: 600;
           text-transform: uppercase;
           flex-shrink: 0;
         }

         /* Modern Config Page Styling */
         .config-section-modern {
           margin-bottom: var(--space-8);
           padding: var(--space-5);
           background: rgba(248, 250, 252, 0.6);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 20px;
         }

         .section-header {
           display: flex;
           align-items: center;
           gap: var(--space-3);
           margin-bottom: var(--space-5);
           padding-bottom: var(--space-3);
           border-bottom: 1px solid rgba(226, 232, 240, 0.4);
         }

         .section-icon {
           width: 40px;
           height: 40px;
           border-radius: 12px;
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.1) 0%, 
             rgba(124, 58, 237, 0.06) 100%);
           border: 1px solid rgba(139, 92, 246, 0.2);
           display: flex;
           align-items: center;
           justify-content: center;
           color: rgba(139, 92, 246, 0.8);
         }

         .section-header h4 {
           font-size: 1.1em;
           font-weight: 600;
           color: var(--text-primary);
           margin: 0;
         }

         .config-grid {
           display: grid;
           gap: var(--space-5);
         }

         .config-item {
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
         }

         .config-label {
           font-size: 0.95em;
           font-weight: 600;
           color: var(--text-primary);
         }

         /* Image Upload Styling */
         .image-upload-modern {
           display: flex;
           flex-direction: column;
           gap: var(--space-3);
         }

         .modern-upload-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           gap: var(--space-2);
           padding: var(--space-4) var(--space-5);
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.08) 0%, 
             rgba(124, 58, 237, 0.04) 100%);
           border: 2px dashed rgba(139, 92, 246, 0.3);
           border-radius: 16px;
           color: rgba(139, 92, 246, 0.8);
           font-weight: 600;
           cursor: pointer;
           transition: all 0.3s ease;
           min-height: 60px;
         }

         .modern-upload-btn:hover {
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.12) 0%, 
             rgba(124, 58, 237, 0.06) 100%);
           border-color: rgba(139, 92, 246, 0.4);
           transform: translateY(-1px);
         }

         .image-preview {
           position: relative;
           display: inline-block;
           max-width: 200px;
         }

         .preview-image {
           width: 100%;
           height: auto;
           border-radius: 12px;
           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
         }

         .remove-image-btn {
           position: absolute;
           top: -8px;
           right: -8px;
           width: 24px;
           height: 24px;
           border: none;
           border-radius: 50%;
           background: rgba(239, 68, 68, 0.9);
           color: white;
           cursor: pointer;
           display: flex;
           align-items: center;
           justify-content: center;
           box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
           transition: all 0.2s ease;
         }

         .remove-image-btn:hover {
           background: rgba(239, 68, 68, 1);
           transform: scale(1.1);
         }

         /* Languages Grid */
         .languages-grid {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
           gap: var(--space-3);
         }

         .language-option-modern {
           display: flex;
           align-items: center;
           gap: var(--space-2);
           padding: var(--space-3);
           background: white;
           border: 1px solid rgba(226, 232, 240, 0.6);
           border-radius: 12px;
           cursor: pointer;
           transition: all 0.2s ease;
         }

         .language-option-modern:hover {
           background: rgba(248, 250, 252, 0.8);
           border-color: rgba(139, 92, 246, 0.3);
         }

         .language-option-modern input[type="checkbox"] {
           display: none;
         }

         .language-option-modern input[type="checkbox"]:checked + .checkbox-custom {
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.9) 0%, 
             rgba(124, 58, 237, 0.8) 100%);
           border-color: rgba(139, 92, 246, 0.6);
         }

         .language-option-modern input[type="checkbox"]:checked + .checkbox-custom::after {
           content: '✓';
           color: white;
           font-size: 10px;
           font-weight: bold;
         }

         /* Employee Selection */
         .audience-selector {
           display: flex;
           flex-direction: column;
           gap: var(--space-5);
         }

         .mock-employees-grid {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
           gap: var(--space-4);
         }

         .employee-card {
           background: white;
           border: 2px solid rgba(226, 232, 240, 0.4);
           border-radius: 16px;
           transition: all 0.3s ease;
           overflow: hidden;
         }

         .employee-card:hover {
           border-color: rgba(139, 92, 246, 0.3);
           box-shadow: 0 4px 16px rgba(139, 92, 246, 0.1);
           transform: translateY(-2px);
         }

         .employee-selector {
           display: flex;
           align-items: center;
           gap: var(--space-4);
           padding: var(--space-4);
           cursor: pointer;
           width: 100%;
         }

         .employee-selector input[type="checkbox"] {
           display: none;
         }

         .employee-info {
           display: flex;
           align-items: center;
           gap: var(--space-3);
           flex: 1;
         }

         .employee-avatar {
           width: 48px;
           height: 48px;
           border-radius: 50%;
           background: rgba(248, 250, 252, 0.8);
           display: flex;
           align-items: center;
           justify-content: center;
           font-size: 1.5em;
           border: 2px solid rgba(226, 232, 240, 0.4);
         }

         .employee-details {
           display: flex;
           flex-direction: column;
           gap: 2px;
         }

         .employee-name {
           font-weight: 600;
           color: var(--text-primary);
           font-size: 0.95em;
         }

         .employee-role {
           font-size: 0.85em;
           color: var(--text-secondary);
         }

         .employee-department {
           font-size: 0.75em;
           color: var(--text-tertiary);
           background: rgba(139, 92, 246, 0.1);
           padding: 2px 8px;
           border-radius: 6px;
           width: fit-content;
         }

         .selection-indicator {
           display: flex;
           align-items: center;
           justify-content: center;
           width: 32px;
           height: 32px;
         }

         .selected-badge {
           width: 24px;
           height: 24px;
           background: linear-gradient(135deg, 
             rgba(34, 197, 94, 0.9) 0%, 
             rgba(22, 163, 74, 0.8) 100%);
           border-radius: 50%;
           display: flex;
           align-items: center;
           justify-content: center;
           color: white;
           font-size: 12px;
           font-weight: bold;
           box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
         }

         .audience-summary {
           display: flex;
           align-items: center;
           justify-content: space-between;
           padding: var(--space-4);
           background: white;
           border: 1px solid rgba(226, 232, 240, 0.6);
           border-radius: 16px;
         }

         .summary-stats {
           display: flex;
           gap: var(--space-5);
         }

         .stat-item {
           display: flex;
           flex-direction: column;
           align-items: center;
           gap: var(--space-1);
         }

         .stat-number {
           font-size: 1.5em;
           font-weight: 700;
           color: rgba(139, 92, 246, 0.9);
         }

         .stat-label {
           font-size: 0.8em;
           color: var(--text-secondary);
           text-transform: uppercase;
           letter-spacing: 0.5px;
         }

         .select-all-btn {
           padding: 8px 16px;
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.1) 0%, 
             rgba(124, 58, 237, 0.06) 100%);
           border: 1px solid rgba(139, 92, 246, 0.3);
           border-radius: 10px;
           color: rgba(139, 92, 246, 0.9);
           font-weight: 600;
           font-size: 0.85em;
           cursor: pointer;
           transition: all 0.2s ease;
         }

         .select-all-btn:hover {
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.15) 0%, 
             rgba(124, 58, 237, 0.08) 100%);
           transform: translateY(-1px);
         }

         /* Timing Section */
         .timing-grid {
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: var(--space-5);
         }

         .date-picker-item {
           display: flex;
           flex-direction: column;
           gap: var(--space-2);
         }

         .modern-datetime-input {
           padding: var(--space-3) var(--space-4);
           border: 2px solid rgba(226, 232, 240, 0.4);
           background: white;
           border-radius: 12px;
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
           min-height: 48px;
         }

         .modern-datetime-input:focus {
           border-color: rgba(139, 92, 246, 0.4);
           box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
         }

         /* Privacy Options */
         .privacy-options {
           display: flex;
           flex-direction: column;
           gap: var(--space-4);
         }

         .modern-checkbox-large {
           display: flex;
           align-items: flex-start;
           gap: var(--space-3);
           padding: var(--space-4);
           background: white;
           border: 1px solid rgba(226, 232, 240, 0.6);
           border-radius: 16px;
           cursor: pointer;
           transition: all 0.2s ease;
         }

         .modern-checkbox-large:hover {
           background: rgba(248, 250, 252, 0.8);
           border-color: rgba(139, 92, 246, 0.3);
         }

         .modern-checkbox-large input[type="checkbox"] {
           display: none;
         }

         .modern-checkbox-large .checkbox-custom {
           width: 20px;
           height: 20px;
           border: 2px solid rgba(139, 92, 246, 0.3);
           border-radius: 4px;
           background: white;
           transition: all 0.2s ease;
           display: flex;
           align-items: center;
           justify-content: center;
           flex-shrink: 0;
           margin-top: 2px;
         }

         .modern-checkbox-large input[type="checkbox"]:checked + .checkbox-custom {
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.9) 0%, 
             rgba(124, 58, 237, 0.8) 100%);
           border-color: rgba(139, 92, 246, 0.6);
         }

         .modern-checkbox-large input[type="checkbox"]:checked + .checkbox-custom::after {
           content: '✓';
           color: white;
           font-size: 12px;
           font-weight: bold;
         }

         .checkbox-content {
           display: flex;
           flex-direction: column;
           gap: var(--space-1);
         }

         .checkbox-title {
           font-weight: 600;
           color: var(--text-primary);
         }

         .checkbox-description {
           font-size: 0.85em;
           color: var(--text-secondary);
           line-height: 1.4;
         }

         /* Configuration Preview */
         .config-preview-section {
           margin-top: var(--space-6);
           padding: var(--space-5);
           background: linear-gradient(135deg, 
             rgba(248, 250, 252, 0.8) 0%, 
             rgba(255, 255, 255, 0.9) 100%);
           border: 1px solid rgba(226, 232, 240, 0.6);
           border-radius: 20px;
         }

         .config-preview-section h4 {
           font-size: 1.1em;
           font-weight: 600;
           color: var(--text-primary);
           margin-bottom: var(--space-4);
         }

         .config-summary-grid {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
           gap: var(--space-4);
         }

         .summary-item {
           display: flex;
           justify-content: space-between;
           align-items: center;
           padding: var(--space-3);
           background: white;
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 12px;
         }

         .summary-label {
           font-weight: 500;
           color: var(--text-secondary);
           font-size: 0.9em;
         }

         .summary-value {
           font-weight: 600;
           color: var(--text-primary);
           font-size: 0.9em;
         }

         /* Responsive Config Page */
         @media (max-width: 1024px) {
           .config-grid {
             gap: var(--space-4);
           }
           
           .timing-grid {
             grid-template-columns: 1fr;
             gap: var(--space-4);
           }
           
           .mock-employees-grid {
             grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
           }
         }

         @media (max-width: 768px) {
           .config-section-modern {
             padding: var(--space-4);
             margin-bottom: var(--space-6);
           }
           
           .languages-grid {
             grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
           }
           
           .mock-employees-grid {
             grid-template-columns: 1fr;
           }
           
           .config-summary-grid {
             grid-template-columns: 1fr;
           }
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
         
         
         .publish-btn.primary {
           background: linear-gradient(135deg, rgba(94, 74, 143, 0.9) 0%, rgba(84, 64, 133, 0.9) 100%);
           color: white;
           box-shadow: 0 4px 16px rgba(94, 74, 143, 0.3);
         }
         
         .publish-btn.primary:hover {
           background: linear-gradient(135deg, rgba(94, 74, 143, 1) 0%, rgba(84, 64, 133, 1) 100%);
           transform: translateY(-2px);
           box-shadow: 0 8px 24px rgba(94, 74, 143, 0.4);
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
           padding: var(--space-3) var(--space-4);
           background: rgba(255, 255, 255, 0.6);
           border-top: 1px solid rgba(226, 232, 240, 0.3);
           margin-top: var(--space-3);
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
           background: linear-gradient(135deg, rgba(94, 74, 143, 0.9) 0%, rgba(84, 64, 133, 0.9) 100%);
           color: white;
         }
         
         .nav-btn.primary:hover:not(:disabled) {
           background: linear-gradient(135deg, rgba(94, 74, 143, 1) 0%, rgba(84, 64, 133, 1) 100%);
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
           background: linear-gradient(135deg, rgba(250, 251, 255, 0.8) 0%, rgba(255, 255, 255, 0.9) 100%);
         }
         
         .preview-header {
           text-align: center;
           margin-bottom: var(--space-6);
           padding: var(--space-5);
           background: rgba(255, 255, 255, 0.9);
           border-radius: 16px;
           border: 1px solid rgba(226, 232, 240, 0.3);
         }
         
         .preview-branding {
           display: flex;
           justify-content: center;
           margin-bottom: var(--space-4);
         }
         
         .preview-logo {
           height: 60px;
           width: auto;
           max-width: 200px;
           object-fit: contain;
         }
         
         .preview-logo-fallback {
           display: flex;
           align-items: center;
           justify-content: center;
           height: 60px;
         }
         
         .preview-logo-fallback .logo-text {
           font-size: 1.5em;
           font-weight: 700;
           color: #392A48;
           text-transform: lowercase;
         }
         
         .preview-title {
           font-size: 1.8em;
           font-weight: 700;
           color: var(--text-primary);
           margin-bottom: var(--space-3);
         }
         
         .preview-description {
           font-size: 1em;
           color: var(--text-secondary);
           line-height: 1.6;
           margin-bottom: var(--space-3);
         }
         
         .preview-meta {
           display: flex;
           justify-content: center;
           gap: var(--space-4);
           font-size: 0.85em;
           color: var(--text-secondary);
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
           background: linear-gradient(135deg, rgba(94, 74, 143, 0.9) 0%, rgba(84, 64, 133, 0.9) 100%);
           color: white;
           border: none;
         }
         
         .preview-btn.primary:hover {
           background: linear-gradient(135deg, rgba(94, 74, 143, 1) 0%, rgba(84, 64, 133, 1) 100%);
           transform: translateY(-2px);
           box-shadow: 0 8px 24px rgba(94, 74, 143, 0.3);
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

         /* Modern Publish Page Styling */
         .publish-overview {
           margin-bottom: var(--space-6);
         }

         .overview-grid {
           display: grid;
           grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
           gap: var(--space-4);
           margin-bottom: var(--space-6);
         }

         .overview-item {
           background: rgba(248, 250, 252, 0.8);
           border: 1px solid rgba(226, 232, 240, 0.6);
           border-radius: 16px;
           padding: var(--space-4);
           display: flex;
           align-items: center;
           gap: var(--space-3);
           transition: all 0.2s ease;
         }

         .overview-item:hover {
           background: rgba(255, 255, 255, 0.9);
           border-color: rgba(139, 92, 246, 0.3);
           transform: translateY(-1px);
         }

         .overview-icon {
           font-size: 1.5em;
           width: 48px;
           height: 48px;
           display: flex;
           align-items: center;
           justify-content: center;
           background: rgba(255, 255, 255, 0.8);
           border-radius: 12px;
           border: 1px solid rgba(226, 232, 240, 0.4);
         }

         .overview-content {
           flex: 1;
         }

         .overview-title {
           font-weight: 600;
           color: var(--text-primary);
           font-size: 0.95em;
           margin-bottom: 2px;
         }

         .overview-subtitle {
           font-size: 0.8em;
           color: var(--text-secondary);
           opacity: 0.8;
         }

         /* Publish Options */
         .publish-options-section {
           margin-bottom: var(--space-6);
         }

         .publish-options-grid {
           display: flex;
           flex-direction: column;
           gap: var(--space-4);
         }

         .publish-option {
           background: rgba(255, 255, 255, 0.9);
           border: 2px solid rgba(226, 232, 240, 0.4);
           border-radius: 20px;
           padding: var(--space-5);
           transition: all 0.3s ease;
         }

         .publish-option:hover {
           border-color: rgba(139, 92, 246, 0.3);
           box-shadow: 0 8px 24px rgba(139, 92, 246, 0.1);
           transform: translateY(-2px);
         }

         .option-header {
           display: flex;
           align-items: flex-start;
           gap: var(--space-4);
           margin-bottom: var(--space-4);
         }

         .option-icon {
           font-size: 2em;
           width: 56px;
           height: 56px;
           display: flex;
           align-items: center;
           justify-content: center;
           background: rgba(248, 250, 252, 0.8);
           border-radius: 16px;
           border: 2px solid rgba(226, 232, 240, 0.4);
         }

         .option-title {
           font-size: 1.2em;
           font-weight: 700;
           color: var(--text-primary);
           margin-bottom: var(--space-1);
         }

         .option-description {
           font-size: 0.9em;
           color: var(--text-secondary);
           line-height: 1.4;
         }

         .publish-action-btn {
           display: flex;
           align-items: center;
           justify-content: center;
           gap: var(--space-2);
           padding: var(--space-3) var(--space-5);
           border: none;
           border-radius: 12px;
           font-weight: 600;
           font-size: 0.95em;
           cursor: pointer;
           transition: all 0.3s ease;
           min-width: 140px;
         }

         .publish-action-btn.primary {
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.9) 0%, 
             rgba(124, 58, 237, 0.8) 100%);
           color: white;
           box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
         }

         .publish-action-btn.primary:hover:not(:disabled) {
           transform: translateY(-2px);
           box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4);
         }

         .publish-action-btn.secondary {
           background: rgba(59, 130, 246, 0.1);
           color: rgba(59, 130, 246, 0.9);
           border: 1px solid rgba(59, 130, 246, 0.3);
         }

         .publish-action-btn.secondary:hover:not(:disabled) {
           background: rgba(59, 130, 246, 0.15);
           transform: translateY(-1px);
         }

         .publish-action-btn.tertiary {
           background: rgba(156, 163, 175, 0.1);
           color: rgba(75, 85, 99, 0.8);
           border: 1px solid rgba(156, 163, 175, 0.3);
         }

         .publish-action-btn.tertiary:hover:not(:disabled) {
           background: rgba(156, 163, 175, 0.15);
           transform: translateY(-1px);
         }

         .publish-action-btn:disabled {
           opacity: 0.5;
           cursor: not-allowed;
           transform: none !important;
           box-shadow: none !important;
         }

         .schedule-controls {
           display: flex;
           align-items: center;
           gap: var(--space-3);
         }

         .schedule-input {
           flex: 1;
           padding: var(--space-3);
           border: 1px solid rgba(226, 232, 240, 0.6);
           background: rgba(248, 250, 252, 0.4);
           border-radius: 10px;
           font-size: 0.9em;
           color: var(--text-primary);
           outline: none;
           transition: all 0.2s ease;
         }

         .schedule-input:focus {
           border-color: rgba(139, 92, 246, 0.4);
           background: white;
           box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
         }

         /* Recipients Preview */
         .recipients-preview {
           margin-bottom: var(--space-6);
           padding: var(--space-5);
           background: rgba(248, 250, 252, 0.6);
           border: 1px solid rgba(226, 232, 240, 0.4);
           border-radius: 20px;
         }

         .recipients-preview h4 {
           font-size: 1.1em;
           font-weight: 600;
           color: var(--text-primary);
           margin-bottom: var(--space-4);
         }

         .recipients-list {
           display: flex;
           flex-wrap: wrap;
           gap: var(--space-3);
         }

         .recipient-chip {
           display: flex;
           align-items: center;
           gap: var(--space-2);
           padding: var(--space-2) var(--space-3);
           background: white;
           border: 1px solid rgba(139, 92, 246, 0.2);
           border-radius: 12px;
           transition: all 0.2s ease;
         }

         .recipient-chip:hover {
           background: rgba(139, 92, 246, 0.05);
           border-color: rgba(139, 92, 246, 0.4);
         }

         .recipient-avatar {
           font-size: 1.2em;
         }

         .recipient-name {
           font-weight: 600;
           color: var(--text-primary);
           font-size: 0.85em;
         }

         .recipient-role {
           font-size: 0.75em;
           color: var(--text-secondary);
           background: rgba(139, 92, 246, 0.1);
           padding: 2px 6px;
           border-radius: 4px;
         }

         .no-recipients {
           display: flex;
           flex-direction: column;
           align-items: center;
           gap: var(--space-3);
           padding: var(--space-6);
           text-align: center;
         }

         .no-recipients-icon {
           font-size: 3em;
           opacity: 0.6;
         }

         .no-recipients-text {
           display: flex;
           flex-direction: column;
           gap: var(--space-1);
         }

         .no-recipients-text div:first-child {
           font-weight: 600;
           color: var(--text-primary);
         }

         .no-recipients-text div:last-child {
           font-size: 0.9em;
           color: var(--text-secondary);
         }

         .back-to-config-btn {
           padding: var(--space-2) var(--space-4);
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.1) 0%, 
             rgba(124, 58, 237, 0.06) 100%);
           border: 1px solid rgba(139, 92, 246, 0.3);
           border-radius: 10px;
           color: rgba(139, 92, 246, 0.9);
           font-weight: 600;
           font-size: 0.85em;
           cursor: pointer;
           transition: all 0.2s ease;
         }

         .back-to-config-btn:hover {
           background: linear-gradient(135deg, 
             rgba(139, 92, 246, 0.15) 0%, 
             rgba(124, 58, 237, 0.08) 100%);
           transform: translateY(-1px);
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
         .editor-content, .survey-preview {
           scroll-behavior: smooth;
         }
         
         .editor-content::-webkit-scrollbar,
         .survey-preview::-webkit-scrollbar {
           width: 6px;
         }
         
         .editor-content::-webkit-scrollbar-track,
         .survey-preview::-webkit-scrollbar-track {
           background: transparent;
         }
         
         .editor-content::-webkit-scrollbar-thumb,
         .survey-preview::-webkit-scrollbar-thumb {
           background: rgba(226, 232, 240, 0.6);
           border-radius: 3px;
         }
         
         .editor-content::-webkit-scrollbar-thumb:hover,
         .survey-preview::-webkit-scrollbar-thumb:hover {
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
          }
          
         @media (max-width: 768px) {
           .canvas-pane.open { 
             width: 95vw; 
             right: 2.5vw; 
             left: 2.5vw; 
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
           background: linear-gradient(135deg, rgba(94, 74, 143, 0.9) 0%, rgba(84, 64, 133, 0.9) 100%);
           color: rgba(255, 255, 255, 0.9);
           border: none;
           padding: 12px 16px;
           border-radius: 8px;
           font-weight: 500;
           cursor: pointer;
           transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
           box-shadow: 0 2px 8px rgba(94, 74, 143, 0.15);
           margin-bottom: var(--space-3);
           font-size: 0.9em;
           width: 100%;
         }

         .enable-survey-btn:hover {
           background: linear-gradient(135deg, rgba(94, 74, 143, 1) 0%, rgba(84, 64, 133, 1) 100%);
           transform: translateY(-1px);
           box-shadow: 0 4px 12px rgba(94, 74, 143, 0.25);
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
         
         .ai-container .message {
           justify-content: flex-start;
         }
         
         .user-container {
           align-items: flex-end;
         }
         
         .user-container .message {
           justify-content: flex-end;
         }
         
         /* Message Actions Styles - Position relative to message bubble */
         .message-actions-container {
           margin-top: 6px;
         }
         
         /* AI actions: align with AI bubble left edge */
         .ai-actions-container {
           display: flex;
           justify-content: flex-start;
         }
         
         .ai-actions-container .message-actions {
           display: flex;
           gap: 4px;
           width: fit-content;
         }
         
         /* User actions: align with user bubble right edge */
         .user-actions-container {
           display: flex;
           justify-content: flex-end;
         }
         
         .user-actions-container .message-actions {
           display: flex;
           gap: 4px;
           width: fit-content;
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
           transition: margin-right 0.3s ease;
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

        /* Survey Taking Styles */
        .survey-taking {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 12px;
          overflow: hidden;
        }

        .survey-header {
          padding: var(--space-6);
          border-bottom: 1px solid rgba(139, 92, 246, 0.1);
          background: linear-gradient(135deg, #f8f6ff 0%, #ffffff 100%);
        }

        .survey-branding {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }

        .survey-logo {
          width: 40px;
          height: 40px;
          border-radius: 8px;
        }

        .survey-logo-fallback {
          width: 40px;
          height: 40px;
          background: var(--primary);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: var(--text-sm);
        }

        .survey-title {
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 var(--space-2) 0;
        }

        .survey-description {
          font-size: var(--text-base);
          color: var(--text-secondary);
          margin: 0 0 var(--space-4) 0;
          line-height: 1.6;
        }

        .survey-progress {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .progress-info {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          font-weight: 500;
        }

        .survey-questions {
          flex: 1;
          padding: var(--space-6);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .survey-question {
          background: rgba(248, 246, 255, 0.5);
          border: 1px solid rgba(139, 92, 246, 0.1);
          border-radius: 12px;
          padding: var(--space-5);
        }

        .question-label {
          display: block;
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-4);
          line-height: 1.4;
        }

        .required {
          color: #ef4444;
          margin-left: var(--space-1);
        }

        .response-options {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .option-label {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          background: white;
          border: 2px solid rgba(139, 92, 246, 0.1);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: var(--text-base);
        }

        .option-label:hover {
          border-color: rgba(139, 92, 246, 0.3);
          background: rgba(139, 92, 246, 0.02);
        }

        .option-label input {
          margin: 0;
        }

        .response-scale {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .scale-labels {
          display: flex;
          justify-content: space-between;
          font-size: var(--text-sm);
          color: var(--text-secondary);
          font-weight: 500;
        }

        .scale-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: rgba(139, 92, 246, 0.1);
          outline: none;
          -webkit-appearance: none;
        }

        .scale-slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .scale-value {
          text-align: center;
          font-weight: 600;
          color: var(--primary);
          background: rgba(139, 92, 246, 0.1);
          padding: var(--space-2);
          border-radius: 6px;
          font-size: var(--text-sm);
        }

        .response-text {
          width: 100%;
          padding: var(--space-4);
          border: 2px solid rgba(139, 92, 246, 0.1);
          border-radius: 8px;
          font-size: var(--text-base);
          resize: vertical;
          font-family: inherit;
          transition: border-color 0.2s ease;
        }

        .response-text:focus {
          outline: none;
          border-color: var(--primary);
        }

        .survey-actions {
          padding: var(--space-6);
          border-top: 1px solid rgba(139, 92, 246, 0.1);
          display: flex;
          gap: var(--space-3);
          justify-content: flex-end;
          background: rgba(248, 246, 255, 0.3);
        }

        .survey-btn {
          padding: var(--space-3) var(--space-6);
          border-radius: 8px;
          font-weight: 600;
          font-size: var(--text-base);
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .survey-btn.primary {
          background: var(--primary);
          color: white;
        }

        .survey-btn.primary:hover:not(:disabled) {
          background: rgba(139, 92, 246, 0.9);
          transform: translateY(-1px);
        }

        .survey-btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .survey-btn.secondary {
          background: transparent;
          color: var(--text-secondary);
          border: 2px solid rgba(139, 92, 246, 0.2);
        }

        .survey-btn.secondary:hover {
          background: rgba(139, 92, 246, 0.05);
          border-color: rgba(139, 92, 246, 0.3);
        }

        /* Notification Action Buttons */
        .notification-actions {
          display: flex;
          gap: var(--space-2);
          margin-top: var(--space-3);
        }

        .notification-btn {
          padding: var(--space-2) var(--space-3);
          border-radius: 6px;
          font-weight: 500;
          font-size: var(--text-sm);
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .notification-btn.primary {
          background: var(--primary);
          color: white;
        }

        .notification-btn.primary:hover {
          background: rgba(139, 92, 246, 0.9);
        }

        .notification-btn.secondary {
          background: rgba(0, 0, 0, 0.05);
          color: var(--text-secondary);
        }

        .notification-btn.secondary:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        /* Survey notification specific styling */
        .notification-toast.survey {
          border-left: 4px solid var(--primary);
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%);
        }

        .notification-toast.survey .notification-icon {
          background: var(--primary);
          color: white;
        }

      
      /* Confetti Celebration Styles */
      .confetti-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10000;
        overflow: hidden;
      }
      
      .confetti {
        position: absolute;
        top: -10px;
        width: 10px;
        height: 10px;
        animation: confetti-fall linear infinite;
      }
      
      .confetti-square {
        width: 8px;
        height: 8px;
      }
      
      .confetti-circle {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }
      
      .confetti-triangle {
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 8px solid currentColor;
        background: transparent !important;
      }
      
      @keyframes confetti-fall {
        0% {
          transform: translateY(-100vh) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(720deg);
          opacity: 0;
        }
      }
      
      .celebration-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        backdrop-filter: blur(4px);
        animation: celebration-fade-in 0.5s ease-out;
        transition: opacity 0.5s ease-out;
      }
      
      .celebration-content {
        background: white;
        border-radius: 20px;
        padding: 3rem 2rem;
        text-align: center;
        max-width: 400px;
        animation: celebration-bounce 0.6s ease-out;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      
      .celebration-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: celebration-pulse 1s ease-in-out infinite;
      }
      
      .celebration-title {
        font-size: 1.8rem;
        font-weight: 700;
        color: #1a202c;
        margin-bottom: 0.5rem;
        background: linear-gradient(135deg, #8B5CF6, #EC4899);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      
      .celebration-message {
        font-size: 1rem;
        color: #718096;
        margin: 0;
        line-height: 1.5;
      }
      
      @keyframes celebration-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      
      @keyframes celebration-bounce {
        0% {
          transform: scale(0.3) translateY(100px);
          opacity: 0;
        }
        50% {
          transform: scale(1.05) translateY(-10px);
        }
        70% {
          transform: scale(0.95) translateY(5px);
        }
        100% {
          transform: scale(1) translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes celebration-pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }
      
      `}</style>
      
      {/* Notifications - REMOVED: User requested no notifications at all */}
    </div>
  )
}

export default AIChat