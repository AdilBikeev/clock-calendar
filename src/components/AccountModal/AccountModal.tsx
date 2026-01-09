import React from 'react'
import { FaGoogle } from 'react-icons/fa'
import './AccountModal.css'

interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectAccount: (accountType: 'google') => void
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSelectAccount }) => {
  if (!isOpen) return null

  const handleGoogleClick = () => {
    onSelectAccount('google')
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="account-modal-overlay" onClick={handleOverlayClick}>
      <div className="account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="account-modal-header">
          <h2 className="account-modal-title">Добавить аккаунт</h2>
          <button className="account-modal-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>
        <div className="account-modal-content">
          <div className="account-options">
            <button
              className="account-option"
              onClick={handleGoogleClick}
              aria-label="Добавить Google аккаунт"
            >
              <div className="account-option-icon google-icon">
                <FaGoogle size={24} />
              </div>
              <div className="account-option-info">
                <div className="account-option-name">Google Calendar</div>
                <div className="account-option-description">Синхронизация с Google календарем</div>
              </div>
              <div className="account-option-arrow">›</div>
            </button>
            {/* Здесь можно добавить другие аккаунты в будущем */}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountModal
