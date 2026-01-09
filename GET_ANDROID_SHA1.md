# Получение SHA-1 fingerprint для Android

## Быстрый способ

1. **Откройте Android проект:**
   ```bash
   npx cap open android
   ```

2. **В Android Studio:**
   - Откройте терминал внизу (Terminal tab)
   - Выполните:
     ```bash
     cd android
     ./gradlew signingReport
     ```
   - Или на Windows:
     ```bash
     cd android
     gradlew.bat signingReport
     ```

3. **Найдите SHA-1 в выводе:**
   Ищите секцию:
   ```
   Variant: debug
   Config: debug
   Store: C:\Users\...\.android\debug.keystore
   Alias: AndroidDebugKey
   MD5: XX:XX:XX:...
   SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
   SHA-256: XX:XX:XX:...
   Valid until: ...
   ```

4. **Скопируйте SHA-1** (не SHA-256!)

## Альтернативный способ (через keytool)

Если gradlew не работает:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

На Windows:
```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Найдите строку `SHA1:` и скопируйте значение.

## Создание Android OAuth Client

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Перейдите в **APIs & Services** → **Credentials**
3. Нажмите **+ CREATE CREDENTIALS** → **OAuth client ID**
4. Выберите тип: **Android**
5. Заполните:
   - **Name**: Clock Calendar Android
   - **Package name**: `com.clockcalendar.app`
   - **SHA-1 certificate fingerprint**: вставьте SHA-1 из шага выше
6. Нажмите **CREATE**
7. Скопируйте **Client ID** (он будет выглядеть как длинная строка)

## Настройка .env

Добавьте в `.env` файл:

```env
# Android OAuth Client ID (не требует redirect URI)
VITE_GOOGLE_CLIENT_ID_ANDROID=ваш_android_client_id_здесь

# Web OAuth Client ID (для веб-версии)
VITE_GOOGLE_CLIENT_ID=ваш_web_client_id_здесь
```

## Важно

- Используйте **SHA-1**, а не SHA-256
- Для debug сборки используйте debug keystore SHA-1
- Для release сборки используйте release keystore SHA-1
- Если публикуете в Play Store, может понадобиться SHA-1 из Play Console (если включен App Signing)
