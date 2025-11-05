// Role-specific data models for different persona dashboards
// This provides tailored data sets based on the selected persona view

import { ROLES } from '../utils/roleHierarchy'

// Base data structures that can be filtered and transformed
const baseEngagementData = [
  { day: 'Mon', employee: 8.2, team: 8.5, department: 8.4, company: 8.3 },
  { day: 'Tue', employee: 8.5, team: 8.7, department: 8.6, company: 8.5 },
  { day: 'Wed', employee: 8.7, team: 8.9, department: 8.8, company: 8.7 },
  { day: 'Thu', employee: 8.4, team: 8.6, department: 8.5, company: 8.4 },
  { day: 'Fri', employee: 8.9, team: 9.1, department: 9.0, company: 8.9 },
  { day: 'Sat', employee: 8.6, team: 8.8, department: 8.7, company: 8.6 },
  { day: 'Sun', employee: 9.1, team: 9.3, department: 9.2, company: 9.0 }
]

const baseSurveyCompletionData = [
  { month: 'Jan', employee: 100, team: 85, department: 78, company: 72, hr: 95 },
  { month: 'Feb', employee: 100, team: 92, department: 84, company: 79, hr: 98 },
  { month: 'Mar', employee: 100, team: 78, department: 71, company: 68, hr: 91 },
  { month: 'Apr', employee: 100, team: 94, department: 87, company: 83, hr: 97 },
  { month: 'May', employee: 100, team: 88, department: 82, company: 77, hr: 94 },
  { month: 'Jun', employee: 100, team: 96, department: 89, company: 85, hr: 99 }
]

const baseProductivityData = [
  { day: 'M', employee: 7.2, team: 7.5, department: 7.4, company: 7.3 },
  { day: 'T', employee: 8.1, team: 8.3, department: 8.2, company: 8.1 },
  { day: 'W', employee: 7.8, team: 8.0, department: 7.9, company: 7.8 },
  { day: 'T', employee: 8.4, team: 8.6, department: 8.5, company: 8.4 },
  { day: 'F', employee: 7.6, team: 7.8, department: 7.7, company: 7.6 },
  { day: 'S', employee: 6.2, team: 6.4, department: 6.3, company: 6.2 },
  { day: 'S', employee: 5.8, team: 6.0, department: 5.9, company: 5.8 }
]

// Employee-specific data (personal view)
const employeePersonalData = {
  metrics: {
    satisfaction: { value: 8.5, unit: '/10', status: 'excellent', trend: '+0.3' },
    growthScore: { value: 92, unit: '%', status: 'strong', trend: '+5%' },
    engagementScore: { value: 8.7, unit: '/10', status: 'excellent', trend: '+0.2' },
    wellnessScore: { value: 8.4, unit: '/10', status: 'good', trend: '+0.1' }
  },
  goals: [
    { title: 'Complete Leadership Workshop', completed: true, progress: 100 },
    { title: 'Obtain Industry Certification', completed: true, progress: 100 },
    { title: 'Mentor Junior Colleague', completed: false, progress: 60 },
    { title: 'Complete Public Speaking Course', completed: false, progress: 30 }
  ],
  recentAchievements: [
    { icon: '🎯', title: 'Goal Achievement', desc: 'Completed Q4 objectives', time: '2 days ago' },
    { icon: '📈', title: 'Skill Growth', desc: 'Advanced in leadership skills', time: '1 week ago' },
    { icon: '⭐', title: 'Recognition', desc: 'Received peer appreciation', time: '2 weeks ago' }
  ]
}

// Manager-specific data (team view)
const managerTeamData = {
  teamSize: 8,
  metrics: {
    teamEngagement: { value: 8.9, unit: '/10', status: 'excellent', trend: '+0.4' },
    teamProductivity: { value: 94, unit: '%', status: 'strong', trend: '+3%' },
    retentionRate: { value: 96, unit: '%', status: 'excellent', trend: '+2%' },
    collaborationScore: { value: 9.1, unit: '/10', status: 'outstanding', trend: '+0.5' }
  },
  teamMembers: [
    { name: 'Sarah Chen', role: 'Senior Dev', avatar: '👩‍💼', satisfaction: 9.2, productivity: 95, status: 'excellent' },
    { name: 'Mike Johnson', role: 'Designer', avatar: '👨‍🎨', satisfaction: 8.8, productivity: 92, status: 'good' },
    { name: 'Lisa Wong', role: 'Analyst', avatar: '👩‍💻', satisfaction: 8.5, productivity: 88, status: 'good' },
    { name: 'David Kim', role: 'QA Engineer', avatar: '👨‍💻', satisfaction: 9.0, productivity: 94, status: 'excellent' },
    { name: 'Emma Davis', role: 'Product Owner', avatar: '👩‍💼', satisfaction: 8.7, productivity: 91, status: 'good' },
    { name: 'Alex Chen', role: 'Developer', avatar: '👨‍💻', satisfaction: 8.9, productivity: 93, status: 'excellent' },
    { name: 'Maya Patel', role: 'Designer', avatar: '👩‍🎨', satisfaction: 8.6, productivity: 89, status: 'good' },
    { name: 'Tom Wilson', role: 'Analyst', avatar: '👨‍💼', satisfaction: 8.4, productivity: 87, status: 'good' }
  ],
  teamInsights: [
    { metric: 'High Collaboration', value: '95%', status: 'positive', description: 'Team works well together' },
    { metric: 'Communication Quality', value: '9.2/10', status: 'positive', description: 'Clear and effective communication' },
    { metric: 'Innovation Index', value: '88%', status: 'good', description: 'Strong creative problem solving' }
  ]
}

// Manager's Manager data (department view)
const managerOfManagersData = {
  departmentSize: 32,
  teamsCount: 4,
  metrics: {
    departmentEngagement: { value: 8.6, unit: '/10', status: 'excellent', trend: '+0.2' },
    crossTeamCollaboration: { value: 87, unit: '%', status: 'good', trend: '+5%' },
    departmentProductivity: { value: 91, unit: '%', status: 'strong', trend: '+2%' },
    managerEffectiveness: { value: 9.0, unit: '/10', status: 'excellent', trend: '+0.3' }
  },
  departmentTeams: [
    { name: 'Product Team', manager: 'Sarah Johnson', size: 8, engagement: 8.9, productivity: 94 },
    { name: 'Engineering Team', manager: 'Michael Chen', size: 12, engagement: 8.7, productivity: 92 },
    { name: 'Design Team', manager: 'Emily Davis', size: 6, engagement: 9.1, productivity: 96 },
    { name: 'Marketing Team', manager: 'David Wilson', size: 6, engagement: 8.4, productivity: 89 }
  ],
  departmentInsights: [
    { metric: 'Inter-team Collaboration', value: '87%', status: 'good', trend: '+5%' },
    { metric: 'Knowledge Sharing', value: '8.8/10', status: 'excellent', trend: '+0.4' },
    { metric: 'Resource Utilization', value: '92%', status: 'strong', trend: '+3%' }
  ]
}

// CEO data (company-wide view)
const ceoCompanyData = {
  employeeCount: 247,
  departmentCount: 8,
  locationCount: 3,
  metrics: {
    companyEngagement: { value: 8.4, unit: '/10', status: 'excellent', trend: '+0.1' },
    overallProductivity: { value: 89, unit: '%', status: 'good', trend: '+2%' },
    employeeRetention: { value: 94, unit: '%', status: 'excellent', trend: '+3%' },
    cultureHealth: { value: 8.7, unit: '/10', status: 'excellent', trend: '+0.2' }
  },
  departmentBreakdown: [
    { dept: 'Engineering', size: 78, engagement: 8.7, productivity: 92, satisfaction: 8.6 },
    { dept: 'Product', size: 32, engagement: 8.9, productivity: 94, satisfaction: 8.8 },
    { dept: 'Design', size: 24, engagement: 9.1, productivity: 96, satisfaction: 9.0 },
    { dept: 'Marketing', size: 28, engagement: 8.4, productivity: 89, satisfaction: 8.3 },
    { dept: 'Sales', size: 35, engagement: 8.6, productivity: 91, satisfaction: 8.5 },
    { dept: 'Operations', size: 22, engagement: 8.2, productivity: 87, satisfaction: 8.1 },
    { dept: 'Finance', size: 16, engagement: 8.3, productivity: 88, satisfaction: 8.2 },
    { dept: 'HR', size: 12, engagement: 8.8, productivity: 93, satisfaction: 8.7 }
  ],
  companyInsights: [
    { metric: 'Culture Alignment', value: '87%', status: 'good', trend: '+4%' },
    { metric: 'Leadership Trust', value: '8.9/10', status: 'excellent', trend: '+0.3' },
    { metric: 'Innovation Pipeline', value: '23 projects', status: 'strong', trend: '+5 projects' }
  ]
}

// HR Admin data (company culture and compliance view)
const hrAdminData = {
  totalEmployees: 247,
  activePrograms: 12,
  complianceScore: 98,
  metrics: {
    overallWellness: { value: 8.4, unit: '/10', status: 'good', trend: '+0.2' },
    diversityIndex: { value: 87, unit: '%', status: 'good', trend: '+3%' },
    inclusionScore: { value: 9.0, unit: '/10', status: 'excellent', trend: '+0.1' },
    complianceRate: { value: 98, unit: '%', status: 'excellent', trend: '+1%' }
  },
  culturePrograms: [
    { name: 'Mental Health Support', participation: 78, satisfaction: 9.1, impact: 'high' },
    { name: 'Diversity & Inclusion', participation: 92, satisfaction: 8.8, impact: 'high' },
    { name: 'Professional Development', participation: 85, satisfaction: 8.9, impact: 'high' },
    { name: 'Work-Life Balance', participation: 89, satisfaction: 9.0, impact: 'high' },
    { name: 'Career Mentorship', participation: 67, satisfaction: 8.7, impact: 'medium' }
  ],
  hrInsights: [
    { metric: 'Employee Satisfaction', value: '8.6/10', status: 'excellent', trend: '+0.2' },
    { metric: 'Training Completion', value: '94%', status: 'excellent', trend: '+2%' },
    { metric: 'Policy Compliance', value: '98%', status: 'outstanding', trend: '+1%' }
  ]
}

// Transform base data based on persona
export const getEngagementData = (persona) => {
  const dataKey = {
    [ROLES.EMPLOYEE]: 'employee',
    [ROLES.MANAGER]: 'team',
    [ROLES.MANAGER_OF_MANAGERS]: 'department',
    [ROLES.CEO]: 'company',
    [ROLES.HR_ADMIN]: 'company'
  }[persona] || 'employee'

  return baseEngagementData.map(item => ({
    day: item.day,
    value: item[dataKey]
  }))
}

export const getSurveyCompletionData = (persona) => {
  const dataKey = {
    [ROLES.EMPLOYEE]: 'employee',
    [ROLES.MANAGER]: 'team',
    [ROLES.MANAGER_OF_MANAGERS]: 'department',
    [ROLES.CEO]: 'company',
    [ROLES.HR_ADMIN]: 'hr'
  }[persona] || 'employee'

  return baseSurveyCompletionData.map(item => ({
    month: item.month,
    completed: item[dataKey],
    total: 100
  }))
}

export const getProductivityData = (persona) => {
  const dataKey = {
    [ROLES.EMPLOYEE]: 'employee',
    [ROLES.MANAGER]: 'team',
    [ROLES.MANAGER_OF_MANAGERS]: 'department',
    [ROLES.CEO]: 'company',
    [ROLES.HR_ADMIN]: 'company'
  }[persona] || 'employee'

  return baseProductivityData.map(item => ({
    day: item.day,
    hours: item[dataKey]
  }))
}

// Get persona-specific dashboard data
export const getPersonaData = (persona) => {
  const personaDataMap = {
    [ROLES.EMPLOYEE]: {
      ...employeePersonalData,
      engagementData: getEngagementData(persona),
      surveyCompletionData: getSurveyCompletionData(persona),
      productivityData: getProductivityData(persona),
      scope: 'personal'
    },
    [ROLES.MANAGER]: {
      ...managerTeamData,
      engagementData: getEngagementData(persona),
      surveyCompletionData: getSurveyCompletionData(persona),
      productivityData: getProductivityData(persona),
      scope: 'team'
    },
    [ROLES.MANAGER_OF_MANAGERS]: {
      ...managerOfManagersData,
      engagementData: getEngagementData(persona),
      surveyCompletionData: getSurveyCompletionData(persona),
      productivityData: getProductivityData(persona),
      scope: 'department'
    },
    [ROLES.CEO]: {
      ...ceoCompanyData,
      engagementData: getEngagementData(persona),
      surveyCompletionData: getSurveyCompletionData(persona),
      productivityData: getProductivityData(persona),
      scope: 'company'
    },
    [ROLES.HR_ADMIN]: {
      ...hrAdminData,
      engagementData: getEngagementData(persona),
      surveyCompletionData: getSurveyCompletionData(persona),
      productivityData: getProductivityData(persona),
      scope: 'hr'
    }
  }

  return personaDataMap[persona] || personaDataMap[ROLES.EMPLOYEE]
}

// Get actions data based on persona
export const getPersonaActions = (persona) => {
  const actionsByPersona = {
    [ROLES.EMPLOYEE]: [
      {
        id: 'personal_dev',
        title: 'Personal Development',
        icon: 'Target',
        color: 'blue',
        actions: [
          {
            id: 1,
            title: 'Complete Skills Assessment',
            description: 'Evaluate your current skills and identify growth areas',
            priority: 'high',
            estimatedTime: '30 min',
            deadline: '2024-01-15'
          },
          {
            id: 2,
            title: 'Set Q1 Learning Goals',
            description: 'Define specific learning objectives for the quarter',
            priority: 'medium',
            estimatedTime: '45 min',
            deadline: '2024-01-20'
          }
        ]
      }
    ],
    [ROLES.MANAGER]: [
      {
        id: 'team_dev',
        title: 'Team Development',
        icon: 'Users',
        color: 'green',
        actions: [
          {
            id: 3,
            title: 'Conduct Team Retrospective',
            description: 'Review team performance and identify improvement areas',
            priority: 'high',
            estimatedTime: '1 hour',
            deadline: '2024-01-12'
          },
          {
            id: 4,
            title: 'Plan Team Building Event',
            description: 'Organize activities to strengthen team bonds',
            priority: 'medium',
            estimatedTime: '2 hours',
            deadline: '2024-01-25'
          }
        ]
      }
    ],
    [ROLES.MANAGER_OF_MANAGERS]: [
      {
        id: 'dept_strategy',
        title: 'Department Strategy',
        icon: 'Building',
        color: 'yellow',
        actions: [
          {
            id: 5,
            title: 'Cross-Team Alignment Meeting',
            description: 'Align objectives across multiple teams',
            priority: 'high',
            estimatedTime: '2 hours',
            deadline: '2024-01-18'
          }
        ]
      }
    ],
    [ROLES.CEO]: [
      {
        id: 'company_strategy',
        title: 'Company Strategy',
        icon: 'Star',
        color: 'purple',
        actions: [
          {
            id: 6,
            title: 'Culture Strategy Review',
            description: 'Evaluate and refine company culture initiatives',
            priority: 'high',
            estimatedTime: '3 hours',
            deadline: '2024-01-15'
          }
        ]
      }
    ],
    [ROLES.HR_ADMIN]: [
      {
        id: 'hr_programs',
        title: 'HR Programs',
        icon: 'Shield',
        color: 'red',
        actions: [
          {
            id: 7,
            title: 'Culture Program Assessment',
            description: 'Review effectiveness of current culture programs',
            priority: 'high',
            estimatedTime: '2 hours',
            deadline: '2024-01-20'
          }
        ]
      }
    ]
  }

  return actionsByPersona[persona] || actionsByPersona[ROLES.EMPLOYEE]
}

export default {
  getPersonaData,
  getPersonaActions,
  getEngagementData,
  getSurveyCompletionData,
  getProductivityData
}
