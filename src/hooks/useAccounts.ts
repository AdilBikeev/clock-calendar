import { useState, useEffect, useCallback } from 'react'
import { CalendarAccount } from '../types/account'
import { loadAccountsFromStorage, saveAccountsToStorage } from '../services/accountStorageService'
import { initiateGoogleOAuth, handleGoogleOAuthCallback, getGoogleCalendarEvents, refreshAccessToken, convertGoogleEventToEvent } from '../services/googleCalendarService'
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
      // Проверяем, нет ли уже такого аккаунта
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
   */
  const removeAccount = useCallback((accountId: string) => {
    setAccounts((prevAccounts) => prevAccounts.filter((account) => account.id !== accountId))
  }, [])

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
   */
  const handleGoogleOAuthSuccess = useCallback(
    async (code: string, state: string) => {
      try {
        const result = await handleGoogleOAuthCallback(code, state)
        
        // Парсим state для получения accountId
        const stateData = JSON.parse(atob(state))
        const accountId = stateData.accountId || `google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const tokenExpiry = Date.now() + (result.expiresIn * 1000)

        const newAccount: CalendarAccount = {
          id: accountId,
          type: 'google',
          email: result.userInfo.email,
          name: result.userInfo.name,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenExpiry,
          calendarId: 'primary', // По умолчанию используем primary календарь
          syncedAt: new Date(),
        }

        addAccount(newAccount)
        return newAccount
      } catch (error) {
        throw error
      }
    },
    [addAccount]
  )

  /**
   * Синхронизирует события из Google Calendar для аккаунта
   */
  const syncGoogleCalendarEvents = useCallback(
    async (
      account: CalendarAccount,
      timeMin: Date,
      timeMax: Date,
      existingEvents: Event[]
    ): Promise<Event[]> => {
      try {
        // Проверяем и обновляем токен если нужно
        let accessToken = account.accessToken
        if (account.tokenExpiry && account.tokenExpiry < Date.now() && account.refreshToken) {
          try {
            const tokenData = await refreshAccessToken(account.refreshToken)
            accessToken = tokenData.access_token
            const newTokenExpiry = Date.now() + (tokenData.expires_in * 1000)
            updateAccount(account.id, {
              accessToken,
              tokenExpiry: newTokenExpiry,
            })
          } catch (error) {
            throw new Error('Token refresh failed')
          }
        }

        if (!accessToken) {
          throw new Error('No access token available')
        }

        // Обновляем account с актуальным токеном
        const accountWithToken = { ...account, accessToken }

        // Получаем события из Google Calendar
        const googleEvents = await getGoogleCalendarEvents(accountWithToken, timeMin, timeMax)

        // Преобразуем Google события в наш формат
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
            // Пропускаем события, которые не удалось преобразовать
          }
        }

        // Обновляем время последней синхронизации
        updateAccount(account.id, {
          syncedAt: new Date(),
        })

        return convertedEvents
      } catch (error) {
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
