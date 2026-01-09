# Настройка Web OAuth Client ID для нативной авторизации Google

## Проблема

Ошибка: `You must use a Web client as the server client ID`

Эта ошибка возникает, когда для `webClientId` в нативной авторизации Google используется Android OAuth Client ID вместо Web OAuth Client ID.

## Решение

Для нативной авторизации Google Sign-In требуется **Web OAuth Client ID** для параметра `webClientId`, даже на Android платформе.

### Шаги настройки:

1. **Откройте Google Cloud Console**
   - Перейдите на https://console.cloud.google.com/
   - Выберите ваш проект

2. **Создайте или используйте существующий Web OAuth Client**
   - Перейдите в **APIs & Services** → **Credentials**
   - Найдите или создайте **OAuth 2.0 Client ID** типа **"Web application"**
   - Скопируйте **Client ID** (он будет выглядеть как `YOUR_CLIENT_ID.apps.googleusercontent.com`)

3. **Обновите .env файл**
   ```env
   # Web OAuth Client ID (используется для webClientId в нативной авторизации)
   VITE_GOOGLE_CLIENT_ID=ваш_web_client_id.apps.googleusercontent.com
   
   # Android OAuth Client ID (опционально, для других целей)
   VITE_GOOGLE_CLIENT_ID_ANDROID=ваш_android_client_id.apps.googleusercontent.com
   ```

4. **ВАЖНО: Разница между Client ID типами**
   - **Web OAuth Client ID**: Используется для `webClientId` в нативной авторизации
   - **Android OAuth Client ID**: Используется для других целей (если нужно), но НЕ для `webClientId`

5. **Пересоберите проект**
   ```bash
   npm run build
   npx cap sync
   ```

## Проверка

После настройки проверьте логи:
```
[GoogleSignIn] ВАЖНО: Используется Web OAuth Client ID для webClientId (не Android Client ID)
[GoogleSignIn] Конфигурация Google Sign In: { webClientId: "ваш_web_client_id..." }
```

Если ошибка сохраняется, убедитесь, что:
1. `VITE_GOOGLE_CLIENT_ID` установлен в `.env` файле
2. Это именно **Web OAuth Client ID**, а не Android Client ID
3. Проект пересобран после изменений
