/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string // Web OAuth client ID (для веб-версии)
  readonly VITE_GOOGLE_CLIENT_ID_ANDROID?: string // Android OAuth client ID (для Android, не требует redirect URI)
  readonly VITE_GOOGLE_CLIENT_ID_IOS?: string // iOS OAuth client ID (для iOS, не требует redirect URI)
  readonly VITE_GOOGLE_CLIENT_SECRET?: string // Client Secret (только для Web/Desktop app)
  readonly VITE_GOOGLE_REDIRECT_URI?: string // Redirect URI (для Web OAuth client)
  readonly VITE_MOBILE_REDIRECT_URI?: string // Redirect URI для мобильных (если используете Browser плагин)
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
