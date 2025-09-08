// Role hierarchy and permissions system for Enculture platform
// Implements concentric circles logic where higher roles include lower role permissions

export const ROLES = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
  MANAGER_OF_MANAGERS: "Manager's Manager",
  CEO: 'CEO',
  HR_ADMIN: 'HR Admin'
}

// Define the role hierarchy with concentric circles logic
export const ROLE_HIERARCHY = {
  [ROLES.EMPLOYEE]: {
    level: 1,
    personas: [ROLES.EMPLOYEE],
    permissions: ['view_personal_dashboard', 'view_personal_insights', 'take_surveys'],
    description: 'Access to personal employee dashboard and insights'
  },
  [ROLES.MANAGER]: {
    level: 2,
    personas: [ROLES.MANAGER, ROLES.EMPLOYEE],
    permissions: [
      'view_personal_dashboard', 'view_personal_insights', 'take_surveys',
      'view_team_dashboard', 'view_team_insights', 'create_surveys', 'manage_team'
    ],
    description: 'Access to manager dashboard and personal employee dashboard'
  },
  [ROLES.MANAGER_OF_MANAGERS]: {
    level: 3,
    personas: [ROLES.MANAGER_OF_MANAGERS, ROLES.MANAGER, ROLES.EMPLOYEE],
    permissions: [
      'view_personal_dashboard', 'view_personal_insights', 'take_surveys',
      'view_team_dashboard', 'view_team_insights', 'create_surveys', 'manage_team',
      'view_department_dashboard', 'view_department_insights', 'manage_managers'
    ],
    description: 'Access to department, manager, and employee dashboards'
  },
  [ROLES.CEO]: {
    level: 4,
    personas: [ROLES.CEO, ROLES.MANAGER_OF_MANAGERS, ROLES.MANAGER, ROLES.EMPLOYEE],
    permissions: [
      'view_personal_dashboard', 'view_personal_insights', 'take_surveys',
      'view_team_dashboard', 'view_team_insights', 'create_surveys', 'manage_team',
      'view_department_dashboard', 'view_department_insights', 'manage_managers',
      'view_company_dashboard', 'view_company_insights', 'manage_company', 'view_all_data'
    ],
    description: 'Access to all dashboards: company-wide, department, manager, and employee'
  },
  [ROLES.HR_ADMIN]: {
    level: 5, // Special role with unique permissions
    personas: [ROLES.HR_ADMIN],
    permissions: [
      'view_company_dashboard', 'view_company_insights', 'view_hr_analytics',
      'manage_all_surveys', 'view_all_employee_data', 'manage_culture_programs',
      'view_compliance_data', 'generate_reports'
    ],
    description: 'Access to company-wide HR and culture insights dashboard'
  }
}

// Get available personas for a given user role
export const getAvailablePersonas = (userRole) => {
  const roleConfig = ROLE_HIERARCHY[userRole]
  if (!roleConfig) {
    console.warn(`Unknown role: ${userRole}`)
    return [ROLES.EMPLOYEE] // Default fallback
  }
  return roleConfig.personas
}

// Check if a user has permission for a specific action
export const hasPermission = (userRole, permission) => {
  const roleConfig = ROLE_HIERARCHY[userRole]
  return roleConfig ? roleConfig.permissions.includes(permission) : false
}

// Get the default persona for a user role (usually their highest level)
export const getDefaultPersona = (userRole) => {
  const personas = getAvailablePersonas(userRole)
  return personas[0] // First persona is the user's primary role
}

// Get role-specific dashboard configuration
export const getDashboardConfig = (persona) => {
  const configs = {
    [ROLES.EMPLOYEE]: {
      title: 'My Dashboard',
      subtitle: 'Your personal culture insights and development journey',
      showPersonalMetrics: true,
      showTeamMetrics: false,
      showDepartmentMetrics: false,
      showCompanyMetrics: false,
      scope: 'personal'
    },
    [ROLES.MANAGER]: {
      title: 'Team Dashboard',
      subtitle: 'Your team\'s culture insights, engagement, and performance metrics',
      showPersonalMetrics: false,
      showTeamMetrics: true,
      showDepartmentMetrics: false,
      showCompanyMetrics: false,
      scope: 'team'
    },
    [ROLES.MANAGER_OF_MANAGERS]: {
      title: 'Department Dashboard',
      subtitle: 'Department-wide culture insights and cross-team analytics',
      showPersonalMetrics: false,
      showTeamMetrics: false,
      showDepartmentMetrics: true,
      showCompanyMetrics: false,
      scope: 'department'
    },
    [ROLES.CEO]: {
      title: 'Company Dashboard',
      subtitle: 'Organization-wide culture intelligence and strategic insights',
      showPersonalMetrics: false,
      showTeamMetrics: false,
      showDepartmentMetrics: false,
      showCompanyMetrics: true,
      scope: 'company'
    },
    [ROLES.HR_ADMIN]: {
      title: 'HR Culture Dashboard',
      subtitle: 'Comprehensive culture analytics and employee wellness insights',
      showPersonalMetrics: false,
      showTeamMetrics: false,
      showDepartmentMetrics: false,
      showCompanyMetrics: true,
      showHRMetrics: true,
      scope: 'hr'
    }
  }
  
  return configs[persona] || configs[ROLES.EMPLOYEE]
}

// Get persona display information
export const getPersonaDisplayInfo = (persona) => {
  const displayInfo = {
    [ROLES.EMPLOYEE]: {
      label: 'Personal View',
      icon: '👤',
      color: '#3b82f6', // blue
      description: 'Your personal insights'
    },
    [ROLES.MANAGER]: {
      label: 'Team View',
      icon: '👥',
      color: '#10b981', // green
      description: 'Your team\'s insights'
    },
    [ROLES.MANAGER_OF_MANAGERS]: {
      label: 'Department View',
      icon: '🏢',
      color: '#f59e0b', // yellow
      description: 'Department insights'
    },
    [ROLES.CEO]: {
      label: 'Company View',
      icon: '🌟',
      color: '#8b5cf6', // purple
      description: 'Organization-wide insights'
    },
    [ROLES.HR_ADMIN]: {
      label: 'HR Culture View',
      icon: '🏛️',
      color: '#ef4444', // red
      description: 'HR and culture analytics'
    }
  }
  
  return displayInfo[persona] || displayInfo[ROLES.EMPLOYEE]
}

// Validate role transition (for debugging)
export const canSwitchToPersona = (userRole, targetPersona) => {
  const availablePersonas = getAvailablePersonas(userRole)
  return availablePersonas.includes(targetPersona)
}

export default {
  ROLES,
  ROLE_HIERARCHY,
  getAvailablePersonas,
  hasPermission,
  getDefaultPersona,
  getDashboardConfig,
  getPersonaDisplayInfo,
  canSwitchToPersona
}
