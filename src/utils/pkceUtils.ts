/**
 * Утилиты для PKCE (Proof Key for Code Exchange)
 * RFC 7636: https://tools.ietf.org/html/rfc7636
 */

/**
 * Генерирует случайную строку для code_verifier
 * Длина: 43-128 символов (рекомендуется 128)
 */
export const generateCodeVerifier = (): string => {
  const array = new Uint8Array(96) // 96 байт = 128 символов после base64url
  crypto.getRandomValues(array)
  
  // Преобразуем в base64url
  const base64 = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  return base64
}

/**
 * Создает code_challenge из code_verifier используя SHA256
 */
export const generateCodeChallenge = async (verifier: string): Promise<string> => {
  // Преобразуем строку в ArrayBuffer
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  
  // Вычисляем SHA256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  
  // Преобразуем ArrayBuffer в base64url
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashString = String.fromCharCode(...hashArray)
  const base64 = btoa(hashString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  return base64
}

/**
 * Генерирует пару code_verifier и code_challenge для PKCE
 */
export const generatePKCEPair = async (): Promise<{
  codeVerifier: string
  codeChallenge: string
}> => {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  
  return {
    codeVerifier,
    codeChallenge,
  }
}
