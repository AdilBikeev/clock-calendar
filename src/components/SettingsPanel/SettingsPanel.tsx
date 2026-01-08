import React from 'react'
import './SettingsPanel.css'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onAddAccount: () => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onAddAccount }) => {
  return (
    <>
      {isOpen && (
        <div className="settings-overlay" onClick={onClose}></div>
      )}
      <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
        <div className="settings-panel-header">
          <h2 className="settings-panel-title">Настройки</h2>
        </div>
        <div className="settings-panel-content">
          <div className="settings-section">
            <h3 className="settings-section-title">Синхронизация</h3>
            <button 
              className="settings-section-button"
              onClick={onAddAccount}
            >
              Добавить аккаунт
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default SettingsPanel
