# Настройка нативного OAuth для Android/iOS

## Правильный подход для мобильных приложений

Для нативных мобильных приложений (Android/iOS) нужно использовать **нативные OAuth clients**, а не Desktop app client. Нативные OAuth clients **не требуют redirect URI** - они используют package name/Bundle ID и SHA-1 fingerprint.

Согласно [документации React Native Google Sign In](https://react-native-google-signin.github.io/docs/setting-up/get-config-file), для Android нужно:

1. Получить SHA-1 fingerprint
2. Создать OAuth Client ID типа **Android** в Google Cloud Console
3. Использовать этот Client ID

## Настройка для Android

### Шаг 1: Получить SHA-1 fingerprint

1. **Для debug сборки:**
   ```bash
   cd android
   ./gradlew signingReport
   ```
   Или на Windows:
   ```bash
   cd android
   gradlew.bat signingReport
   ```

2. Найдите в выводе:
   ```
   Variant: debug
   SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
   ```

3. **Для release сборки** (когда будете публиковать):
   - Используйте SHA-1 из release keystore
   - Или из Google Play Console (если включен App Signing)

### Шаг 2: Создать Android OAuth Client в Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Перейдите в **APIs & Services** → **Credentials**
3. Нажмите **+ CREATE CREDENTIALS** → **OAuth client ID**
4. Выберите тип: **Android**
5. Заполните:
   - **Name**: Clock Calendar Android (или любое имя)
   - **Package name**: `com.clockcalendar.app` (из `capacitor.config.ts`)
   - **SHA-1 certificate fingerprint**: вставьте SHA-1 из шага 1
6. Нажмите **CREATE**
7. **Скопируйте Client ID** - он понадобится для `.env` файла

### Шаг 3: Настроить переменные окружения

Добавьте в `.env` файл:

```env
# Для веб-версии (Web OAuth client)
VITE_GOOGLE_CLIENT_ID=ваш_web_client_id

# Для Android (Android OAuth client)
VITE_GOOGLE_CLIENT_ID_ANDROID=ваш_android_client_id

# Для iOS (iOS OAuth client) - когда будете настраивать iOS
VITE_GOOGLE_CLIENT_ID_IOS=ваш_ios_client_id

# Client Secret (только для Web/Desktop app, не нужен для Android/iOS)
VITE_GOOGLE_CLIENT_SECRET=ваш_client_secret
```

### Шаг 4: Обновить код для использования правильного Client ID

Код будет автоматически выбирать правильный Client ID в зависимости от платформы.

## Настройка для iOS

1. Откройте Google Cloud Console
2. Создайте OAuth Client ID типа **iOS**
3. Укажите:
   - **Bundle ID**: `com.clockcalendar.app`
4. Скопируйте Client ID и iOS URL scheme
5. Добавьте в `.env`:
   ```env
   VITE_GOOGLE_CLIENT_ID_IOS=ваш_ios_client_id
   ```

## Важные отличия

### Desktop app OAuth client:
- ❌ Требует redirect URI
- ❌ Не подходит для нативных мобильных приложений
- ✅ Подходит только для десктопных приложений

### Android/iOS OAuth clients:
- ✅ Не требуют redirect URI
- ✅ Используют package name/Bundle ID и SHA-1 fingerprint
- ✅ Правильный выбор для нативных мобильных приложений
- ✅ Работают с нативными SDK

## Для Capacitor с Browser плагином

**Важно:** Если вы используете Browser плагин для открытия OAuth в системном браузере, вам все равно может понадобиться redirect URI для обработки callback. В этом случае:

1. Используйте **Web OAuth client** (не Desktop app)
2. Настройте redirect URI на промежуточную страницу
3. Промежуточная страница делает deep link обратно в приложение

Но для чисто нативного подхода (без Browser плагина) используйте нативные OAuth clients без redirect URI.

## Резюме

- **Веб-версия**: Web OAuth client + redirect URI
- **Android**: Android OAuth client (SHA-1 + package name) - **без redirect URI**
- **iOS**: iOS OAuth client (Bundle ID) - **без redirect URI**
