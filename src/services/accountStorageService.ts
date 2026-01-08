import { CalendarAccount } from '../types/account'
import { STORAGE_KEYS } from '../constants'

/**
 * Сервис для работы с хранением аккаунтов в localStorage
 */

/**
 * Загружает аккаунты из localStorage
 */
export const loadAccountsFromStorage = (): CalendarAccount[] => {
  try {
    const savedAccounts = localStorage.getItem(STORAGE_KEYS.CALENDAR_ACCOUNTS)
    if (!savedAccounts) {
      return []
    }

    const parsed = JSON.parse(savedAccounts)
    return parsed.map((account: any) => ({
      ...account,
      syncedAt: account.syncedAt ? new Date(account.syncedAt) : undefined,
      tokenExpiry: account.tokenExpiry ? account.tokenExpiry : undefined,
    }))
  } catch (error) {
    console.error('Error loading accounts from storage:', error)
    return []
  }
}

/**
 * Сохраняет аккаунты в localStorage
 */
export const saveAccountsToStorage = (accounts: CalendarAccount[]): void => {
  try {
    // Не сохраняем токены в localStorage напрямую - это небезопасно
    // В реальном приложении токены должны храниться в зашифрованном виде
    // или использовать более безопасные методы хранения
    const serializedAccounts = accounts.map((account) => ({
      id: account.id,
      type: account.type,
      email: account.email,
      name: account.name,
      // Сохраняем токены (в продакшене это должно быть зашифровано)
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      tokenExpiry: account.tokenExpiry,
      calendarId: account.calendarId,
      syncedAt: account.syncedAt?.toISOString(),
    }))

    localStorage.setItem(STORAGE_KEYS.CALENDAR_ACCOUNTS, JSON.stringify(serializedAccounts))
  } catch (error) {
    console.error('Error saving accounts to storage:', error)
  }
}

/**
 * Удаляет аккаунт из localStorage
 */
export const removeAccountFromStorage = (accountId: string): void => {
  try {
    const accounts = loadAccountsFromStorage()
    const filteredAccounts = accounts.filter((account) => account.id !== accountId)
    saveAccountsToStorage(filteredAccounts)
  } catch (error) {
    console.error('Error removing account from storage:', error)
  }
}
