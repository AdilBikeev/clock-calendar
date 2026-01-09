/**
 * Web реализация Google Sign In
 * Для веб-версии использует стандартный OAuth flow
 */

import { WebPlugin } from '@capacitor/core'
import type { GoogleSignInPlugin } from './GoogleSignIn'

export class GoogleSignInWeb extends WebPlugin implements GoogleSignInPlugin {
  async configure(): Promise<void> {
    throw new Error('Google Sign In не поддерживается на веб-платформе. Используйте веб-авторизацию.')
  }

  async signIn(): Promise<any> {
    throw new Error('Google Sign In не поддерживается на веб-платформе.')
  }

  async isSignedIn(): Promise<{ isSignedIn: boolean }> {
    return { isSignedIn: false }
  }

  async getCurrentUser(): Promise<any> {
    return null
  }

  async getTokens(): Promise<any> {
    throw new Error('Google Sign In не поддерживается на веб-платформе.')
  }

  async signOut(): Promise<void> {
    throw new Error('Google Sign In не поддерживается на веб-платформе.')
  }

  async hasPlayServices(): Promise<boolean> {
    return false
  }
}
