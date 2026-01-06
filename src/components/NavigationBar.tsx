import React from 'react'
import './NavigationBar.css'

type ViewMode = 'month' | 'year'

interface NavigationBarProps {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

const NavigationBar: React.FC<NavigationBarProps> = ({ viewMode, setViewMode }) => {
  return (
    <div className="navigation-bar">
      <button
        className={`nav-mode-button ${viewMode === 'month' ? 'active' : ''}`}
        onClick={() => setViewMode('month')}
      >
        Месяц
      </button>
      <button
        className={`nav-mode-button ${viewMode === 'year' ? 'active' : ''}`}
        onClick={() => setViewMode('year')}
      >
        Год
      </button>
    </div>
  )
}

export default NavigationBar

