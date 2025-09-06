import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Calendar, Bell, User, Settings, MoreVertical, ChevronDown, ArrowRight, Star, FileText, Heart, Activity, Thermometer, Target, CheckCircle, Clock, ChevronRight, ChevronLeft } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

// Employee engagement score data for the past 7 days
const engagementData = [
  { day: 'Mon', value: 8.2 },
  { day: 'Tue', value: 8.5 },
  { day: 'Wed', value: 8.7 },
  { day: 'Thu', value: 8.4 },
  { day: 'Fri', value: 8.9 },
  { day: 'Sat', value: 8.6 },
  { day: 'Sun', value: 9.1 }
]

// Survey completion rates
const surveyCompletionData = [
  { month: 'Jan', completed: 85, total: 100 },
  { month: 'Feb', completed: 92, total: 100 },
  { month: 'Mar', completed: 78, total: 100 },
  { month: 'Apr', completed: 94, total: 100 },
  { month: 'May', completed: 88, total: 100 },
  { month: 'Jun', completed: 96, total: 100 }
]

// Team productivity data
const productivityData = [
  { day: 'M', hours: 7.2 },
  { day: 'T', hours: 8.1 },
  { day: 'W', hours: 7.8 },
  { day: 'T', hours: 8.4 },
  { day: 'F', hours: 7.6 },
  { day: 'S', hours: 6.2 },
  { day: 'S', hours: 5.8 }
]

// Team members data
const teamMembers = [
  { name: 'Sarah Chen', role: 'Culture Lead', avatar: '👩‍💼', tasks: 12, hours: '40h', status: 'active' },
  { name: 'Mike Johnson', role: 'HR Partner', avatar: '👨‍💼', tasks: 8, hours: '35h', status: 'active' },
  { name: 'Lisa Wong', role: 'Team Coach', avatar: '👩‍🏫', tasks: 15, hours: '42h', status: 'busy' },
  { name: 'David Kim', role: 'Data Analyst', avatar: '👨‍💻', tasks: 6, hours: '38h', status: 'active' }
]

// Department metrics
const departmentMetrics = [
  { dept: 'Engineering', satisfaction: 8.7, participation: 94, color: '#64748b' },
  { dept: 'Design', satisfaction: 9.1, participation: 98, color: '#475569' },
  { dept: 'Marketing', satisfaction: 8.3, participation: 87, color: '#6b7280' },
  { dept: 'Sales', satisfaction: 8.9, participation: 91, color: '#52525b' }
]

// Recent surveys and sessions history
const surveyHistory = [
  {
    id: 1,
    facilitator: 'Sarah Johnson',
    specialty: 'Culture Coach',
    sessionType: 'Culture Assessment',
    date: 'Dec 19th, 2024',
    time: '02:00 - 03:00 pm',
    status: 'Completed',
    rating: 4.9,
    report: 'Culture Report.pdf',
    avatar: '👩‍💼'
  },
  {
    id: 2,
    facilitator: 'Marcus Chen',
    specialty: 'Career Development',
    sessionType: 'Growth Planning',
    date: 'Dec 15th, 2024',
    time: '10:00 - 11:00 am',
    status: 'Scheduled',
    rating: 4.8,
    report: 'Growth Plan.pdf',
    avatar: '👨‍💼'
  },
  {
    id: 3,
    facilitator: 'Emma Rodriguez',
    specialty: 'Team Dynamics',
    sessionType: 'Team Survey',
    date: 'Dec 12th, 2024',
    time: '11:00 - 12:00 pm',
    status: 'Completed',
    rating: 4.7,
    report: 'Team Assessment.pdf',
    avatar: '👩‍💼'
  }
]

// Employee profile data
const employeeProfiles = [
  {
    id: 1,
    name: 'Alex Thompson',
    role: 'Senior Developer',
    department: 'Engineering',
    avatar: '👨‍💻',
    metrics: {
      satisfaction: { value: 8.5, unit: '/10', status: 'excellent' },
      growthScore: { value: 92, unit: '%', status: 'strong' }
    }
  },
  {
    id: 2,
    name: 'Sarah Chen',
    role: 'Product Manager',
    department: 'Product',
    avatar: '👩‍💼',
    metrics: {
      satisfaction: { value: 9.2, unit: '/10', status: 'excellent' },
      growthScore: { value: 88, unit: '%', status: 'strong' }
    }
  },
  {
    id: 3,
    name: 'Marcus Johnson',
    role: 'UX Designer',
    department: 'Design',
    avatar: '👨‍🎨',
    metrics: {
      satisfaction: { value: 7.8, unit: '/10', status: 'good' },
      growthScore: { value: 85, unit: '%', status: 'good' }
    }
  },
  {
    id: 4,
    name: 'Emily Rodriguez',
    role: 'Data Scientist',
    department: 'Analytics',
    avatar: '👩‍🔬',
    metrics: {
      satisfaction: { value: 8.9, unit: '/10', status: 'excellent' },
      growthScore: { value: 94, unit: '%', status: 'strong' }
    }
  }
]

function Insights() {
  const [selectedPeriod, setSelectedPeriod] = useState('Past 7 days')
  const [currentEmployeeIndex, setCurrentEmployeeIndex] = useState(0)
  const navigate = useNavigate()

  const nextEmployee = () => {
    setCurrentEmployeeIndex((prev) => (prev + 1) % employeeProfiles.length)
  }

  const prevEmployee = () => {
    setCurrentEmployeeIndex((prev) => (prev - 1 + employeeProfiles.length) % employeeProfiles.length)
  }

  const currentEmployee = employeeProfiles[currentEmployeeIndex]
  
  // Circular progress data for career development progress
  const careerProgressData = [
    { name: 'Completed', value: 7, color: '#301934' },
    { name: 'Remaining', value: 3, color: '#f1f5f9' }
  ]

        return (
    <div className="dashboard-container">
      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        {/* Title Section */}
        <div className="dashboard-title-section">
          <div className="title-left">
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">An overview of team culture insights: engagement scores, growth trends, and survey analytics.</p>
          </div>
          <div className="title-right">
            <button className="customize-btn">
              <Settings size={16} />
              Customize dashboard
            </button>
            <button className="appointment-btn">
              Schedule survey
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Engagement Score Chart */}
          <div className="dashboard-card engagement-chart-card">
            <div className="card-header">
              <div className="card-title-section">
                <h3 className="card-title">Engagement score</h3>
                <div className="card-controls">
                  <select className="period-select">
                    <option>Scale /10</option>
                  </select>
                  <select className="period-select">
                    <option>{selectedPeriod}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="chart-container">
              <div className="chart-info">
                <div className="current-reading">
                  <span className="reading-date">18 Dec, 2024 ↗</span>
                  <span className="reading-value">8.7 /10</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={engagementData}>
                  <defs>
                    <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(177, 156, 217, 0.3)" />
                      <stop offset="100%" stopColor="rgba(177, 156, 217, 0.05)" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis domain={[7, 10]} hide />
              <Line 
                type="monotone" 
                dataKey="value" 
                    stroke="#b19cd9" 
                strokeWidth={3}
                    fill="url(#engagementGradient)"
                    dot={{ 
                      fill: '#b19cd9', 
                      strokeWidth: 2, 
                      r: 4,
                      stroke: '#ffffff'
                    }}
                    activeDot={{ 
                      r: 6, 
                      stroke: '#b19cd9', 
                      strokeWidth: 2,
                      fill: '#ffffff'
                    }}
              />
            </LineChart>
          </ResponsiveContainer>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-text">7 Day Average</span>
                  <span className="legend-value">8.6 /10</span>
                </div>
                <div className="legend-item">
                  <div className="legend-indicator actual"></div>
                  <span className="legend-text">Actual engagement score</span>
                </div>
                <div className="legend-item">
                  <div className="legend-indicator range"></div>
                  <span className="legend-text">Target range</span>
                </div>
              </div>
              
              <div className="card-cta">
                <button 
                  className="cta-btn"
                  onClick={() => navigate('/actions')}
                >
                  <ChevronRight size={16} />
                  Boost Engagement
                </button>
              </div>
            </div>
          </div>

          {/* Career Development Widget */}
          <div className="dashboard-card career-progress-card enhanced-career-card">
            <div className="career-card-header">
              <div className="career-header-content">
                <div className="career-icon">
                  <Target size={20} />
                </div>
                <div className="career-header-text">
                  <h3 className="career-title">Career Goals</h3>
                  <span className="career-subtitle">Q4 2024 Progress</span>
                </div>
              </div>
              <button className="more-btn">
                <MoreVertical size={16} />
              </button>
            </div>
            
            <div className="career-progress-visual">
              <div className="circular-progress-container">
                <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                      data={careerProgressData}
                cx="50%"
                cy="50%"
                      innerRadius={45}
                      outerRadius={60}
                      startAngle={90}
                      endAngle={450}
                dataKey="value"
              >
                      {careerProgressData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
                <div className="progress-center-enhanced">
                  <span className="progress-number-large">7</span>
                  <span className="progress-total">/ 10</span>
                </div>
              </div>
              
              <div className="career-stats">
                <div className="stat-box">
                  <div className="stat-icon">
                    <CheckCircle size={16} />
          </div>
                  <div className="stat-content">
                    <span className="stat-number">70%</span>
                    <span className="stat-label">Completed</span>
                  </div>
                </div>
                <div className="stat-box">
                  <div className="stat-icon">
                    <Clock size={16} />
                  </div>
                  <div className="stat-content">
                    <span className="stat-number">23</span>
                    <span className="stat-label">Days left</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="career-goals-list">
              <div className="goal-item completed">
                <div className="goal-dot"></div>
                <span className="goal-text">Complete leadership workshop</span>
                <CheckCircle size={14} className="goal-check" />
              </div>
              <div className="goal-item completed">
                <div className="goal-dot"></div>
                <span className="goal-text">Obtain industry certification</span>
                <CheckCircle size={14} className="goal-check" />
              </div>
              <div className="goal-item in-progress">
                <div className="goal-dot"></div>
                <span className="goal-text">Mentor junior colleague</span>
                <div className="goal-progress">60%</div>
              </div>
            </div>
            
            <div className="card-cta">
              <button
                className="cta-btn"
                onClick={() => navigate('/actions')}
              >
                <ChevronRight size={16} />
                View Career Actions
              </button>
            </div>
          </div>

          {/* Employee Profiles Carousel */}
          <div className="dashboard-card employee-profiles-card">
            <div className="card-header">
              <h3 className="card-title">Employee profiles</h3>
              <div className="carousel-controls">
                <button className="carousel-btn" onClick={prevEmployee}>
                  <ChevronLeft size={16} />
                </button>
                <span className="carousel-indicator">
                  {currentEmployeeIndex + 1} / {employeeProfiles.length}
                </span>
                <button className="carousel-btn" onClick={nextEmployee}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="employee-info">
              <div className="employee-basic">
                <div className="employee-avatar">{currentEmployee.avatar}</div>
                <div className="employee-details">
                  <h4 className="employee-name">{currentEmployee.name}</h4>
                  <p className="employee-role">{currentEmployee.role}</p>
                  <p className="employee-department">
                    <span>Department</span>
                    <span className="department">{currentEmployee.department}</span>
                  </p>
                </div>
              </div>
              <div className="employee-metrics">
                <div className="metric-item">
                  <div className="metric-icon">
                    <Heart size={16} className="satisfaction-icon" />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Satisfaction</span>
                    <span className="metric-value">{currentEmployee.metrics.satisfaction.value} {currentEmployee.metrics.satisfaction.unit}</span>
                  </div>
                  <button className="metric-btn">
                    <ArrowRight size={14} />
                  </button>
                </div>
                <div className="metric-item">
                  <div className="metric-icon">
                    <Activity size={16} className="growth-icon" />
                  </div>
                  <div className="metric-info">
                    <span className="metric-label">Growth Score</span>
                    <span className="metric-value">{currentEmployee.metrics.growthScore.value}{currentEmployee.metrics.growthScore.unit}</span>
                  </div>
                  <button className="metric-btn">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Survey History */}
          <div className="dashboard-card survey-history-card">
            <div className="card-header">
              <div className="card-title-section">
                <h3 className="card-title">Survey history</h3>
                <div className="sort-controls">
                  <button className="sort-btn">
                    Sort <ChevronDown size={14} />
                  </button>
                  <button className="filter-btn">
                    Month <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="survey-table">
              <div className="table-header">
                <span>Facilitator</span>
                <span>Session type</span>
                <span>Last session</span>
                <span>Status</span>
                <span>Rating</span>
                <span>Report</span>
                <span></span>
              </div>
              {surveyHistory.map((session) => (
                <div key={session.id} className="table-row">
                  <div className="facilitator-cell">
                    <div className="facilitator-info">
                      <span className="facilitator-name">{session.facilitator}</span>
                      <span className="facilitator-specialty">{session.specialty}</span>
                    </div>
                  </div>
                  <div className="session-type-cell">
                    <span>{session.sessionType}</span>
                  </div>
                  <div className="date-cell">
                    <span className="session-date">{session.date}</span>
                    <span className="session-time">{session.time}</span>
                  </div>
                  <div className="status-cell">
                    <span className={`status-badge ${session.status.toLowerCase()}`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="rating-cell">
                    <Star size={14} className="star-icon" />
                    <span>({session.rating}/5)</span>
                  </div>
                  <div className="report-cell">
                    <FileText size={14} className="report-icon" />
                    <span>{session.report}</span>
                  </div>
                  <div className="actions-cell">
                    <button className="more-btn">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
            ))}
          </div>
        </div>

          {/* Culture Development Promo Card */}
          <div className="dashboard-card promo-card">
            <div className="promo-content">
              <div className="promo-badge">
                <span>Growth Tracking</span>
                <span className="badge-number">15</span>
              </div>
              <h3 className="promo-title">Accelerate your career growth!</h3>
              <p className="promo-description">
                Get personalized insights and development recommendations!
              </p>
              <div className="promo-visual">
                <div className="growth-icon"></div>
              </div>
            </div>
            <button className="promo-action">
              <ArrowRight size={16} />
            </button>
      </div>

          {/* Survey Completion Card */}
          <div className="dashboard-card dark-card">
            <div className="card-header">
              <h3 className="card-title light-text">Survey completion</h3>
              <div className="completion-badge">
                <span className="badge-text">Best month</span>
            </div>
          </div>
            <div className="chart-container">
              <div className="current-metric">
                <span className="metric-large light-text">94%</span>
                <span className="metric-trend positive">↗ +8%</span>
            </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={surveyCompletionData}>
                  <defs>
                    <linearGradient id="completionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(57, 42, 72, 0.4)" />
                      <stop offset="100%" stopColor="rgba(57, 42, 72, 0.1)" />
                    </linearGradient>
                    <filter id="mintGlow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#392A48" 
                    strokeWidth={3}
                    fill="url(#completionGradient)"
                    dot={{ 
                      fill: '#392A48', 
                      strokeWidth: 2, 
                      r: 4,
                      filter: 'url(#mintGlow)'
                    }}
                    activeDot={{ 
                      r: 6, 
                      stroke: '#392A48', 
                      strokeWidth: 2,
                      fill: '#ffffff',
                      filter: 'url(#mintGlow)'
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </div>

          {/* Team Productivity Hours */}
          <div className="dashboard-card productivity-card light-purple-card">
            <div className="card-header">
              <h3 className="card-title">Productivity hours</h3>
              <button className="more-btn">
                <MoreVertical size={16} />
              </button>
            </div>
            <div className="productivity-chart">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={productivityData}>
                  <defs>
                    <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(48, 25, 52, 0.8)" />
                      <stop offset="100%" stopColor="rgba(48, 25, 52, 0.4)" />
                    </linearGradient>
                    <filter id="barGlow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Bar 
                    dataKey="hours" 
                    fill="url(#productivityGradient)" 
                    radius={[8, 8, 0, 0]}
                    filter="url(#barGlow)"
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="productivity-stats">
                <div className="stat-item">
                  <span className="stat-label">Avg daily</span>
                  <span className="stat-value">7.4h</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">This week</span>
                  <span className="stat-value">52h</span>
                </div>
          </div>
        </div>
      </div>

          {/* Team Insights */}
          <div className="dashboard-card team-insights-card">
            <div className="card-header">
              <h3 className="card-title">Team insights</h3>
              <button className="see-all-btn">See All</button>
            </div>
            <div className="team-activity">
              <div className="activity-chart">
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={productivityData}>
                    <Bar dataKey="hours" fill="#e5e7eb" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="team-avatars">
                {teamMembers.slice(0, 3).map((member, index) => (
                  <div key={index} className="team-avatar-item">
                    <div className="avatar-circle">{member.avatar}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Department Performance */}
          <div className="dashboard-card department-card light-purple-card">
              <div className="card-header">
              <h3 className="card-title">Department performance</h3>
              <button className="more-btn">
                <MoreVertical size={16} />
              </button>
                </div>
            <div className="department-list">
              {departmentMetrics.map((dept, index) => (
                <div key={index} className="department-item">
                  <div className="dept-info">
                    <div className="dept-icon" style={{ backgroundColor: dept.color }}>
                      {dept.dept.charAt(0)}
                  </div>
                    <div className="dept-details">
                      <span className="dept-name">{dept.dept}</span>
                      <span className="dept-metric">Satisfaction: {dept.satisfaction}/10</span>
                    </div>
                  </div>
                  <div className="participation-rate">
                    <span className="rate-value">{dept.participation}%</span>
                  </div>
                </div>
              ))}
                </div>
              </div>

          {/* Culture Team */}
          <div className="dashboard-card culture-team-card light-purple-card">
            <div className="card-header">
              <h3 className="card-title">Culture Team</h3>
              <div className="team-stats">
                <span className="team-count">{teamMembers.length} members</span>
              </div>
            </div>
            <div className="team-members-list">
              {teamMembers.map((member, index) => (
                <div key={index} className="member-row">
                  <div className="member-info">
                    <div className="member-avatar">{member.avatar}</div>
                    <div className="member-details">
                      <span className="member-name">{member.name}</span>
                      <span className="member-role">{member.role}</span>
                    </div>
                  </div>
                  <div className="member-stats">
                    <div className="task-count">{member.tasks} tasks open</div>
                    <div className="hours-count">{member.hours}</div>
                  </div>
                  <div className={`status-indicator ${member.status}`}></div>
                </div>
              ))}
            </div>
              </div>

          {/* Recent Achievements */}
          <div className="dashboard-card achievements-card light-purple-card">
            <div className="card-header">
              <h3 className="card-title">Recent achievements</h3>
              <button className="more-btn">
                <MoreVertical size={16} />
                  </button>
            </div>
            <div className="achievements-list">
              <div className="achievement-item">
                <div className="achievement-icon">🏆</div>
                <div className="achievement-text">
                  <span className="achievement-title">High Engagement</span>
                  <span className="achievement-desc">Team reached 95% participation</span>
                </div>
                <span className="achievement-time">2 days ago</span>
              </div>
              <div className="achievement-item">
                <div className="achievement-icon">🎯</div>
                <div className="achievement-text">
                  <span className="achievement-title">Survey Goal</span>
                  <span className="achievement-desc">Monthly target exceeded</span>
                </div>
                <span className="achievement-time">1 week ago</span>
              </div>
              <div className="achievement-item">
                <div className="achievement-icon">⭐</div>
                <div className="achievement-text">
                  <span className="achievement-title">Culture Score</span>
                  <span className="achievement-desc">Highest score this quarter</span>
                </div>
                <span className="achievement-time">2 weeks ago</span>
              </div>
            </div>
          </div>

          {/* Team Wellness */}
          <div className="dashboard-card wellness-card light-purple-card">
            <div className="card-header">
              <div className="wellness-header-content">
                <div className="wellness-icon">
                  <Heart size={18} />
                    </div>
                <div className="wellness-header-text">
                  <h3 className="card-title">Team Wellness</h3>
                  <span className="wellness-subtitle">Mental health & satisfaction</span>
                </div>
              </div>
              <button className="more-btn">
                <MoreVertical size={16} />
              </button>
                  </div>

            <div className="wellness-metrics">
              <div className="wellness-score">
                <div className="score-circle">
                  <span className="score-number">8.4</span>
                  <span className="score-max">/10</span>
                    </div>
                <div className="score-label">Wellness Score</div>
                    </div>
              
              <div className="wellness-stats">
                <div className="wellness-stat">
                  <div className="stat-indicator positive"></div>
                  <div className="stat-info">
                    <span className="stat-value">92%</span>
                    <span className="stat-name">Satisfaction</span>
                  </div>
                </div>
                <div className="wellness-stat">
                  <div className="stat-indicator neutral"></div>
                  <div className="stat-info">
                    <span className="stat-value">6.2</span>
                    <span className="stat-name">Work-life balance</span>
            </div>
                </div>
                <div className="wellness-stat">
                  <div className="stat-indicator positive"></div>
                  <div className="stat-info">
                    <span className="stat-value">87%</span>
                    <span className="stat-name">Support feeling</span>
                  </div>
                </div>
              </div>
      </div>

            <div className="card-cta">
              <button 
                className="cta-btn"
                onClick={() => navigate('/actions')}
              >
                <ChevronRight size={16} />
                Improve Team Wellness
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f3eeff 0%, #f5f1ff 20%, #f7f4ff 40%, #f9f7ff 60%, #fcfbff 80%, #ffffff 100%);
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          margin: calc(-1 * var(--space-6));
          padding: var(--space-6);
        }


        /* Dashboard Content */
        .dashboard-content {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-title-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .title-left {
          flex: 1;
        }

        .dashboard-title {
          font-size: 36px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .dashboard-subtitle {
          font-size: 16px;
          font-weight: 400;
          color: #64748b;
          margin: 0;
          letter-spacing: 0.01em;
          line-height: 1.5;
        }

        .title-right {
          display: flex;
          gap: 12px;
        }

        .customize-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          font-size: 14px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .customize-btn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .appointment-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(248, 250, 252, 0.8);
          color: #64748b;
          border: 1px solid rgba(100, 116, 139, 0.1);
          border-radius: 14px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          backdrop-filter: blur(10px);
        }

        .appointment-btn:hover {
          background: rgba(241, 245, 249, 0.9);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          transform: translateY(-2px);
        }

        /* Dashboard Grid */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          grid-auto-rows: min-content;
        }

        .dashboard-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.8) 100%);
          backdrop-filter: blur(24px);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.06),
            0 4px 16px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.6);
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dashboard-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%, rgba(255, 255, 255, 0.1) 100%);
          pointer-events: none;
          opacity: 0.7;
          z-index: 0;
        }

        .dashboard-card > * {
          position: relative;
          z-index: 1;
        }
        
        .dashboard-card:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.08),
            0 6px 20px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            inset 0 -1px 0 rgba(0, 0, 0, 0.03);
          border-color: rgba(255, 255, 255, 0.8);
        }

        .dashboard-card:hover::before {
          opacity: 1;
        }

        .engagement-chart-card {
          grid-column: span 2;
        }

        .survey-history-card {
          grid-column: span 4;
        }

        /* Survey Completion Card - Light Purple Glass */
        .dark-card {
          background: linear-gradient(135deg, rgba(224, 231, 255, 0.65) 0%, rgba(241, 245, 249, 0.8) 100%);
          backdrop-filter: blur(24px);
          color: #64748b;
          border: 1px solid rgba(196, 181, 253, 0.4);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.06),
            0 4px 16px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(196, 181, 253, 0.1);
          position: relative;
        }

        .dark-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%, rgba(196, 181, 253, 0.05) 100%);
          pointer-events: none;
          opacity: 0.7;
          z-index: 0;
        }

        .dark-card > * {
          position: relative;
          z-index: 1;
        }

        /* Light Purple Card - Same styling as Survey Completion */
        .light-purple-card {
          background: linear-gradient(135deg, rgba(224, 231, 255, 0.65) 0%, rgba(241, 245, 249, 0.8) 100%) !important;
          color: #64748b !important;
          border: 1px solid rgba(196, 181, 253, 0.4) !important;
          backdrop-filter: blur(24px) !important;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.06),
            0 4px 16px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(196, 181, 253, 0.1) !important;
          position: relative !important;
        }

        .light-purple-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, transparent 50%, rgba(196, 181, 253, 0.05) 100%);
          pointer-events: none;
          opacity: 0.7;
          z-index: 0;
        }

        .light-purple-card > * {
          position: relative;
          z-index: 1;
        }

        .light-purple-card .card-title {
          color: #475569;
        }

        .light-text {
          color: #64748b;
        }

        .completion-badge {
          background: linear-gradient(135deg, rgba(196, 181, 253, 0.15) 0%, rgba(224, 231, 255, 0.1) 100%);
          color: #c4b5fd;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid rgba(196, 181, 253, 0.2);
          box-shadow: 0 2px 8px rgba(196, 181, 253, 0.1);
          backdrop-filter: blur(10px);
        }

        .current-metric {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .metric-trend {
          font-size: 14px;
          font-weight: 500;
        }

        .metric-trend.positive {
          color: #301934;
        }

        /* Productivity Card */
        .productivity-stats {
          display: flex;
          justify-content: space-between;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(59, 130, 246, 0.1);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .stat-label {
          font-size: 12px;
          font-weight: 400;
          color: #64748b;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.01em;
        }

        /* Team Insights Card */
        .team-activity {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .team-avatars {
          display: flex;
          gap: 8px;
        }

        .team-avatar-item .avatar-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          background: linear-gradient(135deg, rgba(240, 249, 255, 0.8) 0%, rgba(219, 234, 254, 0.6) 100%);
          border: 2px solid rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
        }

        .see-all-btn {
          background: none;
          border: none;
          color: #301934;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        }

        /* Department Card */
        .department-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .department-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dept-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dept-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
        }

        .dept-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .dept-name {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .dept-metric {
          font-size: 12px;
          color: #64748b;
        }

        .participation-rate {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        /* Culture Team Card */
        .team-stats {
          font-size: 12px;
          color: #64748b;
        }

        .team-members-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .member-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
        }

        .member-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .member-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          background: linear-gradient(135deg, rgba(236, 253, 245, 0.8) 0%, rgba(209, 250, 229, 0.6) 100%);
          border: 1px solid rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
        }

        .member-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .member-name {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .member-role {
          font-size: 12px;
          color: #64748b;
        }

        .member-stats {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: right;
        }

        .task-count {
          font-size: 12px;
          color: #64748b;
        }

        .hours-count {
          font-size: 12px;
          font-weight: 500;
          color: #1e293b;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-left: 12px;
        }

        .status-indicator.active {
          background: #64748b;
        }

        .status-indicator.busy {
          background: #6b7280;
        }

        /* Achievements Card */
        .achievements-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .achievement-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .achievement-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(250, 245, 255, 0.8) 0%, rgba(243, 232, 255, 0.6) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
        }

        .achievement-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .achievement-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .achievement-desc {
          font-size: 12px;
          color: #64748b;
        }

        .achievement-time {
          font-size: 12px;
          color: #64748b;
        }

        /* Growth Tracking Promo Card - Light Purple Glass */
        .promo-card {
          background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.7) 50%, rgba(250, 251, 252, 0.8) 100%);
          backdrop-filter: blur(20px);
          color: #475569;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.4);
          box-shadow: 
            0 8px 16px rgba(0, 0, 0, 0.04),
            0 4px 8px rgba(0, 0, 0, 0.02);
        }

        /* Gradient Card - Same styling as promo card */
        .gradient-card {
          background: linear-gradient(135deg, rgba(224, 231, 255, 0.9) 0%, rgba(196, 181, 253, 0.8) 50%, rgba(241, 245, 249, 0.9) 100%) !important;
          color: #475569 !important;
          border: 1px solid rgba(196, 181, 253, 0.4) !important;
        }

        .gradient-card .card-title {
          color: #334155;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }

        .card-controls {
          display: flex;
          gap: 8px;
        }

        .period-select {
          padding: 6px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          font-size: 14px;
          color: #64748b;
          cursor: pointer;
        }

        .more-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }

        .more-btn:hover {
          background: rgba(241, 245, 249, 0.9);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }

        /* Blood Sugar Chart */
        .chart-info {
          margin-bottom: 16px;
        }

        .current-reading {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .reading-date {
          font-size: 13px;
          font-weight: 400;
          color: #64748b;
          letter-spacing: 0.01em;
        }

        .reading-value {
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .chart-legend {
          display: flex;
          justify-content: space-between;
          margin-top: 16px;
          font-size: 12px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-indicator {
          width: 12px;
          height: 3px;
          border-radius: 2px;
        }

        .legend-indicator.actual {
          background: #64748b;
        }

        .legend-indicator.range {
          background: #e5e7eb;
        }

        .legend-text {
          color: #64748b;
        }

        .legend-value {
          color: #1e293b;
          font-weight: 500;
        }

        /* Career Progress Widget */
        .career-progress-content {
          text-align: center;
        }

        .career-progress-description {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }

        .circular-progress {
          position: relative;
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .progress-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 32px;
          font-weight: 700;
          color: #301934;
        }

        /* Enhanced Career Card Styling */
        .enhanced-career-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(248, 250, 252, 0.8) 100%);
          backdrop-filter: blur(24px);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.06),
            0 4px 16px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.8),
            inset 0 -1px 0 rgba(48, 25, 52, 0.05);
          position: relative;
          overflow: hidden;
        }

        .enhanced-career-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #301934 0%, #392A48 50%, #301934 100%);
          z-index: 1;
        }

        .enhanced-career-card::after {
          content: '';
          position: absolute;
          top: 4px;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 0 0 16px 16px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(48, 25, 52, 0.02) 100%);
          pointer-events: none;
          opacity: 0.7;
        }

        .enhanced-career-card > * {
          position: relative;
          z-index: 2;
        }

        .career-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .career-header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .career-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, rgba(48, 25, 52, 0.2) 0%, rgba(57, 42, 72, 0.1) 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #301934;
          border: 1px solid rgba(48, 25, 52, 0.3);
        }

        .career-header-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .career-title {
          font-size: 18px;
          font-weight: 600;
          color: #334155;
          margin: 0;
        }

        .career-subtitle {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }

        .career-progress-visual {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .circular-progress-container {
          position: relative;
          flex-shrink: 0;
        }

        .progress-center-enhanced {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .progress-number-large {
          font-size: 32px;
          font-weight: 800;
          color: #301934;
          display: block;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .progress-total {
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
        }

        .career-stats {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }

        .stat-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 10px;
          border: 1px solid rgba(226, 232, 240, 0.5);
        }

        .stat-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, rgba(48, 25, 52, 0.15) 0%, rgba(57, 42, 72, 0.1) 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #301934;
          flex-shrink: 0;
        }

        .stat-content {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .stat-number {
          font-size: 18px;
          font-weight: 700;
          color: #334155;
          letter-spacing: -0.01em;
        }

        .stat-label {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .career-goals-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .goal-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(248, 250, 252, 0.6);
          border-radius: 8px;
          border: 1px solid rgba(226, 232, 240, 0.4);
          transition: all 0.2s ease;
        }

        .goal-item:hover {
          background: rgba(248, 250, 252, 0.9);
          border-color: rgba(196, 181, 253, 0.3);
        }

        .goal-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #cbd5e1;
          flex-shrink: 0;
        }

        .goal-item.completed .goal-dot {
          background: #64748b;
        }

        .goal-item.in-progress .goal-dot {
          background: #6b7280;
        }

        .goal-text {
          font-size: 13px;
          color: #475569;
          flex: 1;
          line-height: 1.4;
        }

        .goal-check {
          color: #10b981;
          flex-shrink: 0;
        }

        .goal-progress {
          font-size: 11px;
          color: #f59e0b;
          font-weight: 600;
          background: rgba(245, 158, 11, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        /* Team Wellness Card Styling */
        .wellness-header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .wellness-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, rgba(48, 25, 52, 0.2) 0%, rgba(57, 42, 72, 0.1) 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #301934;
          border: 1px solid rgba(48, 25, 52, 0.3);
        }

        .wellness-header-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .wellness-subtitle {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
        }

        .wellness-metrics {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .wellness-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .score-circle {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, rgba(48, 25, 52, 0.15) 0%, rgba(57, 42, 72, 0.08) 100%);
          border: 3px solid rgba(48, 25, 52, 0.3);
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .score-number {
          font-size: 24px;
          font-weight: 700;
          color: #301934;
          line-height: 1;
        }

        .score-max {
          font-size: 12px;
          color: #94a3b8;
          font-weight: 500;
        }

        .score-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          text-align: center;
        }

        .wellness-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .wellness-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(248, 250, 252, 0.6);
          border-radius: 8px;
          border: 1px solid rgba(226, 232, 240, 0.4);
        }

        .stat-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .stat-indicator.positive {
          background: #301934;
        }

        .stat-indicator.neutral {
          background: #392A48;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #334155;
        }

        .stat-name {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .wellness-actions {
          margin-top: 16px;
        }

        .wellness-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: linear-gradient(135deg, rgba(48, 25, 52, 0.15) 0%, rgba(57, 42, 72, 0.08) 100%);
          color: #301934;
          border: 1px solid rgba(48, 25, 52, 0.3);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          justify-content: center;
        }

        .wellness-btn:hover {
          background: linear-gradient(135deg, rgba(48, 25, 52, 0.2) 0%, rgba(57, 42, 72, 0.12) 100%);
          border-color: rgba(48, 25, 52, 0.4);
        }

        /* Call to Action Buttons */
        .card-cta {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(226, 232, 240, 0.3);
        }

        .cta-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #301934 0%, #392A48 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          width: auto;
          min-width: 160px;
          max-width: 200px;
          justify-content: center;
          margin: 0 auto;
          box-shadow: 
            0 4px 12px rgba(48, 25, 52, 0.15),
            0 2px 6px rgba(48, 25, 52, 0.1);
          letter-spacing: -0.01em;
        }

        .cta-btn:hover {
          background: linear-gradient(135deg, #392A48 0%, #301934 100%);
          transform: translateY(-2px);
          box-shadow: 
            0 6px 20px rgba(48, 25, 52, 0.2),
            0 3px 8px rgba(48, 25, 52, 0.15);
        }

        .cta-btn:active {
          transform: translateY(0);
          box-shadow: 
            0 3px 10px rgba(48, 25, 52, 0.15),
            0 1px 4px rgba(48, 25, 52, 0.1);
        }

        .career-progress-labels {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          font-size: 12px;
          color: #64748b;
        }

        .career-progress-status {
          font-size: 14px;
          color: #64748b;
        }

        /* Employee Profiles */
        .employee-info {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .employee-basic {
          display: flex;
          gap: 16px;
        }

        .employee-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          flex-shrink: 0;
          border: 2px solid rgba(100, 116, 139, 0.2);
        }

        .employee-details {
          flex: 1;
        }

        .employee-name {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .employee-role {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 8px 0;
        }

        .employee-department {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 14px;
        }

        .employee-department span:first-child {
          color: #64748b;
        }

        .department {
          color: #1e293b;
          font-weight: 500;
        }

        .employee-metrics {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .metric-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: linear-gradient(135deg, rgba(240, 249, 255, 0.5) 0%, rgba(224, 242, 254, 0.3) 100%);
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          transition: all 0.3s ease;
        }

        .metric-item:hover {
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
          transform: translateY(-1px);
        }

        .metric-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(100, 116, 139, 0.1) 0%, rgba(71, 85, 105, 0.05) 100%);
        }

        .satisfaction-icon {
          color: #64748b !important;
        }

        .growth-icon {
          color: #64748b !important;
        }


        .metric-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .metric-label {
          font-size: 12px;
          font-weight: 400;
          color: #64748b;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .metric-value {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.01em;
        }

        .metric-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: rgba(100, 116, 139, 0.1);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
        }

        /* Carousel Controls */
        .carousel-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .carousel-btn {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: linear-gradient(135deg, rgba(100, 116, 139, 0.1) 0%, rgba(71, 85, 105, 0.05) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #64748b;
        }

        .carousel-btn:hover {
          background: linear-gradient(135deg, rgba(100, 116, 139, 0.15) 0%, rgba(71, 85, 105, 0.08) 100%);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .carousel-indicator {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          min-width: 36px;
          text-align: center;
        }

        /* Survey History Table */
        .survey-table {
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1.5fr 1fr 1fr 1fr 40px;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1.5fr 1fr 1fr 1fr 40px;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid #f8fafc;
          align-items: center;
        }

        .facilitator-cell {
          display: flex;
          align-items: center;
        }

        .facilitator-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .facilitator-name {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .facilitator-specialty {
          font-size: 12px;
          color: #64748b;
        }

        .session-type-cell {
          font-size: 14px;
          color: #64748b;
        }

        .date-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .session-date {
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .session-time {
          font-size: 12px;
          color: #64748b;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 500;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }

        .status-badge.completed {
          background: rgba(196, 181, 253, 0.2);
          color: #c4b5fd;
        }

        .status-badge.scheduled {
          background: linear-gradient(135deg, rgba(224, 231, 255, 0.6) 0%, rgba(241, 245, 249, 0.8) 100%);
          color: #a78bfa;
        }

        .rating-cell {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #64748b;
        }

        .star-icon {
          color: #c4b5fd;
        }

        .report-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
        }

        .report-icon {
          color: #64748b;
        }

        .sort-controls {
          display: flex;
          gap: 8px;
        }

        .sort-btn, .filter-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          font-size: 12px;
          color: #64748b;
          cursor: pointer;
        }

        /* Promo Card */
        .promo-content {
          position: relative;
          z-index: 2;
        }

        .promo-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.4);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #334155;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }

        .badge-number {
          background: white;
          color: #6366f1;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .promo-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #334155;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
        }

        .promo-description {
          font-size: 14px;
          opacity: 1;
          margin: 0 0 20px 0;
          line-height: 1.5;
          color: #475569;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.6);
        }

        .promo-visual {
          position: absolute;
          top: 20px;
          right: 20px;
          opacity: 0.3;
        }

        .growth-icon {
          font-size: 48px;
        }

        .promo-action {
          width: 40px;
          height: 40px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
        }

        .promo-action:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Responsive Design */
        @media (max-width: 1400px) {
          .dashboard-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }
          
          .engagement-chart-card {
            grid-column: span 1;
          }
          
          .survey-history-card {
            grid-column: span 2;
          }
        }

        @media (max-width: 1000px) {
          .dashboard-grid {
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          }
          
          .survey-history-card {
            grid-column: span 1;
          }
        }

        @media (max-width: 768px) {
          .dashboard-content {
            padding: 16px;
          }

          .dashboard-title-section {
            flex-direction: column;
            gap: 16px;
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .engagement-chart-card, .survey-history-card {
            grid-column: span 1;
          }

          .table-header, .table-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .table-header {
            display: none;
          }

          .table-row {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 8px;
            border: none;
          }

          .member-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .member-stats {
            text-align: left;
          }
        }
      `}</style>
    </div>
  )
}

export default Insights
