/**
 * Сервис для работы с Google Sign In через нативный Capacitor плагин
 * Используется для нативной авторизации при синхронизации событий
 * Не требует redirect_uri, использует нативную авторизацию через Google Play Services
 */

import { Capacitor } from '@capacitor/core'
import { CalendarAccount } from '../types/account'
import { GoogleSignIn } from '../plugins/GoogleSignIn'

// Проверка доступности нативного Google Sign In
// Доступен только на Android/iOS, не на веб
const isGoogleSignInAvailable = (): boolean => {
  return Capacitor.isNativePlatform()
}

// Получаем Google Client ID в зависимости от платформы
const getGoogleClientId = (): string => {
  if (Capacitor.getPlatform() === 'android') {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID_ANDROID || import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  }
  if (Capacitor.getPlatform() === 'ios') {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID_IOS || import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  }
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
}

// ВАЖНО: Для webClientId в нативной авторизации Google требуется Web OAuth Client ID
// Это НЕ Android OAuth Client ID!
const getWebClientId = (): string => {
  // Всегда используем Web OAuth Client ID для webClientId
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
}

const GOOGLE_CLIENT_ID = getGoogleClientId()
const WEB_CLIENT_ID = getWebClientId()

/**
 * Инициализирует Google Sign In
 * Должна быть вызвана один раз при запуске приложения
 */
export const configureGoogleSignIn = async (): Promise<void> => {
  if (!isGoogleSignInAvailable()) {
    return
  }

  if (!WEB_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID не настроен. Создайте OAuth client типа "Web application" в Google Cloud Console.')
  }
  
  const config = {
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  }

  try {
    await GoogleSignIn.configure(config)
  } catch (error: any) {
    console.error('[GoogleSignIn] Ошибка настройки:', error)
    throw error
  }
}

/**
 * Проверяет, доступен ли Google Sign In
 */
export { isGoogleSignInAvailable }

/**
 * Проверяет, авторизован ли пользователь
 */
export const isSignedIn = async (): Promise<boolean> => {
  if (!isGoogleSignInAvailable()) {
    return false
  }

  try {
    const result = await GoogleSignIn.isSignedIn()
    return result.isSignedIn
  } catch (error) {
    console.error('Ошибка проверки статуса авторизации:', error)
    return false
  }
}

/**
 * Выполняет авторизацию через Google Sign In
 * Возвращает токены и информацию о пользователе
 * НЕ требует redirect_uri - использует нативную авторизацию
 */
export const signInWithGoogle = async (): Promise<{
  accessToken: string
  refreshToken?: string
  idToken?: string
  userInfo: {
    email: string
    name: string
    picture?: string
  }
}> => {
  if (!isGoogleSignInAvailable()) {
    throw new Error('Google Sign In недоступен. Используйте веб-авторизацию.')
  }

  try {
    const signedInResult = await GoogleSignIn.isSignedIn()
    let userInfo: any

    if (signedInResult.isSignedIn) {
      userInfo = await GoogleSignIn.getCurrentUser()
    } else {
      await GoogleSignIn.hasPlayServices()
      userInfo = await GoogleSignIn.signIn()
    }

    if (!userInfo) {
      throw new Error('Не удалось получить информацию о пользователе')
    }

    const tokens = await GoogleSignIn.getTokens()

    return {
      accessToken: tokens.accessToken,
      refreshToken: userInfo.serverAuthCode,
      idToken: tokens.idToken || userInfo.idToken,
      userInfo: {
        email: userInfo.user.email,
        name: userInfo.user.name || 'Пользователь',
        picture: userInfo.user.photo,
      },
    }
  } catch (error: any) {
    if (error.code === 'SIGN_IN_CANCELLED') {
      throw new Error('Авторизация отменена пользователем')
    } else if (error.code === 'IN_PROGRESS') {
      throw new Error('Авторизация уже выполняется')
    } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      throw new Error('Google Play Services недоступны')
    }
    throw new Error(`Ошибка авторизации: ${error.message || String(error)}`)
  }
}

/**
 * Обновляет access token используя refresh token
 */
export const refreshGoogleToken = async (refreshToken: string): Promise<{
  accessToken: string
  expiresIn: number
}> => {
  if (!isGoogleSignInAvailable()) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error || response.statusText}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }

  try {
    const tokens = await GoogleSignIn.getTokens()
    return {
      accessToken: tokens.accessToken,
      expiresIn: 3600,
    }
  } catch (error: any) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error || response.statusText}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }
}

/**
 * Авторизует пользователя при синхронизации, если токен истек или отсутствует
 * Возвращает обновленный аккаунт с валидным токеном
 */
export const ensureGoogleAuthForSync = async (
  account: CalendarAccount
): Promise<CalendarAccount> => {
  const needsAuth =
    !account.accessToken ||
    (account.tokenExpiry && account.tokenExpiry < Date.now())

  if (!needsAuth) {
    return account
  }

  if (account.refreshToken) {
    try {
      const tokenData = await refreshGoogleToken(account.refreshToken)
      const newTokenExpiry = Date.now() + (tokenData.expiresIn * 1000)
      return {
        ...account,
        accessToken: tokenData.accessToken,
        tokenExpiry: newTokenExpiry,
      }
    } catch (error) {
      // Продолжаем к авторизации
    }
  }

  if (isGoogleSignInAvailable()) {
    try {
      const signInResult = await signInWithGoogle()

      if (signInResult.userInfo.email !== account.email) {
        throw new Error(
          `Email не совпадает. Ожидался: ${account.email}, получен: ${signInResult.userInfo.email}`
        )
      }

      const tokenExpiry = Date.now() + 3600000

      return {
        ...account,
        accessToken: signInResult.accessToken,
        refreshToken: signInResult.refreshToken || account.refreshToken,
        tokenExpiry,
        name: signInResult.userInfo.name || account.name,
      }
    } catch (error) {
      console.error('[GoogleSignIn] Ошибка авторизации:', error)
      throw error
    }
  }

  throw new Error('Токен истек и требуется повторная авторизация. Пожалуйста, переподключите аккаунт Google.')
}

/**
 * Выход из Google аккаунта
 */
export const signOut = async (): Promise<void> => {
  if (!isGoogleSignInAvailable()) {
    return
  }

  try {
    await GoogleSignIn.signOut()
  } catch (error) {
    console.error('Ошибка выхода из Google:', error)
    throw error
  }
}
