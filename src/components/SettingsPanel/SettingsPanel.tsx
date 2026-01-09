import React, { useMemo, useState } from 'react'
import { FaGoogle, FaTrash, FaPlus, FaSync } from 'react-icons/fa'
import './SettingsPanel.css'
import { CalendarAccount, AccountType } from '../../types/account'
import ConfirmModal from '../ConfirmModal/ConfirmModal'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onAddAccount: () => void
  accounts: CalendarAccount[]
  onRemoveAccount: (accountId: string) => void
  onSync?: () => Promise<void>
  isSyncing?: boolean
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  onAddAccount,
  accounts,
  onRemoveAccount,
  onSync,
  isSyncing = false,
}) => {
  const [accountToRemove, setAccountToRemove] = useState<CalendarAccount | null>(null)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  const availableServices: AccountType[] = ['google']

  // Проверяем, какие из доступных сервисов еще не добавлены
  const hasAvailableServices = useMemo(() => {
    const addedServiceTypes = new Set(accounts.map(account => account.type))
    return availableServices.some(service => !addedServiceTypes.has(service))
  }, [accounts, availableServices])

  const handleRemoveClick = (account: CalendarAccount) => {
    setAccountToRemove(account)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmRemove = () => {
    if (accountToRemove) {
      onRemoveAccount(accountToRemove.id)
      setAccountToRemove(null)
    }
  }

  const handleCancelRemove = () => {
    setIsConfirmModalOpen(false)
    setAccountToRemove(null)
  }

  const handleSyncClick = async () => {
    if (!onSync || isSyncing || accounts.length === 0) {
      return
    }
    
    try {
      await onSync()
    } catch (error) {
      console.error('Ошибка синхронизации:', error)
      alert(`Ошибка синхронизации: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

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
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={handleCancelRemove}
        onConfirm={handleConfirmRemove}
        title={`Вы уверены, что хотите отключить синхронизацию с ${accountToRemove ? getAccountName(accountToRemove) : 'этим аккаунтом'}?`}
        message="Все синхронизированные события будут удалены из календаря."
        confirmText="Отключить"
        cancelText="Отмена"
      />
      {isOpen && (
        <div className="settings-overlay" onClick={onClose}></div>
      )}
      <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
        <div className="settings-panel-header">
          <h2 className="settings-panel-title">Настройки</h2>
        </div>
        <div className="settings-panel-content">
          <div className="settings-section">
            <div className="settings-section-header">
              <h3 className="settings-section-title">Синхронизация</h3>
              <button
                className={`settings-sync-button ${isSyncing ? 'syncing' : ''}`}
                onClick={handleSyncClick}
                disabled={isSyncing || accounts.length === 0 || !onSync}
                aria-label="Синхронизировать"
                title={accounts.length === 0 ? 'Добавьте аккаунт для синхронизации' : isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
              >
                <FaSync size={14} className={isSyncing ? 'spinning' : ''} />
              </button>
            </div>
            {accounts.length === 0 ? (
              hasAvailableServices && (
                <button 
                  className="settings-section-button settings-section-button-primary"
                  onClick={onAddAccount}
                >
                  <span className="settings-section-button-icon">
                    <FaPlus size={12} />
                  </span>
                  <span className="settings-section-button-text">Добавить аккаунт</span>
                </button>
              )
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
                        onClick={() => handleRemoveClick(account)}
                        aria-label="Удалить аккаунт"
                        title="Удалить аккаунт"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {hasAvailableServices && (
                  <button 
                    className="settings-section-button settings-section-button-primary"
                    onClick={onAddAccount}
                  >
                    <span className="settings-section-button-icon">
                      <FaPlus size={14} />
                    </span>
                    <span className="settings-section-button-text">Добавить аккаунт</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default SettingsPanel
