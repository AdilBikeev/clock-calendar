import React from 'react'
import { FaGoogle, FaTrash } from 'react-icons/fa'
import './SettingsPanel.css'
import { CalendarAccount } from '../../types/account'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onAddAccount: () => void
  accounts: CalendarAccount[]
  onRemoveAccount: (accountId: string) => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onAddAccount,
  accounts,
  onRemoveAccount,
}) => {
  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'google':
        return <FaGoogle size={16} />
      default:
        return null
    }
  }

  const getAccountName = (account: CalendarAccount) => {
    if (account.type === 'google') {
      return 'Google Calendar'
    }
    return account.type
  }

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
            {accounts.length === 0 ? (
              <button 
                className="settings-section-button"
                onClick={onAddAccount}
              >
                Добавить аккаунт
              </button>
            ) : (
              <>
                <div className="settings-accounts-list">
                  {accounts.map((account) => (
                    <div key={account.id} className="settings-account-item">
                      <div className="settings-account-info">
                        <div className="settings-account-icon">
                          {getAccountIcon(account.type)}
                        </div>
                        <div className="settings-account-details">
                          <div className="settings-account-name">
                            {getAccountName(account)}
                          </div>
                          <div className="settings-account-email">
                            {account.email}
                          </div>
                          {account.syncedAt && (
                            <div className="settings-account-synced">
                              Синхронизировано: {new Date(account.syncedAt).toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        className="settings-account-remove"
                        onClick={() => onRemoveAccount(account.id)}
                        aria-label="Удалить аккаунт"
                        title="Удалить аккаунт"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  className="settings-section-button"
                  onClick={onAddAccount}
                >
                  Добавить аккаунт
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default SettingsPanel
