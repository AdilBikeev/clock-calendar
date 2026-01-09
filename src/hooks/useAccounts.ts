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
    console.log('[useAccounts] Сохранение аккаунтов в localStorage:', {
      accountsCount: accounts.length,
      accounts: accounts.map(a => ({ id: a.id, email: a.email })),
    })
    saveAccountsToStorage(accounts)
  }, [accounts, isAccountsLoaded])

  /**
   * Добавляет новый аккаунт
   */
  const addAccount = useCallback((account: CalendarAccount) => {
    console.log('[useAccounts] addAccount вызван:', {
      accountId: account.id,
      email: account.email,
      hasAccessToken: !!account.accessToken,
    })
    
    setAccounts((prevAccounts) => {
      // Проверяем, нет ли уже такого аккаунта
      if (prevAccounts.some((a) => a.id === account.id || a.email === account.email)) {
        console.log('[useAccounts] Аккаунт уже существует, пропускаем добавление')
        return prevAccounts
      }
      
      const newAccounts = [...prevAccounts, account]
      console.log('[useAccounts] Аккаунт добавлен, новое количество аккаунтов:', newAccounts.length)
      return newAccounts
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
    // Находим аккаунт перед удалением
    const accountToRemove = accounts.find((account) => account.id === accountId)
    
    // Если это Google аккаунт, выходим из Google Sign-In
    if (accountToRemove?.type === 'google') {
      try {
        console.log('[useAccounts] Удаление Google аккаунта, выполнение signOut...')
        await signOutGoogle()
        console.log('[useAccounts] signOut выполнен успешно')
      } catch (error) {
        // Логируем ошибку, но не блокируем удаление аккаунта
        console.warn('[useAccounts] Ошибка при выполнении signOut (не критично):', error)
      }
    }
    
    // Удаляем аккаунт из списка
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
      const logSuccess = (message: string, data?: any) => {
        const timestamp = new Date().toISOString()
        console.log(`[OAuthSuccess ${timestamp}] ${message}`, data || '')
      }
      
      logSuccess('=== Обработка OAuth успешной авторизации ===', {
        hasCode: !!code,
        hasState: !!state,
        codePreview: code?.substring(0, 20),
      })
      
      try {
        const result = await handleGoogleOAuthCallback(code, state)
        
        logSuccess('OAuth callback обработан, получен результат:', {
          email: result.userInfo.email,
          hasAccessToken: !!result.accessToken,
          hasRefreshToken: !!result.refreshToken,
        })
        
        // Парсим state для получения accountId
        let accountId: string
        try {
          const stateData = JSON.parse(atob(state))
          accountId = stateData.accountId || `google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          
          // Если это нативная авторизация, используем специальный формат ID
          if (stateData.nativeAuth) {
            logSuccess('Обнаружена нативная авторизация')
          }
        } catch (e) {
          // Если state не парсится, создаем новый accountId
          accountId = `google-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          logSuccess('State не удалось распарсить, создан новый accountId')
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
          calendarId: 'primary', // По умолчанию используем primary календарь
          syncedAt: new Date(),
        }

        logSuccess('Создание нового аккаунта:', {
          accountId: newAccount.id,
          email: newAccount.email,
          hasAccessToken: !!newAccount.accessToken,
          hasRefreshToken: !!newAccount.refreshToken,
        })

        addAccount(newAccount)
        
        logSuccess('Аккаунт успешно добавлен')
        
        return newAccount
      } catch (error: any) {
        logSuccess('ОШИБКА обработки OAuth:', {
          message: error?.message,
          error: String(error),
          stack: error?.stack,
        })
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
      const logSync = (message: string, data?: any) => {
        const timestamp = new Date().toISOString()
        console.log(`[Sync ${timestamp}] ${message}`, data || '')
      }
      
      logSync('=== Начало синхронизации Google Calendar ===', {
        accountId: account.id,
        accountEmail: account.email,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
      })
      
      try {
        // Получаем события из Google Calendar
        // getGoogleCalendarEvents автоматически обработает авторизацию при необходимости
        // и вызовет onAccountUpdate, если токен был обновлен
        const googleEvents = await getGoogleCalendarEvents(
          account,
          timeMin,
          timeMax,
          (updatedAccount) => {
            logSync('Аккаунт обновлен с новым токеном', {
              hasAccessToken: !!updatedAccount.accessToken,
              hasRefreshToken: !!updatedAccount.refreshToken,
              tokenExpiry: updatedAccount.tokenExpiry,
            })
            
            // Обновляем аккаунт с новым токеном
            updateAccount(account.id, {
              accessToken: updatedAccount.accessToken,
              refreshToken: updatedAccount.refreshToken,
              tokenExpiry: updatedAccount.tokenExpiry,
              name: updatedAccount.name,
            })
          }
        )
        
        logSync('События получены из Google Calendar', {
          eventsCount: googleEvents.length,
        })

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
            logSync('Ошибка преобразования события (пропущено)', {
              eventId: googleEvent.id,
              error: String(error),
            })
          }
        }

        logSync('События преобразованы', {
          convertedCount: convertedEvents.length,
        })

        // Обновляем время последней синхронизации
        updateAccount(account.id, {
          syncedAt: new Date(),
        })

        logSync('Синхронизация завершена успешно', {
          totalEvents: convertedEvents.length,
        })

        return convertedEvents
      } catch (error: any) {
        logSync('ОШИБКА синхронизации', {
          message: error?.message,
          error: String(error),
          stack: error?.stack,
        })
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
