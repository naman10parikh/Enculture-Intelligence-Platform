import React, { useState } from 'react'
import { ChevronDown, ChevronUp, User, Users, Building, Star, Shield } from 'lucide-react'
import { usePersona } from '../context/PersonaContext'
import { getPersonaDisplayInfo } from '../utils/roleHierarchy'

const PersonaToggle = ({ className = '' }) => {
  const { 
    activePersona, 
    availablePersonas, 
    switchPersona, 
    isTransitioning,
    hasMultiplePersonas 
  } = usePersona()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Don't render if user only has access to one persona
  if (!hasMultiplePersonas()) {
    return null
  }

  const handlePersonaSwitch = async (persona) => {
    setIsDropdownOpen(false)
    await switchPersona(persona)
  }

  const getPersonaIcon = (persona) => {
    const iconMap = {
      'Employee': User,
      'Manager': Users,
      "Manager's Manager": Building,
      'CEO': Star,
      'HR Admin': Shield
    }
    return iconMap[persona] || User
  }

  const activePersonaInfo = getPersonaDisplayInfo(activePersona)
  const ActiveIcon = getPersonaIcon(activePersona)

  return (
    <div className={`persona-toggle ${className}`}>
      <div className="persona-toggle-container">
        <button
          className={`persona-toggle-button ${isDropdownOpen ? 'active' : ''} ${isTransitioning ? 'transitioning' : ''}`}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isTransitioning}
          aria-label="Switch persona view"
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
        >
          <div className="persona-toggle-content">
            <div className="persona-icon" style={{ '--persona-color': activePersonaInfo.color }}>
              <ActiveIcon size={16} />
            </div>
            <div className="persona-info">
              <span className="persona-label">{activePersonaInfo.label}</span>
              <span className="persona-description">{activePersonaInfo.description}</span>
            </div>
          </div>
          <div className="toggle-arrow">
            {isDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {isTransitioning && (
            <div className="transition-overlay">
              <div className="spinner" />
            </div>
          )}
        </button>

        {isDropdownOpen && (
          <div className="persona-dropdown" role="listbox">
            {availablePersonas.map((persona) => {
              const personaInfo = getPersonaDisplayInfo(persona)
              const PersonaIcon = getPersonaIcon(persona)
              const isActive = persona === activePersona

              return (
                <button
                  key={persona}
                  className={`persona-option ${isActive ? 'active' : ''}`}
                  onClick={() => handlePersonaSwitch(persona)}
                  disabled={isActive || isTransitioning}
                  role="option"
                  aria-selected={isActive}
                  aria-label={`Switch to ${personaInfo.label}`}
                >
                  <div className="persona-option-content">
                    <div 
                      className="persona-option-icon" 
                      style={{ '--persona-color': personaInfo.color }}
                    >
                      <PersonaIcon size={16} />
                    </div>
                    <div className="persona-option-info">
                      <span className="persona-option-label">{personaInfo.label}</span>
                      <span className="persona-option-description">{personaInfo.description}</span>
                    </div>
                  </div>
                  {isActive && (
                    <div className="active-indicator">
                      <div className="active-dot" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .persona-toggle {
          position: relative;
          z-index: 1000;
        }

        .persona-toggle-container {
          position: relative;
        }

        .persona-toggle-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          min-width: 240px;
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 4px 12px rgba(0, 0, 0, 0.05),
            0 2px 6px rgba(0, 0, 0, 0.03);
        }

        .persona-toggle-button:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
          border-color: rgba(196, 181, 253, 0.4);
          transform: translateY(-1px);
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.08),
            0 3px 8px rgba(0, 0, 0, 0.05);
        }

        .persona-toggle-button.active {
          background: linear-gradient(135deg, rgba(224, 231, 255, 0.9) 0%, rgba(196, 181, 253, 0.8) 100%);
          border-color: rgba(196, 181, 253, 0.6);
          box-shadow: 
            0 8px 25px rgba(196, 181, 253, 0.15),
            0 4px 10px rgba(196, 181, 253, 0.1);
        }

        .persona-toggle-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .persona-toggle-button.transitioning {
          pointer-events: none;
        }

        .persona-toggle-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .persona-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, 
            color-mix(in srgb, var(--persona-color) 20%, transparent),
            color-mix(in srgb, var(--persona-color) 10%, transparent)
          );
          border: 1px solid color-mix(in srgb, var(--persona-color) 30%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--persona-color);
          position: relative;
          overflow: hidden;
        }

        .persona-icon::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            color-mix(in srgb, var(--persona-color) 5%, transparent),
            transparent 50%,
            color-mix(in srgb, var(--persona-color) 3%, transparent)
          );
          pointer-events: none;
        }

        .persona-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: left;
          flex: 1;
        }

        .persona-label {
          font-size: 14px;
          font-weight: 600;
          color: #334155;
          line-height: 1.2;
        }

        .persona-description {
          font-size: 12px;
          color: #64748b;
          line-height: 1.3;
        }

        .toggle-arrow {
          color: #64748b;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }

        .persona-toggle-button.active .toggle-arrow {
          transform: rotate(180deg);
        }

        .transition-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .persona-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(226, 232, 240, 0.6);
          border-radius: 16px;
          padding: 8px;
          box-shadow: 
            0 10px 40px rgba(0, 0, 0, 0.1),
            0 5px 20px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          animation: dropdownSlideIn 0.2s ease-out;
          z-index: 1001;
        }

        @keyframes dropdownSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .persona-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          padding: 12px;
          background: transparent;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          text-align: left;
        }

        .persona-option:hover:not(:disabled) {
          background: rgba(248, 250, 252, 0.8);
        }

        .persona-option.active {
          background: linear-gradient(135deg, 
            color-mix(in srgb, var(--persona-color) 10%, rgba(248, 250, 252, 0.8)),
            color-mix(in srgb, var(--persona-color) 5%, rgba(241, 245, 249, 0.6))
          );
          cursor: default;
        }

        .persona-option:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .persona-option-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .persona-option-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: linear-gradient(135deg, 
            color-mix(in srgb, var(--persona-color) 15%, transparent),
            color-mix(in srgb, var(--persona-color) 8%, transparent)
          );
          border: 1px solid color-mix(in srgb, var(--persona-color) 25%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--persona-color);
          flex-shrink: 0;
        }

        .persona-option-info {
          display: flex;
          flex-direction: column;
          gap: 1px;
          flex: 1;
        }

        .persona-option-label {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          line-height: 1.2;
        }

        .persona-option-description {
          font-size: 11px;
          color: #64748b;
          line-height: 1.3;
        }

        .active-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--persona-color);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--persona-color) 20%, transparent);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .persona-toggle-button {
            min-width: 200px;
            padding: 10px 12px;
          }

          .persona-label {
            font-size: 13px;
          }

          .persona-description {
            font-size: 11px;
          }

          .persona-dropdown {
            left: -8px;
            right: -8px;
          }
        }

        /* Accessibility improvements */
        @media (prefers-reduced-motion: reduce) {
          .persona-toggle-button,
          .persona-option,
          .toggle-arrow {
            transition: none;
          }

          .persona-dropdown {
            animation: none;
          }

          .spinner {
            animation: none;
          }
        }

        /* Focus styles for keyboard navigation */
        .persona-toggle-button:focus-visible,
        .persona-option:focus-visible {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}

export default PersonaToggle
