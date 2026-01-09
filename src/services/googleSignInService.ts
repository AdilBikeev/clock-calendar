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
 * Логирует информацию для Android (видно в logcat)
 */
const logAndroid = (message: string, data?: any) => {
  const platform = Capacitor.getPlatform()
  const timestamp = new Date().toISOString()
  const logMessage = `[GoogleSignIn ${timestamp}] ${message}`
  
  console.log(logMessage, data || '')
  
  // Для Android также выводим в консоль с тегом для фильтрации в logcat
  if (platform === 'android' && typeof console !== 'undefined') {
    console.log(`[GoogleSignIn] ${message}`, JSON.stringify(data || {}, null, 2))
  }
}

/**
 * Инициализирует Google Sign In
 * Должна быть вызвана один раз при запуске приложения
 */
export const configureGoogleSignIn = async (): Promise<void> => {
  logAndroid('=== Начало конфигурации Google Sign In ===')
  logAndroid('Платформа:', Capacitor.getPlatform())
  logAndroid('GOOGLE_CLIENT_ID (первые 20 символов):', GOOGLE_CLIENT_ID.substring(0, 20) + '...')
  logAndroid('GOOGLE_CLIENT_ID (полная длина):', GOOGLE_CLIENT_ID.length)
  logAndroid('GOOGLE_CLIENT_ID пустой?', !GOOGLE_CLIENT_ID)
  
  // Проверяем доступность перед использованием
  if (!isGoogleSignInAvailable()) {
    logAndroid('Google Sign In недоступен (не нативная платформа)')
    return
  }

  // ВАЖНО: webClientId должен быть Web OAuth Client ID, а не Android Client ID
  if (!WEB_CLIENT_ID) {
    const errorMsg = 'VITE_GOOGLE_CLIENT_ID (Web OAuth Client ID) не настроен. Для нативной авторизации Google требуется Web OAuth Client ID. Создайте OAuth client типа "Web application" в Google Cloud Console и укажите Client ID в .env файле как VITE_GOOGLE_CLIENT_ID.'
    logAndroid('ОШИБКА:', errorMsg)
    throw new Error(errorMsg)
  }
  
  const config = {
    webClientId: WEB_CLIENT_ID, // Web OAuth Client ID для получения idToken и serverAuthCode
    offlineAccess: true, // Для получения serverAuthCode (можно обменять на refresh token)
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  }
  
  logAndroid('Конфигурация Google Sign In:', {
    webClientId: config.webClientId.substring(0, 20) + '...',
    webClientIdLength: config.webClientId.length,
    offlineAccess: config.offlineAccess,
    scopes: config.scopes,
  })
  
  logAndroid('ВАЖНО: Используется Web OAuth Client ID для webClientId (не Android Client ID)')

  try {
    await GoogleSignIn.configure(config)
    logAndroid('Google Sign In настроен успешно')
    
    // Проверяем текущий статус
    try {
      const isSignedIn = await GoogleSignIn.isSignedIn()
      logAndroid('Текущий статус авторизации:', { isSignedIn: isSignedIn.isSignedIn })
    } catch (statusError) {
      logAndroid('Ошибка проверки статуса (не критично):', statusError)
    }
  } catch (error: any) {
    logAndroid('ОШИБКА настройки Google Sign In:', {
      message: error?.message,
      code: error?.code,
      error: String(error),
      stack: error?.stack,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    })
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
  logAndroid('=== Начало авторизации через Google Sign In ===')
  
  if (!isGoogleSignInAvailable()) {
    logAndroid('ОШИБКА: Google Sign In недоступен')
    throw new Error('Google Sign In недоступен. Используйте веб-авторизацию.')
  }

  try {
    // Проверяем, не авторизован ли уже пользователь
    logAndroid('Проверка статуса авторизации...')
    const signedInResult = await GoogleSignIn.isSignedIn()
    logAndroid('Статус авторизации:', { isSignedIn: signedInResult.isSignedIn })
    
    let userInfo: any

    if (signedInResult.isSignedIn) {
      logAndroid('Пользователь уже авторизован, получение текущего пользователя...')
      // Получаем текущего пользователя
      userInfo = await GoogleSignIn.getCurrentUser()
      logAndroid('Текущий пользователь получен:', {
        hasUser: !!userInfo,
        hasUserData: !!userInfo?.user,
        email: userInfo?.user?.email,
        name: userInfo?.user?.name,
      })
    } else {
      logAndroid('Пользователь не авторизован, начало процесса авторизации...')
      // Выполняем авторизацию
      logAndroid('Проверка Google Play Services...')
      await GoogleSignIn.hasPlayServices()
      logAndroid('Google Play Services доступны, выполнение signIn()...')
      userInfo = await GoogleSignIn.signIn()
      logAndroid('signIn() выполнен, получен userInfo:', {
        hasUser: !!userInfo,
        hasUserData: !!userInfo?.user,
        email: userInfo?.user?.email,
        name: userInfo?.user?.name,
      })
    }

    if (!userInfo) {
      logAndroid('ОШИБКА: Не удалось получить информацию о пользователе')
      throw new Error('Не удалось получить информацию о пользователе')
    }

    // Получаем токены
    logAndroid('Получение токенов...')
    const tokens = await GoogleSignIn.getTokens()
    logAndroid('Токены получены:', {
      hasAccessToken: !!tokens?.accessToken,
      accessTokenLength: tokens?.accessToken?.length || 0,
      accessTokenPreview: tokens?.accessToken ? `${tokens.accessToken.substring(0, 20)}...${tokens.accessToken.substring(tokens.accessToken.length - 10)}` : 'N/A',
      hasIdToken: !!tokens?.idToken,
      idTokenLength: tokens?.idToken?.length || 0,
    })

    // serverAuthCode можно обменять на refresh token через сервер
    // Для клиентского приложения используем serverAuthCode как refresh token
    const result = {
      accessToken: tokens.accessToken,
      refreshToken: userInfo.serverAuthCode, // serverAuthCode можно обменять на refresh token
      idToken: tokens.idToken || userInfo.idToken,
      userInfo: {
        email: userInfo.user.email,
        name: userInfo.user.name || 'Пользователь',
        picture: userInfo.user.photo,
      },
    }
    
    logAndroid('Авторизация успешна:', {
      email: result.userInfo.email,
      name: result.userInfo.name,
      hasAccessToken: !!result.accessToken,
      hasRefreshToken: !!result.refreshToken,
    })
    
    return result
  } catch (error: any) {
    logAndroid('ОШИБКА авторизации Google:', {
      message: error?.message,
      code: error?.code,
      error: String(error),
      stack: error?.stack,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    })
    
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
  logAndroid('=== Обновление токена ===')
  logAndroid('Refresh token (первые 20 символов):', refreshToken.substring(0, 20) + '...')
  logAndroid('Refresh token длина:', refreshToken.length)
  logAndroid('GOOGLE_CLIENT_ID (первые 20 символов):', GOOGLE_CLIENT_ID.substring(0, 20) + '...')
  
  if (!isGoogleSignInAvailable()) {
    logAndroid('Google Sign In недоступен, используем стандартный API подход')
    // Если Google Sign In недоступен, используем стандартный подход через API
    const requestBody = {
      client_id: GOOGLE_CLIENT_ID,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }
    
    logAndroid('Запрос на обновление токена:', {
      client_id: requestBody.client_id.substring(0, 20) + '...',
      grant_type: requestBody.grant_type,
      refresh_token_length: requestBody.refresh_token.length,
    })
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(requestBody),
    })

    logAndroid('Ответ от API обновления токена:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { raw: errorText }
      }
      
      logAndroid('ОШИБКА обновления токена:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        errorText,
      })
      
      throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error || response.statusText}`)
    }

    const data = await response.json()
    logAndroid('Токен успешно обновлен:', {
      hasAccessToken: !!data.access_token,
      accessTokenLength: data.access_token?.length || 0,
      expiresIn: data.expires_in,
    })
    
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    }
  }

  try {
    logAndroid('Попытка обновления токена через Google Sign In...')
    // Пытаемся обновить токен через Google Sign In
    const tokens = await GoogleSignIn.getTokens()
    logAndroid('Токен обновлен через Google Sign In:', {
      hasAccessToken: !!tokens?.accessToken,
      accessTokenLength: tokens?.accessToken?.length || 0,
    })
    
    return {
      accessToken: tokens.accessToken,
      expiresIn: 3600, // Google Sign In не возвращает expires_in, используем стандартное значение
    }
  } catch (error: any) {
    logAndroid('Ошибка обновления через Google Sign In, используем стандартный подход:', {
      message: error?.message,
      code: error?.code,
    })
    
    // Если не удалось обновить через Google Sign In, используем стандартный подход
    const requestBody = {
      client_id: GOOGLE_CLIENT_ID,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }
    
    logAndroid('Запрос на обновление токена (fallback):', {
      client_id: requestBody.client_id.substring(0, 20) + '...',
      grant_type: requestBody.grant_type,
    })
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(requestBody),
    })

    logAndroid('Ответ от API обновления токена (fallback):', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData: any = {}
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { raw: errorText }
      }
      
      logAndroid('ОШИБКА обновления токена (fallback):', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        errorText,
      })
      
      throw new Error(`Token refresh failed: ${errorData.error_description || errorData.error || response.statusText}`)
    }

    const data = await response.json()
    logAndroid('Токен успешно обновлен (fallback):', {
      hasAccessToken: !!data.access_token,
      expiresIn: data.expires_in,
    })
    
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
  logAndroid('=== Проверка авторизации для синхронизации ===')
  logAndroid('Информация об аккаунте:', {
    id: account.id,
    email: account.email,
    hasAccessToken: !!account.accessToken,
    accessTokenLength: account.accessToken?.length || 0,
    hasRefreshToken: !!account.refreshToken,
    refreshTokenLength: account.refreshToken?.length || 0,
    tokenExpiry: account.tokenExpiry,
    tokenExpiryDate: account.tokenExpiry ? new Date(account.tokenExpiry).toISOString() : 'N/A',
    currentTime: Date.now(),
    currentTimeDate: new Date().toISOString(),
    isExpired: account.tokenExpiry ? account.tokenExpiry < Date.now() : 'N/A',
  })
  
  // Проверяем, нужна ли авторизация
  const needsAuth =
    !account.accessToken ||
    (account.tokenExpiry && account.tokenExpiry < Date.now())

  logAndroid('Требуется авторизация?', {
    needsAuth,
    reason: !account.accessToken ? 'Нет access token' : 'Токен истек',
  })

  if (!needsAuth) {
    logAndroid('Авторизация не требуется, токен валиден')
    return account
  }

  // Если есть refresh token, пытаемся обновить токен
  if (account.refreshToken) {
    logAndroid('Попытка обновления токена через refresh token...')
    try {
      const tokenData = await refreshGoogleToken(account.refreshToken)
      const newTokenExpiry = Date.now() + (tokenData.expiresIn * 1000)

      logAndroid('Токен успешно обновлен через refresh token:', {
        newTokenExpiry,
        newTokenExpiryDate: new Date(newTokenExpiry).toISOString(),
        expiresIn: tokenData.expiresIn,
      })

      return {
        ...account,
        accessToken: tokenData.accessToken,
        tokenExpiry: newTokenExpiry,
      }
    } catch (error: any) {
      logAndroid('Не удалось обновить токен через refresh token:', {
        message: error?.message,
        error: String(error),
      })
      // Продолжаем к авторизации
    }
  } else {
    logAndroid('Refresh token отсутствует, требуется полная авторизация')
  }

  // Если Google Sign In доступен, используем его
  if (isGoogleSignInAvailable()) {
    logAndroid('Google Sign In доступен, выполнение авторизации...')
    try {
      const signInResult = await signInWithGoogle()

      // Проверяем, что email совпадает
      if (signInResult.userInfo.email !== account.email) {
        logAndroid('ОШИБКА: Email не совпадает:', {
          expected: account.email,
          received: signInResult.userInfo.email,
        })
        throw new Error(
          `Email не совпадает. Ожидался: ${account.email}, получен: ${signInResult.userInfo.email}`
        )
      }

      const tokenExpiry = Date.now() + 3600000 // 1 час по умолчанию

      logAndroid('Авторизация успешна, обновление аккаунта:', {
        tokenExpiry,
        tokenExpiryDate: new Date(tokenExpiry).toISOString(),
        hasAccessToken: !!signInResult.accessToken,
        hasRefreshToken: !!signInResult.refreshToken,
      })

      return {
        ...account,
        accessToken: signInResult.accessToken,
        refreshToken: signInResult.refreshToken || account.refreshToken,
        tokenExpiry,
        name: signInResult.userInfo.name || account.name,
      }
    } catch (error: any) {
      logAndroid('ОШИБКА авторизации через Google Sign In:', {
        message: error?.message,
        code: error?.code,
        error: String(error),
        stack: error?.stack,
      })
      throw error
    }
  }

  // Если Google Sign In недоступен, выбрасываем ошибку
  logAndroid('ОШИБКА: Google Sign In недоступен, требуется веб-авторизация')
  throw new Error(
    'Токен истек и требуется повторная авторизация. Пожалуйста, переподключите аккаунт Google.'
  )
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
