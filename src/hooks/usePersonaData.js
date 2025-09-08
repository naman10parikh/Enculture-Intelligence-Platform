import { useState, useEffect, useMemo } from 'react'
import { usePersona } from '../context/PersonaContext'
import { getPersonaData, getPersonaActions } from '../data/personaData'
import { ROLES } from '../utils/roleHierarchy'

// Custom hook to manage persona-specific data filtering and transformation
export const usePersonaData = () => {
  const { activePersona, isTransitioning, dataContext } = usePersona()
  const [cachedData, setCachedData] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  // Memoized persona data to avoid unnecessary re-computations
  const personaData = useMemo(() => {
    if (!activePersona) return null
    
    // Check cache first
    if (cachedData[activePersona] && !isTransitioning) {
      return cachedData[activePersona]
    }

    const data = getPersonaData(activePersona)
    
    // Cache the data
    setCachedData(prev => ({
      ...prev,
      [activePersona]: data
    }))
    
    return data
  }, [activePersona, cachedData, isTransitioning])

  // Get actions specific to current persona
  const personaActions = useMemo(() => {
    if (!activePersona) return []
    return getPersonaActions(activePersona)
  }, [activePersona])

  // Transform data based on persona scope and permissions
  const getFilteredData = useMemo(() => {
    if (!personaData || !dataContext) return {}

    const { scope } = dataContext
    
    return {
      // Core metrics with persona-specific values
      engagementScore: getEngagementScore(personaData, scope),
      satisfactionScore: getSatisfactionScore(personaData, scope),
      productivityScore: getProductivityScore(personaData, scope),
      
      // Chart data
      engagementData: personaData.engagementData || [],
      surveyCompletionData: personaData.surveyCompletionData || [],
      productivityData: personaData.productivityData || [],
      
      // Persona-specific insights
      insights: getPersonaInsights(personaData, scope),
      
      // Team/Department/Company data based on persona
      organizationalData: getOrganizationalData(personaData, scope),
      
      // Recent activities and achievements
      recentActivities: getRecentActivities(personaData, scope),
      
      // Goals and objectives
      goals: getGoalsData(personaData, scope)
    }
  }, [personaData, dataContext])

  // Handle loading states during persona transitions
  useEffect(() => {
    if (isTransitioning) {
      setIsLoading(true)
      // Simulate data loading
      const timer = setTimeout(() => setIsLoading(false), 300)
      return () => clearTimeout(timer)
    } else {
      setIsLoading(false)
    }
  }, [isTransitioning])

  return {
    personaData,
    filteredData: getFilteredData,
    personaActions,
    isLoading: isLoading || isTransitioning,
    activePersona,
    dataContext,
    
    // Utility methods
    refreshData: () => {
      setCachedData(prev => ({
        ...prev,
        [activePersona]: undefined
      }))
    },
    
    // Get specific data subsets
    getMetrics: () => getFilteredData.metrics || {},
    getChartData: (chartType) => getFilteredData[`${chartType}Data`] || [],
    getInsights: () => getFilteredData.insights || []
  }
}

// Helper functions for data transformation

const getEngagementScore = (data, scope) => {
  switch (scope) {
    case 'personal':
      return data.metrics?.engagementScore || data.metrics?.satisfaction || { value: 8.5, unit: '/10', status: 'good' }
    case 'team':
      return data.metrics?.teamEngagement || { value: 8.9, unit: '/10', status: 'excellent' }
    case 'department':
      return data.metrics?.departmentEngagement || { value: 8.6, unit: '/10', status: 'excellent' }
    case 'company':
      return data.metrics?.companyEngagement || { value: 8.4, unit: '/10', status: 'excellent' }
    case 'hr':
      return data.metrics?.overallWellness || { value: 8.4, unit: '/10', status: 'good' }
    default:
      return { value: 8.5, unit: '/10', status: 'good' }
  }
}

const getSatisfactionScore = (data, scope) => {
  switch (scope) {
    case 'personal':
      return data.metrics?.satisfaction || { value: 8.5, unit: '/10', status: 'excellent' }
    case 'team':
      return data.metrics?.teamProductivity || { value: 94, unit: '%', status: 'strong' }
    case 'department':
      return data.metrics?.departmentProductivity || { value: 91, unit: '%', status: 'strong' }
    case 'company':
      return data.metrics?.overallProductivity || { value: 89, unit: '%', status: 'good' }
    case 'hr':
      return data.metrics?.diversityIndex || { value: 87, unit: '%', status: 'good' }
    default:
      return { value: 8.5, unit: '/10', status: 'excellent' }
  }
}

const getProductivityScore = (data, scope) => {
  switch (scope) {
    case 'personal':
      return data.metrics?.growthScore || { value: 92, unit: '%', status: 'strong' }
    case 'team':
      return data.metrics?.collaborationScore || { value: 9.1, unit: '/10', status: 'outstanding' }
    case 'department':
      return data.metrics?.crossTeamCollaboration || { value: 87, unit: '%', status: 'good' }
    case 'company':
      return data.metrics?.cultureHealth || { value: 8.7, unit: '/10', status: 'excellent' }
    case 'hr':
      return data.metrics?.inclusionScore || { value: 9.0, unit: '/10', status: 'excellent' }
    default:
      return { value: 92, unit: '%', status: 'strong' }
  }
}

const getPersonaInsights = (data, scope) => {
  switch (scope) {
    case 'personal':
      return data.recentAchievements || []
    case 'team':
      return data.teamInsights || []
    case 'department':
      return data.departmentInsights || []
    case 'company':
      return data.companyInsights || []
    case 'hr':
      return data.hrInsights || []
    default:
      return []
  }
}

const getOrganizationalData = (data, scope) => {
  switch (scope) {
    case 'personal':
      return null // No organizational data for personal view
    case 'team':
      return {
        members: data.teamMembers || [],
        size: data.teamSize || 0,
        type: 'team'
      }
    case 'department':
      return {
        teams: data.departmentTeams || [],
        size: data.departmentSize || 0,
        teamsCount: data.teamsCount || 0,
        type: 'department'
      }
    case 'company':
      return {
        departments: data.departmentBreakdown || [],
        employeeCount: data.employeeCount || 0,
        departmentCount: data.departmentCount || 0,
        locationCount: data.locationCount || 0,
        type: 'company'
      }
    case 'hr':
      return {
        programs: data.culturePrograms || [],
        totalEmployees: data.totalEmployees || 0,
        activePrograms: data.activePrograms || 0,
        complianceScore: data.complianceScore || 0,
        type: 'hr'
      }
    default:
      return null
  }
}

const getRecentActivities = (data, scope) => {
  // Generate recent activities based on scope
  switch (scope) {
    case 'personal':
      return data.recentAchievements || []
    case 'team':
      return [
        { type: 'milestone', title: 'Team Sprint Completed', time: '2 hours ago', icon: '🎯' },
        { type: 'feedback', title: 'Positive Client Feedback', time: '1 day ago', icon: '👏' },
        { type: 'collaboration', title: 'Cross-team Meeting', time: '2 days ago', icon: '🤝' }
      ]
    case 'department':
      return [
        { type: 'strategy', title: 'Q1 Planning Session', time: '1 day ago', icon: '📋' },
        { type: 'hiring', title: 'New Team Member Onboarded', time: '3 days ago', icon: '👋' },
        { type: 'process', title: 'Process Improvement Implemented', time: '1 week ago', icon: '⚡' }
      ]
    case 'company':
    case 'hr':
      return [
        { type: 'culture', title: 'Company Culture Survey Launched', time: '2 days ago', icon: '📊' },
        { type: 'policy', title: 'New Wellness Program Started', time: '1 week ago', icon: '🌟' },
        { type: 'recognition', title: 'Employee Recognition Event', time: '2 weeks ago', icon: '🏆' }
      ]
    default:
      return []
  }
}

const getGoalsData = (data, scope) => {
  if (scope === 'personal') {
    return data.goals || []
  }
  
  // For other scopes, return aggregated goals
  return [
    { title: `Improve ${scope} engagement`, progress: 75, completed: false },
    { title: `Enhance ${scope} collaboration`, progress: 60, completed: false },
    { title: `Boost ${scope} productivity`, progress: 85, completed: false }
  ]
}

export default usePersonaData
