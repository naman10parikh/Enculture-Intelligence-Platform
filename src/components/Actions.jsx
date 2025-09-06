import React, { useState } from 'react'
import { CheckSquare, Target, Users, Calendar, BookOpen, Star, ChevronRight, Plus } from 'lucide-react'

const actionCategories = [
  {
    id: 'development',
    title: 'Personal Development',
    icon: Target,
    color: 'blue',
    actions: [
      {
        id: 1,
        title: 'Complete Leadership Assessment',
        description: 'Take the 360-degree leadership assessment to identify growth areas',
        priority: 'high',
        estimatedTime: '45 min',
        deadline: '2024-01-15',
        status: 'pending'
      },
      {
        id: 2,
        title: 'Enroll in Communication Workshop',
        description: 'Join the next cohort of effective communication training',
        priority: 'medium',
        estimatedTime: '2 hours',
        deadline: '2024-01-20',
        status: 'pending'
      }
    ]
  },
  {
    id: 'team',
    title: 'Team Building',
    icon: Users,
    color: 'green',
    actions: [
      {
        id: 3,
        title: 'Schedule Team Retrospective',
        description: 'Organize monthly team retrospective based on collaboration metrics',
        priority: 'high',
        estimatedTime: '1 hour',
        deadline: '2024-01-12',
        status: 'pending'
      },
      {
        id: 4,
        title: 'Plan Cross-team Social Event',
        description: 'Coordinate informal gathering to strengthen inter-team relationships',
        priority: 'low',
        estimatedTime: '30 min',
        deadline: '2024-01-25',
        status: 'pending'
      }
    ]
  },
  {
    id: 'goals',
    title: 'Goal Alignment',
    icon: Star,
    color: 'purple',
    actions: [
      {
        id: 5,
        title: 'Review Quarterly OKRs',
        description: 'Align personal objectives with team and company goals',
        priority: 'high',
        estimatedTime: '1.5 hours',
        deadline: '2024-01-18',
        status: 'in-progress'
      }
    ]
  }
]

const developmentTracks = [
  {
    id: 1,
    title: 'Leadership Excellence',
    description: 'Develop executive leadership skills and strategic thinking',
    progress: 65,
    goals: [
      { title: 'Complete 360 Assessment', completed: true },
      { title: 'Attend Leadership Bootcamp', completed: true },
      { title: 'Lead Cross-functional Project', completed: false },
      { title: 'Mentor Junior Team Member', completed: false }
    ]
  },
  {
    id: 2,
    title: 'Culture Champion',
    description: 'Drive positive culture change and employee engagement',
    progress: 40,
    goals: [
      { title: 'Culture Survey Analysis', completed: true },
      { title: 'Implement Team Rituals', completed: false },
      { title: 'Organize Culture Events', completed: false },
      { title: 'Measure Impact', completed: false }
    ]
  }
]

function Actions() {
  const [view, setView] = useState('actions') // 'actions' or 'playbook'
  const [selectedCategory, setSelectedCategory] = useState(null)

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'var(--red-soft)',
      medium: 'var(--yellow-soft)',
      low: 'var(--green-soft)'
    }
    return colors[priority] || colors.medium
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'var(--text-tertiary)',
      'in-progress': 'var(--blue-soft)',
      completed: 'var(--green-soft)'
    }
    return colors[status] || colors.pending
  }

  const handleActionComplete = (actionId) => {
    // Handle action completion logic
    console.log('Action completed:', actionId)
  }

  return (
    <div className="actions-container">
      <div className="actions-content">
        <div className="page-header">
          <div className="header-content">
          <div>
            <h1 className="page-title">Actions & Development</h1>
            <p className="page-subtitle">Your personalized growth journey and action items</p>
          </div>
          <div className="header-controls">
            <button 
              className={`view-toggle ${view === 'actions' ? 'active' : ''}`}
              onClick={() => setView('actions')}
            >
              <CheckSquare size={18} />
              Action Items
            </button>
            <button 
              className={`view-toggle ${view === 'playbook' ? 'active' : ''}`}
              onClick={() => setView('playbook')}
            >
              <BookOpen size={18} />
              Development Playbook
            </button>
          </div>
        </div>
      </div>

      {view === 'actions' ? (
        <div className="actions-view">
          <div className="actions-grid">
            {actionCategories.map((category) => {
              const Icon = category.icon
              
              return (
                <div key={category.id} className="category-card glass-card">
                  <div className="category-header">
                    <div className="category-icon" style={{ '--icon-color': `var(--${category.color}-soft)` }}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="category-title">{category.title}</h3>
                      <span className="action-count">{category.actions.length} actions</span>
                    </div>
                  </div>

                  <div className="actions-list">
                    {category.actions.map((action, index) => (
                      <div 
                        key={action.id} 
                        className="action-item"
                        style={{ '--delay': `${index * 0.1}s` }}
                      >
                        <div className="action-content">
                          <div className="action-header">
                            <h4 className="action-title">{action.title}</h4>
                            <div className="action-meta">
                              <span 
                                className="priority-badge"
                                style={{ '--priority-color': getPriorityColor(action.priority) }}
                              >
                                {action.priority}
                              </span>
                              <span className="time-estimate">{action.estimatedTime}</span>
                            </div>
                          </div>
                          <p className="action-description">{action.description}</p>
                          <div className="action-footer">
                            <span className="deadline">Due: {new Date(action.deadline).toLocaleDateString()}</span>
                            <button 
                              className="action-btn gradient-btn"
                              onClick={() => handleActionComplete(action.id)}
                            >
                              <ChevronRight size={16} />
                              Start
                            </button>
                          </div>
                        </div>
                        <div 
                          className="status-indicator"
                          style={{ '--status-color': getStatusColor(action.status) }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="category-footer">
                    <button className="add-action-btn">
                      <Plus size={16} />
                      Add Action
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="playbook-view">
          <div className="playbook-grid">
            {developmentTracks.map((track) => (
              <div key={track.id} className="development-track glass-card">
                <div className="track-header">
                  <div className="track-info">
                    <h3 className="track-title">{track.title}</h3>
                    <p className="track-description">{track.description}</p>
                  </div>
                  <div className="progress-circle">
                    <svg width="60" height="60" viewBox="0 0 60 60">
                      <circle
                        cx="30"
                        cy="30"
                        r="25"
                        fill="none"
                        stroke="var(--surface-secondary)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="30"
                        cy="30"
                        r="25"
                        fill="none"
                        stroke="var(--blue-soft)"
                        strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 25}`}
                        strokeDashoffset={`${2 * Math.PI * 25 * (1 - track.progress / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 30 30)"
                      />
                      <text x="30" y="35" textAnchor="middle" className="progress-text">
                        {track.progress}%
                      </text>
                    </svg>
                  </div>
                </div>

                <div className="goals-list">
                  {track.goals.map((goal, index) => (
                    <div key={index} className={`goal-item ${goal.completed ? 'completed' : ''}`}>
                      <div className="goal-checkbox">
                        {goal.completed ? <CheckSquare size={16} /> : <div className="checkbox-empty" />}
                      </div>
                      <span className="goal-title">{goal.title}</span>
                    </div>
                  ))}
                </div>

                <div className="track-actions">
                  <button className="btn-primary">Continue Track</button>
                  <button className="btn-ghost">View Details</button>
                </div>
              </div>
            ))}

            <div className="new-track-card glass-card">
              <div className="new-track-content">
                <div className="new-track-icon">
                  <Plus size={32} />
                </div>
                <h3>Start New Development Track</h3>
                <p>Explore new growth opportunities tailored to your role and career goals</p>
                <button className="btn-primary">Browse Tracks</button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      <style jsx>{`
        .actions-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f3eeff 0%, #f5f1ff 20%, #f7f4ff 40%, #f9f7ff 60%, #fcfbff 80%, #ffffff 100%);
          margin: calc(-1 * var(--space-6));
          padding: var(--space-6);
        }
        
        .actions-content {
          max-width: 1400px;
          margin: 0 auto;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: var(--space-4);
        }

        .header-controls {
          display: flex;
          gap: var(--space-2);
          background: var(--surface-elevated);
          padding: var(--space-1);
          border-radius: var(--radius-lg);
          border: var(--border-soft);
        }

        .view-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border: none;
          background: transparent;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .view-toggle:hover {
          color: var(--text-primary);
          background: var(--surface-primary);
        }

        .view-toggle.active {
          background: var(--blue-soft);
          color: white;
        }

        .actions-grid,
        .playbook-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: var(--space-6);
          margin-top: var(--space-8);
        }

        .category-card,
        .development-track {
          padding: var(--space-6);
          transition: all var(--transition-base);
        }

        .category-card:hover,
        .development-track:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-elevated);
        }

        .category-header {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .category-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: rgba(59, 130, 246, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--icon-color);
        }

        .category-title {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .action-count {
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }

        .actions-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .action-item {
          background: var(--surface-secondary);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          border-left: 4px solid var(--status-color);
          transition: all var(--transition-base);
          animation: cascadeIn 0.4s ease-out forwards;
          animation-delay: var(--delay);
          position: relative;
        }

        .action-item:hover {
          transform: translateX(4px);
          box-shadow: var(--shadow-soft);
        }

        .action-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-2);
        }

        .action-title {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .action-meta {
          display: flex;
          gap: var(--space-2);
          align-items: center;
        }

        .priority-badge {
          font-size: var(--text-xs);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          background: var(--priority-color);
          color: white;
          font-weight: 500;
          text-transform: uppercase;
        }

        .time-estimate {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
        }

        .action-description {
          color: var(--text-secondary);
          margin: 0 0 var(--space-3) 0;
          line-height: 1.5;
        }

        .action-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .deadline {
          font-size: var(--text-sm);
          color: var(--text-tertiary);
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          padding: var(--space-2) var(--space-3);
          font-size: var(--text-sm);
        }

        .category-footer {
          display: flex;
          justify-content: center;
        }

        .add-action-btn {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border: 2px dashed var(--border-soft);
          background: transparent;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-base);
          width: 100%;
          justify-content: center;
        }

        .add-action-btn:hover {
          border-color: var(--blue-soft);
          color: var(--blue-soft);
          background: rgba(59, 130, 246, 0.05);
        }

        /* Development Track Styles */
        .track-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-6);
        }

        .track-title {
          font-size: var(--text-xl);
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 var(--space-2) 0;
        }

        .track-description {
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
        }

        .progress-circle {
          flex-shrink: 0;
        }

        .progress-text {
          font-size: 12px;
          font-weight: 600;
          fill: var(--text-primary);
        }

        .goals-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          margin-bottom: var(--space-6);
        }

        .goal-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--surface-secondary);
          border-radius: var(--radius-md);
          transition: all var(--transition-base);
        }

        .goal-item.completed {
          background: rgba(16, 185, 129, 0.1);
        }

        .goal-item.completed .goal-title {
          text-decoration: line-through;
          color: var(--text-tertiary);
        }

        .goal-checkbox {
          color: var(--green-soft);
        }

        .checkbox-empty {
          width: 16px;
          height: 16px;
          border: 2px solid var(--text-tertiary);
          border-radius: 3px;
        }

        .goal-title {
          flex: 1;
          color: var(--text-primary);
          font-weight: 500;
        }

        .track-actions {
          display: flex;
          gap: var(--space-3);
        }

        .track-actions button {
          flex: 1;
        }

        .new-track-card {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          border: 2px dashed var(--border-soft);
          background: transparent;
        }

        .new-track-content {
          text-align: center;
          max-width: 280px;
        }

        .new-track-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--blue-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--blue-soft);
          margin: 0 auto var(--space-4);
        }

        .new-track-content h3 {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 var(--space-3) 0;
        }

        .new-track-content p {
          color: var(--text-secondary);
          margin: 0 0 var(--space-6) 0;
          line-height: 1.5;
        }

        @media (max-width: 768px) {
          .actions-grid,
          .playbook-grid {
            grid-template-columns: 1fr;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
          }

          .header-controls {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  )
}

export default Actions
