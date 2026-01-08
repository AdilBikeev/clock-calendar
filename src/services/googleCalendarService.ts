/**
 * Сервис для работы с Google Calendar API
 */

import { CalendarAccount, GoogleCalendarEvent } from '../types/account'
import { Event } from '../types/event'
import { getAvailableColor } from '../utils/eventUtils'
import { generatePKCEPair } from '../utils/pkceUtils'

// Google OAuth 2.0 Configuration
// Эти значения нужно будет настроить в Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '' // Опционально: для Desktop app может потребоваться
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/oauth/google/callback`
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
    code_challenge_method: 'S256', // SHA256
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
      'VITE_GOOGLE_CLIENT_ID не настроен в .env файле. ' +
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
          `   VITE_GOOGLE_CLIENT_SECRET=ваш_client_secret_здесь\n` +
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
 */
export const getGoogleCalendarEvents = async (
  account: CalendarAccount,
  timeMin: Date,
  timeMax: Date
): Promise<GoogleCalendarEvent[]> => {
  if (!account.accessToken) {
    throw new Error('No access token available')
  }

  // Проверяем и обновляем токен если нужно
  let accessToken = account.accessToken
  if (account.tokenExpiry && account.tokenExpiry < Date.now() && account.refreshToken) {
    try {
      const tokenData = await refreshAccessToken(account.refreshToken)
      accessToken = tokenData.access_token
      // Сохраняем обновленный токен - это должно быть обработано в useAccounts
    } catch (error) {
      throw new Error('Token refresh failed')
    }
  }

  const calendarId = account.calendarId || 'primary'
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
  })

  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized - token may be expired')
    }
    throw new Error(`Failed to fetch events: ${response.statusText}`)
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
  // Определяем начало и конец события
  const startDate = googleEvent.start.dateTime
    ? new Date(googleEvent.start.dateTime)
    : new Date(googleEvent.start.date || '')
  
  const endDate = googleEvent.end.dateTime
    ? new Date(googleEvent.end.dateTime)
    : new Date(googleEvent.end.date || '')

  // Определяем, является ли событие полноценным днем
  const allDay = !googleEvent.start.dateTime && !!googleEvent.start.date

  // Создаем уникальный ID на основе Google Calendar ID и account ID
  const eventId = `google-${accountId}-${googleEvent.id}`

  // Получаем цвет (используем startDate как defaultDate)
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

/**
 * Инициализирует OAuth процесс для Google с использованием PKCE
 */
export const initiateGoogleOAuth = async (accountId: string): Promise<void> => {
  // Проверяем, что client_id настроен
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID не настроен в .env файле. ' +
      'Пожалуйста, создайте OAuth client типа "Desktop app" в Google Cloud Console и укажите Client ID в .env файле.'
    )
  }

  // Генерируем PKCE пару
  const { codeVerifier, codeChallenge } = await generatePKCEPair()
  
  // Создаем state для защиты от CSRF
  const state = btoa(JSON.stringify({ accountId, timestamp: Date.now() }))
  
  // Сохраняем code_verifier и state в sessionStorage
  // code_verifier понадобится при обмене кода на токены
  sessionStorage.setItem('oauth_state', state)
  sessionStorage.setItem('oauth_code_verifier', codeVerifier)
  
  // Формируем URL авторизации с code_challenge
  const authUrl = getGoogleAuthUrl(state, codeChallenge)
  
  // Перенаправляем пользователя на страницу авторизации Google
  window.location.href = authUrl
}

/**
 * Обрабатывает OAuth callback с поддержкой PKCE
 */
export const handleGoogleOAuthCallback = async (code: string, state: string): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn: number
  userInfo: { email: string; name: string }
}> => {
  // Проверяем state (защита от CSRF)
  const savedState = sessionStorage.getItem('oauth_state')
  if (!savedState || savedState !== state) {
    throw new Error('Invalid OAuth state')
  }

  // Получаем code_verifier из sessionStorage
  const codeVerifier = sessionStorage.getItem('oauth_code_verifier')
  if (!codeVerifier) {
    throw new Error('Code verifier not found. OAuth flow may have been interrupted.')
  }

  // Обмениваем код на токены используя code_verifier (PKCE)
  const tokenData = await exchangeCodeForTokens(code, codeVerifier)
  
  // Проверяем, что токен получен
  if (!tokenData.access_token) {
    throw new Error('Access token не получен от Google. Проверьте настройки OAuth client.')
  }
  
  // Получаем информацию о пользователе
  const userInfo = await getUserInfo(tokenData.access_token)

  // Очищаем временные данные из sessionStorage
  sessionStorage.removeItem('oauth_state')
  sessionStorage.removeItem('oauth_code_verifier')

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    userInfo,
  }
}
