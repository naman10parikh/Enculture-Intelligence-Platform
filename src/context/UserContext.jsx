import React, { createContext, useContext, useState } from 'react'

// Demo users for role switching - exactly as requested
const demoUsers = [
  {
    id: 'sarah_johnson',
    name: 'Sarah Johnson', 
    role: 'CEO',
    avatar: '👩‍💼',
    department: 'Executive',
    canCreateSurveys: true
  },
  {
    id: 'michael_chen',
    name: 'Michael Chen',
    role: 'Manager',
    avatar: '👨‍💼',
    department: 'Product',
    canCreateSurveys: true
  },
  {
    id: 'david_williams',
    name: 'David Williams',
    role: "Manager's Manager",
    avatar: '👨‍💻',
    department: 'Operations',
    canCreateSurveys: true
  },
  {
    id: 'emily_rodriguez',
    name: 'Emily Rodriguez',
    role: 'Employee',
    avatar: '👩‍🎨',
    department: 'Design',
    canCreateSurveys: false
  },
  {
    id: 'gayathri_sriram',
    name: 'Gayathri Sriram',
    role: 'HR Admin',
    avatar: '👩‍🔧',
    department: 'Human Resources',
    canCreateSurveys: true
  }
]

const UserContext = createContext()

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export const UserProvider = ({ children }) => {
  // Default to Manager who creates surveys
  const [currentUser, setCurrentUser] = useState(demoUsers.find(u => u.id === 'michael_chen'))
  const [currentUserId, setCurrentUserId] = useState('michael_chen')

  const switchUser = (userId) => {
    const user = demoUsers.find(u => u.id === userId)
    if (user) {
      setCurrentUser(user)
      setCurrentUserId(userId)
      return user
    }
    return null
  }

  const value = {
    currentUser,
    currentUserId,
    demoUsers,
    switchUser
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}

export default UserContext
