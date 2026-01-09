import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.clockcalendar.app',
  appName: 'Clock Calendar',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    App: {
      // Настройка deep links для OAuth callback
      // Промежуточная страница делает deep link обратно в приложение
      deepLinking: {
        enabled: true,
        schemes: ['com.clockcalendar.app']
      }
    }
  }
}

export default config


