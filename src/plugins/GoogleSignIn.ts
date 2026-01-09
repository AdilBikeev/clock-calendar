/**
 * Capacitor плагин для нативной авторизации Google
 * Основан на логике @react-native-google-signin/google-signin
 * Не требует redirect_uri, использует нативную авторизацию через Google Play Services
 */

import { registerPlugin } from '@capacitor/core'

export interface GoogleSignInPlugin {
  /**
   * Конфигурирует Google Sign In
   */
  configure(options: {
    webClientId: string
    offlineAccess?: boolean
    scopes?: string[]
  }): Promise<void>

  /**
   * Выполняет авторизацию
   */
  signIn(): Promise<{
    user: {
      id: string
      name: string | null
      email: string
      photo: string | null
    }
    idToken: string
    accessToken: string
    serverAuthCode?: string
  }>

  /**
   * Проверяет, авторизован ли пользователь
   */
  isSignedIn(): Promise<{ isSignedIn: boolean }>

  /**
   * Получает текущего пользователя
   */
  getCurrentUser(): Promise<{
    user: {
      id: string
      name: string | null
      email: string
      photo: string | null
    }
    idToken: string
  } | null>

  /**
   * Получает токены
   */
  getTokens(): Promise<{
    accessToken: string
    idToken: string
  }>

  /**
   * Выход из аккаунта
   */
  signOut(): Promise<void>

  /**
   * Проверяет доступность Google Play Services
   */
  hasPlayServices(): Promise<boolean>
}

const GoogleSignIn = registerPlugin<GoogleSignInPlugin>('GoogleSignIn', {
  web: () => import('./GoogleSignIn.web').then(m => new m.GoogleSignInWeb()),
})

// Экспортируем для использования
export { GoogleSignIn }
