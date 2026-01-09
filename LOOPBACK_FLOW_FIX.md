# Решение проблемы Loopback Flow (Bad Request)

## Проблема

Google блокирует использование **loopback flow** (localhost/127.0.0.1 redirect URI) для безопасности. При попытке авторизации через веб-браузер на Android вы получаете ошибку:

```
Error 400: invalid_request
The loopback flow has been blocked in order to keep users secure.
```

**Ссылка на ошибку:** [Google OAuth Error](https://accounts.google.com/signin/oauth/error?authError=...)

**Причина:** Google больше не разрешает использовать `localhost` или `127.0.0.1` в качестве redirect URI для OAuth 2.0 из-за политики безопасности.

## Решение

Для Android приложений теперь используется **нативная авторизация через `react-native-google-signin`**, которая:
- ✅ Не требует redirect URI
- ✅ Работает напрямую через Google Play Services
- ✅ Избегает проблемы с loopback flow
- ✅ Более безопасна и удобна для пользователя

## Что было изменено

### 1. Обновлен `initiateGoogleOAuth` в `googleCalendarService.ts`

Теперь для Android:
- Используется нативная авторизация через `react-native-google-signin`
- Не открывается браузер с OAuth flow
- Результат сохраняется в sessionStorage для обработки

Для веб-версии и iOS:
- Используется стандартный OAuth flow через браузер
- ⚠️ **ВАЖНО:** Для iOS нужно использовать публичный redirect URI (не localhost!)

### 2. Обновлен `handleGoogleOAuthCallback` в `googleCalendarService.ts`

Теперь обрабатывает:
- Результаты нативной авторизации для Android
- Стандартные OAuth callbacks для веб-версии и iOS

### 3. Обновлен `CalendarApp.tsx`

При подключении Google аккаунта на Android:
- Автоматически используется нативная авторизация
- Если Google Sign In недоступен, используется fallback на веб-авторизацию

## Требования

### Для Android:

1. **Android OAuth Client ID** должен быть настроен в Google Cloud Console
   - Тип: **Android**
   - Package name: `com.clockcalendar.app`
   - SHA-1 fingerprint должен быть добавлен

2. **Переменная окружения:**
   ```env
   VITE_GOOGLE_CLIENT_ID_ANDROID=ваш_android_client_id.apps.googleusercontent.com
   ```

3. **Пакет `@react-native-google-signin/google-signin`** должен быть установлен
   ```bash
   npm install @react-native-google-signin/google-signin
   ```

### Для веб-версии:

1. **Web OAuth Client ID** должен быть настроен
2. **Redirect URI** должен быть публичным (не localhost!)
   - Например: `https://yourdomain.com/oauth/google/callback`
   - Или используйте ngrok для разработки: `https://your-ngrok-url.ngrok.io/oauth/google/callback`

### Для iOS:

1. **iOS OAuth Client ID** должен быть настроен
2. **Redirect URI** должен быть публичным или использовать кастомную схему
   - Например: `com.clockcalendar.app://oauth/callback`

## Как проверить, что решение работает

### На Android:

1. Откройте приложение
2. Перейдите в настройки → Добавить аккаунт → Google
3. Должно открыться **нативное окно авторизации Google** (не браузер!)
4. После авторизации аккаунт должен быть добавлен автоматически

### Проверка логов:

```bash
# Просмотр логов нативной авторизации
adb logcat -s GoogleSignIn | grep -E "(нативная|native|Android)"
```

Ожидаемые логи:
```
[GoogleSignIn] Android платформа обнаружена, используем нативную авторизацию
[GoogleSignIn] Google Sign In доступен, выполнение нативной авторизации
[GoogleSignIn] Нативная авторизация успешна
```

## Если нативная авторизация не работает

### Проблема 1: Google Sign In недоступен

**Симптомы:**
```
[GoogleSignIn] Google Sign In недоступен (не React Native окружение)
```

**Решение:**
- Убедитесь, что пакет `@react-native-google-signin/google-signin` установлен
- Проверьте, что приложение запущено на реальном устройстве или эмуляторе с Google Play Services
- Для Capacitor приложений может потребоваться дополнительная настройка нативных модулей

### Проблема 2: Ошибка конфигурации

**Симптомы:**
```
[GoogleSignIn] ОШИБКА настройки Google Sign In
```

**Решение:**
- Проверьте, что `VITE_GOOGLE_CLIENT_ID_ANDROID` установлен и корректен
- Убедитесь, что используется Android OAuth Client ID (не Web Client ID)
- Проверьте, что SHA-1 fingerprint добавлен в Google Cloud Console

### Проблема 3: Fallback на веб-авторизацию

Если нативная авторизация недоступна, приложение автоматически использует веб-авторизацию. В этом случае:

- ⚠️ **НЕ используйте localhost** в redirect URI
- Используйте публичный URL (ngrok, ваш домен)
- Или настройте правильный redirect URI в Google Cloud Console

## Миграция с веб-авторизации на нативную

Если у вас уже есть подключенные аккаунты через веб-авторизацию:

1. Они продолжат работать до истечения токенов
2. При синхронизации, если токен истек, будет использована нативная авторизация
3. Для полной миграции:
   - Удалите старые аккаунты
   - Подключите их заново через нативную авторизацию

## Дополнительные ресурсы

- [Google OAuth 2.0 Loopback Migration Guide](https://developers.google.com/identity/protocols/oauth2/resources/loopback-migration)
- [React Native Google Sign In Documentation](https://github.com/react-native-google-signin/google-signin)
- [Google Cloud Console - OAuth Clients](https://console.cloud.google.com/apis/credentials)

## Чек-лист

- [ ] Android OAuth Client ID создан в Google Cloud Console
- [ ] SHA-1 fingerprint добавлен в Android OAuth Client
- [ ] `VITE_GOOGLE_CLIENT_ID_ANDROID` установлен в `.env`
- [ ] Пакет `@react-native-google-signin/google-signin` установлен
- [ ] Приложение протестировано на Android устройстве/эмуляторе
- [ ] Нативная авторизация работает (открывается нативное окно, не браузер)
- [ ] Аккаунт успешно добавляется после авторизации
- [ ] Синхронизация событий работает
