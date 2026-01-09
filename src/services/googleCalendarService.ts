/**
 * Сервис для работы с Google Calendar API
 */

import { CalendarAccount, GoogleCalendarEvent } from '../types/account'
import { Event } from '../types/event'
import { getAvailableColor } from '../utils/eventUtils'
import { generatePKCEPair } from '../utils/pkceUtils'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { ensureGoogleAuthForSync } from './googleSignInService'

// Google OAuth 2.0 Configuration
// Для нативных мобильных приложений используйте нативные OAuth clients (Android/iOS)
// Они не требуют redirect URI и используют package name/Bundle ID + SHA-1 fingerprint
// Для веб-версии используйте Web OAuth client
const getGoogleClientId = (): string => {
  // Для Android используем Android OAuth client (не требует redirect URI)
  if (Capacitor.getPlatform() === 'android') {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID_ANDROID || import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  }
  // Для iOS используем iOS OAuth client (не требует redirect URI)
  if (Capacitor.getPlatform() === 'ios') {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID_IOS || import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  }
  // Для веб-версии используем Web OAuth client
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
}

const GOOGLE_CLIENT_ID = getGoogleClientId()
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '' // Только для Web/Desktop app

const getRedirectUri = (): string => {
  if (import.meta.env.VITE_GOOGLE_REDIRECT_URI) {
    return import.meta.env.VITE_GOOGLE_REDIRECT_URI
  }

  if (Capacitor.getPlatform() === 'android') {
    return import.meta.env.VITE_MOBILE_REDIRECT_URI || 'com.clockcalendar.app://oauth/google/callback'
  }

  if (Capacitor.getPlatform() === 'ios') {
    return import.meta.env.VITE_MOBILE_REDIRECT_URI || 'com.clockcalendar.app://oauth/google/callback'
  }

  return `${window.location.origin}/oauth/google/callback`
}

const GOOGLE_REDIRECT_URI = getRedirectUri()
// Scopes: календарь + профиль пользователя (для получения email и имени)
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

/**
 * Получает URL для авторизации Google с поддержкой PKCE
 */
export const getGoogleAuthUrl = (state: string, codeChallenge: string): string => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

/**
 * Обменивает код авторизации на токены используя PKCE
 * 
 * PKCE позволяет безопасно выполнять OAuth 2.0 без client_secret,
 * что идеально подходит для клиентских приложений.
 * Требует OAuth client типа "Desktop app" в Google Cloud Console.
 */
export const exchangeCodeForTokens = async (
  code: string,
  codeVerifier: string
): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}> => {
  // Проверяем, что client_id настроен
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      'GOOGLE_CLIENT_ID не настроен в .env файле. ' +
      'Пожалуйста, создайте OAuth client типа "Desktop app" в Google Cloud Console и укажите Client ID в .env файле.'
    )
  }

  // Прямой обмен через PKCE
  // Для Desktop app в браузере Google может требовать client_secret
  // Если client_secret указан, добавляем его; иначе используем только PKCE
  const tokenParams: Record<string, string> = {
    client_id: GOOGLE_CLIENT_ID,
    code,
    grant_type: 'authorization_code',
    redirect_uri: GOOGLE_REDIRECT_URI,
    code_verifier: codeVerifier,
  }

  // Добавляем client_secret если он указан (может потребоваться для Desktop app в браузере)
  if (GOOGLE_CLIENT_SECRET) {
    tokenParams.client_secret = GOOGLE_CLIENT_SECRET
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(tokenParams),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    const errorMessage = errorData.error_description || errorData.error || 'Unknown error'
    const errorDetails = JSON.stringify(errorData, null, 2)
    
    // Проверяем различные типы ошибок
    if (errorMessage.includes('client_secret')) {
      if (!GOOGLE_CLIENT_SECRET) {
        throw new Error(
          `Ошибка обмена токенов: ${errorMessage}\n\n` +
          `Проблема: Google требует client_secret для этого OAuth client.\n\n` +
          `Решение для Desktop app:\n` +
          `1. Откройте Google Cloud Console → APIs & Services → Credentials\n` +
          `2. Найдите ваш OAuth client (Desktop app или Web application)\n` +
          `3. Скопируйте Client Secret\n` +
          `4. Добавьте в .env файл:\n` +
          `   GOOGLE_CLIENT_SECRET=ваш_client_secret_здесь\n` +
          `5. Перезапустите сервер разработки (npm run dev)\n\n` +
          `⚠️ ВНИМАНИЕ: Client Secret будет виден в клиентском коде (небезопасно для продакшена).\n` +
          `Для продакшена рекомендуется использовать серверный прокси.\n\n` +
          `Подробности ошибки: ${errorDetails}`
        )
      } else {
        throw new Error(
          `Ошибка обмена токенов: ${errorMessage}\n\n` +
          `Client secret указан, но ошибка сохраняется. Возможные причины:\n` +
          `- Неправильный client_secret\n` +
          `- Client ID и Client Secret не совпадают (от разных OAuth clients)\n` +
          `- OAuth client удален или деактивирован\n\n` +
          `Подробности ошибки: ${errorDetails}`
        )
      }
    }
    
    if (errorMessage.includes('invalid_grant') || errorMessage.includes('code')) {
      throw new Error(
        `Ошибка обмена токенов: ${errorMessage}\n\n` +
        `Возможные причины:\n` +
        `- Код авторизации уже использован или истек\n` +
        `- Redirect URI не совпадает с указанным при авторизации\n` +
        `- Неправильный code_verifier\n\n` +
        `Подробности: ${errorDetails}`
      )
    }
    
    if (errorMessage.includes('redirect_uri_mismatch')) {
      throw new Error(
        `Ошибка обмена токенов: Redirect URI не совпадает\n\n` +
        `Используемый redirect URI: ${GOOGLE_REDIRECT_URI}\n\n` +
        `Решение:\n` +
        `- Для Desktop app типа можно указать ${window.location.origin} или оставить пустым\n` +
        `- Убедитесь, что redirect URI в коде совпадает с тем, что был использован при авторизации\n\n` +
        `Подробности: ${errorDetails}`
      )
    }
    
    throw new Error(`Ошибка обмена токенов: ${errorMessage}\n\nПодробности: ${errorDetails}`)
  }

  return response.json()
}

/**
 * Обновляет access token используя refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<{
  access_token: string
  expires_in: number
  token_type: string
}> => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
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
    const error = await response.json()
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`)
  }

  return response.json()
}

/**
 * Получает информацию о пользователе
 */
export const getUserInfo = async (accessToken: string): Promise<{
  email: string
  name: string
  picture?: string
}> => {
  if (!accessToken) {
    throw new Error('Access token is missing')
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    const errorMessage = errorData.error_description || errorData.error || 'Unknown error'
    const errorDetails = JSON.stringify(errorData, null, 2)

    if (response.status === 401) {
      throw new Error(
        `Ошибка получения информации о пользователе: Unauthorized (401)\n\n` +
        `Возможные причины:\n` +
        `- Access token недействителен или истек\n` +
        `- Вы подтвердили безопасность Google после получения кода авторизации\n` +
        `- Недостаточно прав (scopes) у токена\n\n` +
        `Решение:\n` +
        `1. Закройте текущее окно авторизации\n` +
        `2. Попробуйте подключить аккаунт заново (полный процесс OAuth)\n` +
        `3. После подтверждения безопасности Google дождитесь завершения процесса авторизации\n\n` +
        `Подробности: ${errorDetails}`
      )
    }

    throw new Error(`Failed to fetch user info: ${errorMessage}\n\nПодробности: ${errorDetails}`)
  }

  return response.json()
}

/**
 * Получает список календарей пользователя
 */
export const getCalendarList = async (accessToken: string): Promise<Array<{
  id: string
  summary: string
  primary?: boolean
}>> => {
  const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch calendar list')
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Получает события из Google Calendar
 * Автоматически запрашивает авторизацию через Google Sign In, если токен истек
 */
export const getGoogleCalendarEvents = async (
  account: CalendarAccount,
  timeMin: Date,
  timeMax: Date,
  onAccountUpdate?: (updatedAccount: CalendarAccount) => void
): Promise<GoogleCalendarEvent[]> => {
  let authenticatedAccount = account
  try {
    authenticatedAccount = await ensureGoogleAuthForSync(account)
    
    if (onAccountUpdate && authenticatedAccount !== account) {
      onAccountUpdate(authenticatedAccount)
    }
  } catch (error: any) {
    if (!account.accessToken) {
      throw new Error('No access token available and authorization failed')
    }

    if (account.tokenExpiry && account.tokenExpiry < Date.now() && account.refreshToken) {
      try {
        const tokenData = await refreshAccessToken(account.refreshToken)
        authenticatedAccount = {
          ...account,
          accessToken: tokenData.access_token,
          tokenExpiry: Date.now() + (tokenData.expires_in * 1000),
        }
        
        if (onAccountUpdate) {
          onAccountUpdate(authenticatedAccount)
        }
      } catch (refreshError: any) {
        console.error('[GoogleCalendar] Ошибка обновления токена:', refreshError)
        throw new Error('Token refresh failed and authorization required')
      }
    }
  }

  if (!authenticatedAccount.accessToken) {
    throw new Error('No access token available')
  }

  const calendarId = account.calendarId || 'primary'
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
  })

  const apiUrl = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${authenticatedAccount.accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData: any = {}
    try {
      errorData = JSON.parse(errorText)
    } catch (e) {
      errorData = { raw: errorText }
    }
    
    if (response.status === 401) {
      throw new Error('Unauthorized - token may be expired')
    }
    if (response.status === 400) {
      throw new Error(`Bad Request: ${errorData.error?.message || errorData.error || response.statusText}`)
    }
    throw new Error(`Failed to fetch events: ${response.statusText} (${response.status})`)
  }

  const data = await response.json()
  return data.items || []
}

/**
 * Преобразует Google Calendar событие в наш формат Event
 */
export const convertGoogleEventToEvent = (
  googleEvent: GoogleCalendarEvent,
  accountId: string,
  existingEvents: Event[]
): Event => {
  const startDate = googleEvent.start.dateTime
    ? new Date(googleEvent.start.dateTime)
    : new Date(googleEvent.start.date || '')
  
  const endDate = googleEvent.end.dateTime
    ? new Date(googleEvent.end.dateTime)
    : new Date(googleEvent.end.date || '')

  const allDay = !googleEvent.start.dateTime && !!googleEvent.start.date
  const eventId = `google-${accountId}-${googleEvent.id}`
  const color = getAvailableColor(existingEvents, startDate)

  return {
    id: eventId,
    title: googleEvent.summary || 'Без названия',
    startDate,
    endDate,
    allDay,
    description: googleEvent.description,
    color,
  }
}

export const initiateGoogleOAuth = async (accountId: string): Promise<void> => {
  if (Capacitor.getPlatform() === 'android') {
    try {
      const { isGoogleSignInAvailable, signInWithGoogle } = await import('./googleSignInService')
      
      if (isGoogleSignInAvailable()) {
        const result = await signInWithGoogle()
        
        const state = btoa(JSON.stringify({ accountId, timestamp: Date.now(), nativeAuth: true }))
        sessionStorage.setItem('oauth_state', state)
        sessionStorage.setItem('oauth_native_result', JSON.stringify({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          idToken: result.idToken,
          userInfo: result.userInfo,
          expiresIn: 3600,
        }))
        
        window.dispatchEvent(new CustomEvent('google-native-auth-success', {
          detail: { state, result: { ...result, expiresIn: 3600 } }
        }))
        
        await new Promise(resolve => setTimeout(resolve, 100))
        return
      }
    } catch (error: any) {
      console.error('[OAuth] Ошибка нативной авторизации:', error)
    }
  }
  
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID не настроен в .env файле.')
  }

  const { codeVerifier, codeChallenge } = await generatePKCEPair()
  const state = btoa(JSON.stringify({ accountId, timestamp: Date.now() }))
  sessionStorage.setItem('oauth_state', state)
  sessionStorage.setItem('oauth_code_verifier', codeVerifier)
  
  const authUrl = getGoogleAuthUrl(state, codeChallenge)
  
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({
        url: authUrl,
        presentationStyle: 'popover',
        windowName: '_self'
      })
    } catch (error) {
      throw new Error(`Не удалось открыть окно авторизации: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    window.location.href = authUrl
  }
}

export const handleGoogleOAuthCallback = async (code: string, state: string): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn: number
  userInfo: { email: string; name: string }
}> => {
  const savedState = sessionStorage.getItem('oauth_state')
  if (!savedState || savedState !== state) {
    throw new Error('Invalid OAuth state')
  }

  try {
    const stateData = JSON.parse(atob(state))
    if (stateData.nativeAuth) {
      const nativeResultStr = sessionStorage.getItem('oauth_native_result')
      if (nativeResultStr) {
        const nativeResult = JSON.parse(nativeResultStr)
        sessionStorage.removeItem('oauth_state')
        sessionStorage.removeItem('oauth_native_result')
        
        return {
          accessToken: nativeResult.accessToken,
          refreshToken: nativeResult.refreshToken,
          expiresIn: 3600,
          userInfo: nativeResult.userInfo,
        }
      }
    }
  } catch (e) {
    // Не нативная авторизация, продолжаем стандартный flow
  }

  const codeVerifier = sessionStorage.getItem('oauth_code_verifier')
  if (!codeVerifier) {
    throw new Error('Code verifier not found. OAuth flow may have been interrupted.')
  }
  
  const tokenData = await exchangeCodeForTokens(code, codeVerifier)
  
  if (!tokenData.access_token) {
    throw new Error('Access token не получен от Google. Проверьте настройки OAuth client.')
  }
  
  const userInfo = await getUserInfo(tokenData.access_token)

  sessionStorage.removeItem('oauth_state')
  sessionStorage.removeItem('oauth_code_verifier')

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    userInfo,
  }
}
