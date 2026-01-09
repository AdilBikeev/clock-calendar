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

// Логируем для отладки (только первые символы для безопасности)
if (GOOGLE_CLIENT_SECRET) {
  console.log('GOOGLE_CLIENT_SECRET установлен:', GOOGLE_CLIENT_SECRET.substring(0, 5) + '...')
} else {
  console.warn('GOOGLE_CLIENT_SECRET не установлен. Google может требовать его для Desktop app OAuth client.')
}
// Определяем правильный redirect URI в зависимости от платформы
// ВАЖНО: Google блокирует localhost/127.0.0.1 (loopback flow)
// Для Android используем кастомную схему URL через deep links
const getRedirectUri = (): string => {
  // Если указан явный redirect URI в переменных окружения, используем его
  if (import.meta.env.VITE_GOOGLE_REDIRECT_URI) {
    return import.meta.env.VITE_GOOGLE_REDIRECT_URI
  }

  // Для Android используем кастомную схему URL
  // Это работает через deep links и не требует localhost
  if (Capacitor.getPlatform() === 'android') {
    // Используем кастомную схему: com.clockcalendar.app://oauth/google/callback
    // Это должно быть зарегистрировано в Google Cloud Console как Authorized redirect URI
    // для Web OAuth Client (не Android Client!)
    const androidRedirectUri = import.meta.env.VITE_MOBILE_REDIRECT_URI || 'com.clockcalendar.app://oauth/google/callback'
    console.log('[OAuth] Android redirect URI:', androidRedirectUri)
    return androidRedirectUri
  }

  // Для iOS также можно использовать кастомную схему
  if (Capacitor.getPlatform() === 'ios') {
    const iosRedirectUri = import.meta.env.VITE_MOBILE_REDIRECT_URI || 'com.clockcalendar.app://oauth/google/callback'
    console.log('[OAuth] iOS redirect URI:', iosRedirectUri)
    return iosRedirectUri
  }

  // Для веб-приложения используем стандартный URL
  // ВАЖНО: Не используйте localhost! Используйте публичный URL
  const webRedirectUri = `${window.location.origin}/oauth/google/callback`
  console.log('[OAuth] Web redirect URI:', webRedirectUri)
  
  // Предупреждение, если используется localhost
  if (webRedirectUri.includes('localhost') || webRedirectUri.includes('127.0.0.1')) {
    console.warn('[OAuth] ВНИМАНИЕ: Используется localhost redirect URI. Google может блокировать это. Используйте публичный URL или кастомную схему для мобильных приложений.')
  }
  
  return webRedirectUri
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
  // Логируем redirect URI для диагностики
  console.log('Building OAuth URL with redirect URI:', GOOGLE_REDIRECT_URI)
  
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

  const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`
  console.log('Full OAuth URL (first 200 chars):', authUrl.substring(0, 200))
  
  return authUrl
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
 * Логирует информацию для Android (видно в logcat)
 */
const logAndroid = (message: string, data?: any) => {
  const platform = Capacitor.getPlatform()
  const timestamp = new Date().toISOString()
  const logMessage = `[GoogleCalendar ${timestamp}] ${message}`
  
  console.log(logMessage, data || '')
  
  // Для Android также выводим в консоль с тегом для фильтрации в logcat
  if (platform === 'android' && typeof console !== 'undefined') {
    console.log(`[GoogleCalendar] ${message}`, JSON.stringify(data || {}, null, 2))
  }
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
  logAndroid('=== Получение событий из Google Calendar ===')
  logAndroid('Параметры запроса:', {
    accountId: account.id,
    accountEmail: account.email,
    calendarId: account.calendarId || 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
  })
  
  // Проверяем и обновляем авторизацию при необходимости
  // Это может запросить нативную авторизацию через Google Sign In
  let authenticatedAccount = account
  try {
    logAndroid('Проверка и обновление авторизации...')
    authenticatedAccount = await ensureGoogleAuthForSync(account)
    
    // Если аккаунт был обновлен (получен новый токен), уведомляем об этом
    if (onAccountUpdate && authenticatedAccount !== account) {
      logAndroid('Аккаунт обновлен, уведомление об обновлении...')
      onAccountUpdate(authenticatedAccount)
    }
  } catch (error: any) {
    logAndroid('Ошибка авторизации через Google Sign In, попытка fallback:', {
      message: error?.message,
      error: String(error),
    })
    
    // Если не удалось авторизоваться через Google Sign In,
    // пытаемся использовать стандартный refresh token подход
    if (!account.accessToken) {
      logAndroid('ОШИБКА: Нет access token и авторизация не удалась')
      throw new Error('No access token available and authorization failed')
    }

    // Проверяем и обновляем токен если нужно (стандартный подход)
    if (account.tokenExpiry && account.tokenExpiry < Date.now() && account.refreshToken) {
      logAndroid('Попытка обновления токена через стандартный API...')
      try {
        const tokenData = await refreshAccessToken(account.refreshToken)
        authenticatedAccount = {
          ...account,
          accessToken: tokenData.access_token,
          tokenExpiry: Date.now() + (tokenData.expires_in * 1000),
        }
        
        logAndroid('Токен обновлен через стандартный API')
        
        // Уведомляем об обновлении токена
        if (onAccountUpdate) {
          onAccountUpdate(authenticatedAccount)
        }
      } catch (refreshError: any) {
        logAndroid('ОШИБКА обновления токена:', {
          message: refreshError?.message,
          error: String(refreshError),
        })
        throw new Error('Token refresh failed and authorization required')
      }
    }
  }

  if (!authenticatedAccount.accessToken) {
    logAndroid('ОШИБКА: Нет access token после всех попыток авторизации')
    throw new Error('No access token available')
  }

  const accessToken = authenticatedAccount.accessToken
  logAndroid('Access token получен:', {
    tokenLength: accessToken.length,
    tokenPreview: `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}`,
  })

  const calendarId = account.calendarId || 'primary'
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
  })

  const apiUrl = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  
  logAndroid('Запрос к Google Calendar API:', {
    url: apiUrl,
    method: 'GET',
    calendarId,
    params: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
    },
    hasAuthHeader: true,
  })

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  logAndroid('Ответ от Google Calendar API:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorData: any = {}
    try {
      errorData = JSON.parse(errorText)
    } catch (e) {
      errorData = { raw: errorText }
    }
    
    logAndroid('ОШИБКА запроса к Google Calendar API:', {
      status: response.status,
      statusText: response.statusText,
      error: errorData,
      errorText,
      url: apiUrl,
    })
    
    if (response.status === 401) {
      throw new Error('Unauthorized - token may be expired')
    }
    if (response.status === 400) {
      throw new Error(`Bad Request: ${errorData.error?.message || errorData.error || response.statusText}`)
    }
    throw new Error(`Failed to fetch events: ${response.statusText} (${response.status})`)
  }

  const data = await response.json()
  logAndroid('События успешно получены:', {
    itemsCount: data.items?.length || 0,
    hasItems: !!data.items,
  })
  
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
 * ВАЖНО: Для Android использует нативную авторизацию через react-native-google-signin
 * Для веб-версии использует стандартный OAuth flow
 */
export const initiateGoogleOAuth = async (accountId: string): Promise<void> => {
  const logOAuth = (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    console.log(`[OAuth ${timestamp}] ${message}`, data || '')
  }
  
  logOAuth('=== Начало OAuth процесса ===', {
    accountId,
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
  })
  
  // Для Android используем нативную авторизацию через Capacitor плагин
  // Это НЕ требует redirect_uri и работает напрямую через Google Play Services
  if (Capacitor.getPlatform() === 'android') {
    logOAuth('Android платформа: используем нативную авторизацию через Capacitor плагин')
    
    try {
      const { isGoogleSignInAvailable, signInWithGoogle } = await import('./googleSignInService')
      
      if (isGoogleSignInAvailable()) {
        logOAuth('Google Sign In доступен, выполнение нативной авторизации')
        
        const result = await signInWithGoogle()
        
        logOAuth('Нативная авторизация успешна', {
          email: result.userInfo.email,
          hasAccessToken: !!result.accessToken,
          hasRefreshToken: !!result.refreshToken,
        })
        
        // Сохраняем результат для обработки в handleGoogleOAuthSuccess
        const state = btoa(JSON.stringify({ accountId, timestamp: Date.now(), nativeAuth: true }))
        sessionStorage.setItem('oauth_state', state)
        sessionStorage.setItem('oauth_native_result', JSON.stringify({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          idToken: result.idToken,
          userInfo: result.userInfo,
          expiresIn: 3600,
        }))
        
        logOAuth('Результат сохранен, отправка события для обработки...')
        
        // Вызываем событие для обработки результата
        // Это позволит CalendarApp обработать результат немедленно
        const event = new CustomEvent('google-native-auth-success', {
          detail: {
            state,
            result: {
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              idToken: result.idToken,
              userInfo: result.userInfo,
              expiresIn: 3600,
            }
          }
        })
        
        // Отправляем событие синхронно, чтобы оно обработалось немедленно
        window.dispatchEvent(event)
        logOAuth('Событие отправлено, ожидание обработки...')
        
        // Даем время на обработку события перед возвратом
        // Это гарантирует, что аккаунт будет добавлен до завершения функции
        await new Promise(resolve => setTimeout(resolve, 100))
        
        return
      } else {
        logOAuth('Google Sign In недоступен, используем веб-авторизацию (fallback)')
      }
    } catch (error: any) {
      logOAuth('ОШИБКА нативной авторизации, используем веб-авторизацию (fallback):', {
        message: error?.message,
        error: String(error),
      })
      // Продолжаем к веб-авторизации
    }
  }
  
  logOAuth('Используем веб-авторизацию (iOS или fallback для Android)')
  
  // Для веб-версии и iOS используем стандартный OAuth flow
  // Проверяем, что client_id настроен
  if (!GOOGLE_CLIENT_ID) {
    const errorMsg = 'VITE_GOOGLE_CLIENT_ID не настроен в .env файле. Пожалуйста, создайте OAuth client типа "Desktop app" в Google Cloud Console и укажите Client ID в .env файле.'
    logOAuth('ОШИБКА:', errorMsg)
    throw new Error(errorMsg)
  }
  
  logOAuth('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID.substring(0, 20) + '...')

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
  
  logOAuth('Initiating Google OAuth (Web):', { 
    authUrl: authUrl.substring(0, 200) + '...', 
    isNative: Capacitor.isNativePlatform(),
    redirectUri: GOOGLE_REDIRECT_URI,
    clientId: GOOGLE_CLIENT_ID.substring(0, 20) + '...'
  })
  
  // Для iOS и веб-версии используем Browser плагин или стандартное перенаправление
  if (Capacitor.isNativePlatform()) {
    // Для iOS используем Browser плагин
    // ВАЖНО: Для iOS нужен правильный redirect URI (не localhost!)
    if (GOOGLE_REDIRECT_URI.includes('localhost') || GOOGLE_REDIRECT_URI.includes('127.0.0.1')) {
      logOAuth('ПРЕДУПРЕЖДЕНИЕ: Используется localhost redirect URI, что может вызвать ошибку loopback flow')
      logOAuth('РЕКОМЕНДАЦИЯ: Используйте публичный URL или нативную авторизацию')
    }
    
    try {
      // Открываем OAuth в системном браузере (Chrome Custom Tabs / Safari View Controller)
      await Browser.open({
        url: authUrl,
        presentationStyle: 'popover',
        windowName: '_self'
      })
      logOAuth('Browser opened successfully')
    } catch (error) {
      logOAuth('ОШИБКА открытия Browser:', error)
      throw new Error(`Не удалось открыть окно авторизации: ${error instanceof Error ? error.message : String(error)}`)
    }
  } else {
    // Для веб-приложения используем стандартное перенаправление
    logOAuth('Веб-версия: перенаправление на Google OAuth')
    window.location.href = authUrl
  }
}

/**
 * Обрабатывает OAuth callback с поддержкой PKCE
 * Также обрабатывает результаты нативной авторизации для Android
 */
export const handleGoogleOAuthCallback = async (code: string, state: string): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn: number
  userInfo: { email: string; name: string }
}> => {
  const logCallback = (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    console.log(`[OAuthCallback ${timestamp}] ${message}`, data || '')
  }
  
  logCallback('=== Обработка OAuth callback ===', {
    hasCode: !!code,
    hasState: !!state,
    platform: Capacitor.getPlatform(),
  })
  
  // Проверяем state (защита от CSRF)
  const savedState = sessionStorage.getItem('oauth_state')
  if (!savedState || savedState !== state) {
    logCallback('ОШИБКА: Invalid OAuth state', {
      savedState: savedState?.substring(0, 50),
      receivedState: state?.substring(0, 50),
    })
    throw new Error('Invalid OAuth state')
  }

  // Проверяем, является ли это результатом нативной авторизации для Android
  try {
    const stateData = JSON.parse(atob(state))
    if (stateData.nativeAuth) {
      logCallback('Обнаружен результат нативной авторизации для Android')
      
      const nativeResultStr = sessionStorage.getItem('oauth_native_result')
      if (nativeResultStr) {
        const nativeResult = JSON.parse(nativeResultStr)
        
        logCallback('Результат нативной авторизации получен', {
          email: nativeResult.userInfo?.email,
          hasAccessToken: !!nativeResult.accessToken,
          hasRefreshToken: !!nativeResult.refreshToken,
        })
        
        // Очищаем временные данные
        sessionStorage.removeItem('oauth_state')
        sessionStorage.removeItem('oauth_native_result')
        
        return {
          accessToken: nativeResult.accessToken,
          refreshToken: nativeResult.refreshToken,
          expiresIn: 3600, // 1 час по умолчанию для нативной авторизации
          userInfo: nativeResult.userInfo,
        }
      }
    }
  } catch (e) {
    // Не нативная авторизация, продолжаем стандартный flow
    logCallback('Стандартный OAuth flow (не нативная авторизация)')
  }

  // Стандартный OAuth flow для веб-версии и iOS
  // Получаем code_verifier из sessionStorage
  const codeVerifier = sessionStorage.getItem('oauth_code_verifier')
  if (!codeVerifier) {
    logCallback('ОШИБКА: Code verifier not found')
    throw new Error('Code verifier not found. OAuth flow may have been interrupted.')
  }

  logCallback('Обмен кода на токены через PKCE...')
  
  // Обмениваем код на токены используя code_verifier (PKCE)
  const tokenData = await exchangeCodeForTokens(code, codeVerifier)
  
  // Проверяем, что токен получен
  if (!tokenData.access_token) {
    logCallback('ОШИБКА: Access token не получен')
    throw new Error('Access token не получен от Google. Проверьте настройки OAuth client.')
  }
  
  logCallback('Токены получены, получение информации о пользователе...')
  
  // Получаем информацию о пользователе
  const userInfo = await getUserInfo(tokenData.access_token)

  logCallback('OAuth callback успешно обработан', {
    email: userInfo.email,
    hasAccessToken: !!tokenData.access_token,
    hasRefreshToken: !!tokenData.refresh_token,
  })

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
