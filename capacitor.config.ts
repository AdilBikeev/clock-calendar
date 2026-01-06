import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.clockcalendar.app',
  appName: 'Clock Calendar',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
}

export default config

