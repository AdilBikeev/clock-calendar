import { useState, useEffect, useCallback } from 'react'
import { CalendarAccount } from '../types/account'
import { loadAccountsFromStorage, saveAccountsToStorage } from '../services/accountStorageService'
import { initiateGoogleOAuth, handleGoogleOAuthCallback, getGoogleCalendarEvents, convertGoogleEventToEvent } from '../services/googleCalendarService'
import { signOut as signOutGoogle } from '../services/googleSignInService'
import { Event } from '../types/event'

/**
 * Custom hook для управления подключенными аккаунтами календаря
 */
export const useAccounts = () => {
  const [accounts, setAccounts] = useState<CalendarAccount[]>([])
  const [isAccountsLoaded, setIsAccountsLoaded] = useState<boolean>(false)

  // Загрузка аккаунтов из localStorage при монтировании
  useEffect(() => {
    const loadedAccounts = loadAccountsFromStorage()
    setAccounts(loadedAccounts)
    setIsAccountsLoaded(true)
  }, [])

  // Сохранение аккаунтов в localStorage при изменении
  useEffect(() => {
    if (!isAccountsLoaded) {
      return
    }
    saveAccountsToStorage(accounts)
  }, [accounts, isAccountsLoaded])

  /**
   * Добавляет новый аккаунт
   */
  const addAccount = useCallback((account: CalendarAccount) => {
    setAccounts((prevAccounts) => {
      if (prevAccounts.some((a) => a.id === account.id || a.email === account.email)) {
        return prevAccounts
      }
      return [...prevAccounts, account]
    })
  }, [])

  /**
   * Обновляет существующий аккаунт
   */
  const updateAccount = useCallback((accountId: string, updates: Partial<CalendarAccount>) => {
    setAccounts((prevAccounts) =>
      prevAccounts.map((account) =>
        account.id === accountId ? { ...account, ...updates } : account
      )
    )
  }, [])

  /**
   * Удаляет аккаунт
   * Для Google аккаунтов также выполняет выход из Google Sign-In
   */
  const removeAccount = useCallback(async (accountId: string) => {
    const accountToRemove = accounts.find((account) => account.id === accountId)
    
    if (accountToRemove?.type === 'google') {
      try {
        await signOutGoogle()
      } catch (error) {
        console.warn('[useAccounts] Ошибка при выполнении signOut:', error)
      }
    }
    
    setAccounts((prevAccounts) => prevAccounts.filter((account) => account.id !== accountId))
  }, [accounts])

  /**
   * Инициирует процесс добавления Google аккаунта
   */
  const connectGoogleAccount = useCallback(async () => {
    const accountId = `google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    await initiateGoogleOAuth(accountId)
    // OAuth процесс перенаправит пользователя на Google авторизацию
    // После возврата callback будет обработан в CalendarApp
  }, [])

  /**
   * Обрабатывает OAuth callback для Google
   * Также обрабатывает результаты нативной авторизации для Android
   */
  const handleGoogleOAuthSuccess = useCallback(
    async (code: string, state: string) => {
      try {
        const result = await handleGoogleOAuthCallback(code, state)
        
        let accountId: string
        try {
          const stateData = JSON.parse(atob(state))
          accountId = stateData.accountId || `google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        } catch (e) {
          accountId = `google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }

        const tokenExpiry = Date.now() + (result.expiresIn * 1000)

        const newAccount: CalendarAccount = {
          id: accountId,
          type: 'google',
          email: result.userInfo.email,
          name: result.userInfo.name,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenExpiry,
          calendarId: 'primary',
          syncedAt: new Date(),
        }

        addAccount(newAccount)
        return newAccount
      } catch (error: any) {
        console.error('[useAccounts] Ошибка обработки OAuth:', error)
        throw error
      }
    },
    [addAccount]
  )

  /**
   * Синхронизирует события из Google Calendar для аккаунта
   * Автоматически запрашивает авторизацию через Google Sign In, если токен истек
   */
  const syncGoogleCalendarEvents = useCallback(
    async (
      account: CalendarAccount,
      timeMin: Date,
      timeMax: Date,
      existingEvents: Event[]
    ): Promise<Event[]> => {
      try {
        const googleEvents = await getGoogleCalendarEvents(
          account,
          timeMin,
          timeMax,
          (updatedAccount) => {
            updateAccount(account.id, {
              accessToken: updatedAccount.accessToken,
              refreshToken: updatedAccount.refreshToken,
              tokenExpiry: updatedAccount.tokenExpiry,
              name: updatedAccount.name,
            })
          }
        )

        const convertedEvents: Event[] = []
        for (const googleEvent of googleEvents) {
          try {
            const event = convertGoogleEventToEvent(
              googleEvent,
              account.id,
              [...existingEvents, ...convertedEvents]
            )
            convertedEvents.push(event)
          } catch (error) {
            console.warn('[useAccounts] Ошибка преобразования события:', error)
          }
        }

        updateAccount(account.id, {
          syncedAt: new Date(),
        })

        return convertedEvents
      } catch (error: any) {
        console.error('[useAccounts] Ошибка синхронизации:', error)
        throw error
      }
    },
    [updateAccount]
  )

  /**
   * Синхронизирует все подключенные аккаунты
   */
  const syncAllAccounts = useCallback(
    async (timeMin: Date, timeMax: Date, existingEvents: Event[]): Promise<Event[]> => {
      const allEvents: Event[] = []

      for (const account of accounts) {
        if (account.type === 'google' && account.accessToken) {
          try {
            const events = await syncGoogleCalendarEvents(account, timeMin, timeMax, [
              ...existingEvents,
              ...allEvents,
            ])
            allEvents.push(...events)
          } catch (error) {
            // Пропускаем аккаунты с ошибками синхронизации
          }
        }
      }

      return allEvents
    },
    [accounts, syncGoogleCalendarEvents]
  )

  return {
    accounts,
    isAccountsLoaded,
    addAccount,
    updateAccount,
    removeAccount,
    connectGoogleAccount,
    handleGoogleOAuthSuccess,
    syncGoogleCalendarEvents,
    syncAllAccounts,
  }
}
