import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageCircle, BarChart3, CheckSquare, Palette, ChevronDown, ChevronUp } from 'lucide-react'
import { useUser } from '../context/UserContext'

const navigationItems = [
  {
    id: 'chat',
    label: 'AI Chat',
    icon: MessageCircle,
    path: '/chat',
    description: 'Culture Intelligence Assistant'
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: BarChart3,
    path: '/insights',
    description: 'Culture Analytics Dashboard'
  },
  {
    id: 'actions',
    label: 'Actions',
    icon: CheckSquare,
    path: '/actions',
    description: 'Development & Growth Plans'
  },
  {
    id: 'safespace',
    label: 'Safe Space',
    icon: Palette,
    path: '/safespace',
    description: 'Creative Thinking Canvas'
  }
]

function Sidebar({ activeSection, setActiveSection }) {
  const location = useLocation()
  const { currentUser, demoUsers, switchUser } = useUser()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-dropdown')) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [dropdownOpen])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <img 
            src="/EncultureLogo.png" 
            alt="Enculture" 
            className="logo-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="logo-fallback" style={{display: 'none'}}>
            <span className="logo-text">enculture</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || 
                          (location.pathname === '/' && item.path === '/chat')
          
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <div className="nav-item-icon">
                <Icon size={20} />
              </div>
              <div className="nav-item-content">
                <span className="nav-item-label">{item.label}</span>
                <span className="nav-item-description">{item.description}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className={`user-profile glass-card ${dropdownOpen ? 'dropdown-open' : ''}`}>
          <div className="user-avatar">
            <span>{currentUser?.avatar || '👤'}</span>
          </div>
          <div className="user-info">
            <div className={`user-dropdown ${dropdownOpen ? 'open' : ''}`}>
              <button 
                className="user-dropdown-trigger"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="user-dropdown-content">
                  <span className="user-dropdown-name">{currentUser?.name}</span>
                  <span className="user-dropdown-role">{currentUser?.role}</span>
                </div>
                {dropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {dropdownOpen && (
                <div className="user-dropdown-menu">
                  {demoUsers?.map(user => (
                    <div 
                      key={user.id} 
                      className={`user-dropdown-item ${user.id === currentUser?.id ? 'active' : ''}`}
                      onClick={() => {
                        switchUser(user.id)
                        setDropdownOpen(false)
                      }}
                    >
                      <div className="user-card">
                        <div className="user-card-avatar">{user.avatar}</div>
                        <div className="user-card-info">
                          <div className="user-card-name">{user.name}</div>
                          <div className="user-card-role">{user.role}</div>
                          <div className="user-card-department">{user.department}</div>
                        </div>
                        {user.id === currentUser?.id && (
                          <div className="current-user-indicator">✓</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          width: 280px;
          height: 100vh;
          background: var(--gradient-glass);
          border-right: var(--border-glass);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          padding: var(--space-6);
          z-index: 100;
        }

        .sidebar-header {
          margin-bottom: var(--space-8);
        }

        .logo {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-4);
        }

        .logo-image {
          height: 120px;
          width: auto;
          max-width: 100%;
          object-fit: contain;
        }

        .logo-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 80px;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 700;
          color: #392A48; /* dark purple */
          text-transform: lowercase;
          letter-spacing: -0.5px;
        }

        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-4);
          border-radius: var(--radius-lg);
          text-decoration: none;
          color: var(--text-secondary);
          transition: all var(--transition-base);
          position: relative;
          overflow: hidden;
        }

        .nav-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #f3eeff 0%, #ede7fa 100%); /* light lavender */
          opacity: 0;
          transition: opacity var(--transition-base);
          border-radius: var(--radius-lg);
        }

        .nav-item:hover::before,
        .nav-item.active::before {
          opacity: 0.1;
        }

        .nav-item:hover {
          color: var(--text-primary);
          transform: translateX(4px);
        }

        .nav-item.active {
          color: #392A48; /* dark purple */
          background: rgba(177, 156, 217, 0.18); /* soft lavender tint */
        }

        .nav-item-icon {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .nav-item-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
        }

        .nav-item-label {
          font-weight: 500;
          font-size: var(--text-base);
          margin-bottom: 2px;
        }

        .nav-item-description {
          font-size: var(--text-xs);
          opacity: 0.8;
        }

        .sidebar-footer {
          margin-top: var(--space-6);
        }

        .user-profile {
          padding: var(--space-4);
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d9c9ff 0%, #b19cd9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: var(--text-lg);
          color: #301934;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .user-dropdown {
          position: relative;
          width: 100%;
        }

        .user-profile {
          position: relative;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .user-profile.dropdown-open {
          border-radius: 12px;
        }

        .user-dropdown-trigger {
          background: transparent;
          border: none;
          font-weight: 500;
          font-size: var(--text-sm);
          color: var(--text-primary);
          cursor: pointer;
          padding: 4px 0;
          outline: none;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.2s ease;
        }

        /* No hover effects - keep it simple */

        .user-dropdown-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .user-dropdown-name {
          font-weight: 500;
          font-size: var(--text-sm);
        }

        .user-dropdown-role {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          margin-top: 1px;
        }

        .user-dropdown-menu {
          position: absolute;
          bottom: calc(100% + 18px);
          left: calc(-1 * var(--space-4) - var(--space-3) - 40px);
          right: calc(-1 * var(--space-4));
          background: var(--gradient-glass);
          border: var(--border-glass);
          border-radius: 12px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1001;
          padding: var(--space-4);
          max-height: 300px;
          overflow-y: auto;
        }

        .user-dropdown-item {
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 8px;
          margin-bottom: 2px;
        }

        .user-dropdown-item.active {
          background: rgba(177, 156, 217, 0.06);
        }

        .user-dropdown-item:last-child {
          margin-bottom: 0;
        }

        .user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0;
          position: relative;
        }

        .user-card-avatar {
          font-size: 16px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .user-card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .user-card-name {
          font-weight: 500;
          font-size: 13px;
          color: #1f2937;
          line-height: 1.2;
        }

        .user-card-role {
          font-size: 12px;
          color: #6b7280;
          font-weight: 400;
        }

        .user-card-department {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 400;
        }

        .current-user-indicator {
          color: #10b981;
          font-weight: 600;
          font-size: 14px;
          flex-shrink: 0;
        }

        /* Clean and simple dropdown */

        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform var(--transition-base);
          }

          .sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </aside>
  )
}

export default Sidebar
