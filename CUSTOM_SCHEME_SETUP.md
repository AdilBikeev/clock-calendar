# Настройка кастомной схемы URL для Android OAuth

## Проблема

`react-native-google-signin` не работает в Capacitor приложениях, потому что Capacitor - это не React Native. Вместо этого мы используем **веб-авторизацию с кастомной схемой URL**, которая обрабатывается через deep links.

## Решение

Используем кастомную схему URL `com.clockcalendar.app://oauth/google/callback` вместо localhost. Это позволяет:
- ✅ Избежать проблемы с loopback flow (Google блокирует localhost)
- ✅ Работать в Capacitor приложениях
- ✅ Обрабатывать callback через deep links

## Настройка

### 1. Настройка в Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Перейдите в **APIs & Services** → **Credentials**
3. Найдите или создайте **Web OAuth Client** (не Android Client!)
4. Добавьте в **Authorized redirect URIs**:
   ```
   com.clockcalendar.app://oauth/google/callback
   ```
5. Сохраните изменения

### 2. Настройка переменных окружения

В файле `.env` установите:

```env
# Web OAuth Client ID (используется для всех платформ)
VITE_GOOGLE_CLIENT_ID=ваш_web_client_id.apps.googleusercontent.com

# Опционально: кастомный redirect URI
# Если не указан, будет использоваться: com.clockcalendar.app://oauth/google/callback
VITE_MOBILE_REDIRECT_URI=com.clockcalendar.app://oauth/google/callback
```

**ВАЖНО:** Используйте **Web OAuth Client ID**, а не Android Client ID!

### 3. Проверка конфигурации Capacitor

Убедитесь, что в `capacitor.config.ts` настроены deep links:

```typescript
plugins: {
  App: {
    deepLinking: {
      enabled: true,
      schemes: ['com.clockcalendar.app']
    }
  }
}
```

Это уже настроено в вашем проекте.

### 4. Синхронизация с Android

После изменения конфигурации выполните:

```bash
npm run build
npx cap sync
```

## Как это работает

1. Пользователь нажимает "Подключить Google аккаунт"
2. Открывается браузер с Google авторизацией
3. После авторизации Google перенаправляет на `com.clockcalendar.app://oauth/google/callback?code=...&state=...`
4. Capacitor обрабатывает deep link через событие `appUrlOpen`
5. Приложение извлекает `code` и `state` из URL
6. Обменивает код на токены
7. Добавляет аккаунт

## Проверка работы

### 1. Проверьте логи

```bash
adb logcat -s Capacitor/Console | grep -E "(OAuth|CalendarApp|deep link)"
```

Ожидаемые логи:
```
[OAuth] Android redirect URI: com.clockcalendar.app://oauth/google/callback
[CalendarApp] Получен deep link: com.clockcalendar.app://oauth/google/callback?code=...
[CalendarApp] OAuth callback параметры получены, обработка...
```

### 2. Проверьте настройки в Google Cloud Console

- Убедитесь, что redirect URI добавлен в **Web OAuth Client**
- Проверьте, что используется правильный Client ID

### 3. Тестирование

1. Запустите приложение на Android
2. Перейдите в настройки → Добавить аккаунт → Google
3. Должен открыться браузер с Google авторизацией
4. После авторизации приложение должно автоматически вернуться и добавить аккаунт

## Устранение проблем

### Проблема: "redirect_uri_mismatch"

**Причина:** Redirect URI не добавлен в Google Cloud Console или не совпадает

**Решение:**
1. Проверьте, что `com.clockcalendar.app://oauth/google/callback` добавлен в **Web OAuth Client**
2. Убедитесь, что используется **Web OAuth Client ID** (не Android)
3. Проверьте переменную `VITE_GOOGLE_CLIENT_ID` в `.env`

### Проблема: Deep link не обрабатывается

**Причина:** Capacitor не настроен для обработки deep links

**Решение:**
1. Проверьте `capacitor.config.ts` - должна быть настройка `deepLinking`
2. Выполните `npx cap sync`
3. Пересоберите приложение

### Проблема: "invalid_request" или "loopback flow blocked"

**Причина:** Все еще используется localhost

**Решение:**
1. Проверьте, что `VITE_MOBILE_REDIRECT_URI` установлен в `.env`
2. Убедитесь, что используется кастомная схема (не localhost)
3. Перезапустите приложение после изменения `.env`

## Альтернативные решения

Если кастомная схема не работает, можно использовать:

1. **Публичный URL через ngrok:**
   ```env
   VITE_MOBILE_REDIRECT_URI=https://your-ngrok-url.ngrok.io/oauth/google/callback
   ```

2. **Ваш домен:**
   ```env
   VITE_MOBILE_REDIRECT_URI=https://yourdomain.com/oauth/google/callback
   ```

Но кастомная схема - это самый простой и надежный вариант для мобильных приложений.
