import React, { createContext, useContext, useState, useEffect } from 'react'
import { useUser } from './UserContext'
import { 
  getAvailablePersonas, 
  getDefaultPersona, 
  getDashboardConfig,
  canSwitchToPersona 
} from '../utils/roleHierarchy'

const PersonaContext = createContext()

export const usePersona = () => {
  const context = useContext(PersonaContext)
  if (!context) {
    throw new Error('usePersona must be used within a PersonaProvider')
  }
  return context
}

export const PersonaProvider = ({ children }) => {
  const { currentUser } = useUser()
  
  // Initialize with default persona based on user role
  const [activePersona, setActivePersona] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Update active persona when user changes
  useEffect(() => {
    if (currentUser) {
      const defaultPersona = getDefaultPersona(currentUser.role)
      setActivePersona(defaultPersona)
    }
  }, [currentUser])

  // Get available personas for current user
  const getAvailablePersonasForUser = () => {
    if (!currentUser) return []
    return getAvailablePersonas(currentUser.role)
  }

  // Switch to a specific persona with validation
  const switchPersona = async (targetPersona) => {
    if (!currentUser) {
      console.warn('Cannot switch persona: no current user')
      return false
    }

    if (!canSwitchToPersona(currentUser.role, targetPersona)) {
      console.warn(`User ${currentUser.role} cannot switch to ${targetPersona}`)
      return false
    }

    if (activePersona === targetPersona) {
      return true // Already on target persona
    }

    setIsTransitioning(true)
    
    // Simulate a brief loading state for better UX
    await new Promise(resolve => setTimeout(resolve, 300))
    
    setActivePersona(targetPersona)
    setIsTransitioning(false)
    
    return true
  }

  // Get dashboard configuration for active persona
  const getDashboardConfigForActivePersona = () => {
    if (!activePersona) return null
    return getDashboardConfig(activePersona)
  }

  // Check if user has access to multiple personas (show/hide toggle)
  const hasMultiplePersonas = () => {
    return getAvailablePersonasForUser().length > 1
  }

  // Get persona-specific data context
  const getPersonaDataContext = () => {
    if (!activePersona || !currentUser) return null
    
    return {
      persona: activePersona,
      userRole: currentUser.role,
      userId: currentUser.id,
      userName: currentUser.name,
      department: currentUser.department,
      dashboardConfig: getDashboardConfigForActivePersona(),
      scope: getDashboardConfigForActivePersona()?.scope || 'personal'
    }
  }

  const value = {
    // State
    activePersona,
    isTransitioning,
    currentUser,
    
    // Methods
    switchPersona,
    getAvailablePersonasForUser,
    getDashboardConfigForActivePersona,
    hasMultiplePersonas,
    getPersonaDataContext,
    
    // Computed values
    availablePersonas: getAvailablePersonasForUser(),
    dashboardConfig: getDashboardConfigForActivePersona(),
    dataContext: getPersonaDataContext()
  }

  return (
    <PersonaContext.Provider value={value}>
      {children}
    </PersonaContext.Provider>
  )
}

export default PersonaContext
