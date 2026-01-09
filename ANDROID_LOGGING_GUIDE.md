# Руководство по логированию и диагностике ошибок Android

## Просмотр логов Android приложения

### Способ 1: Через Android Studio Logcat

1. Откройте Android Studio
2. Подключите устройство или запустите эмулятор
3. Откройте вкладку **Logcat** (внизу экрана)
4. В фильтре введите: `GoogleSignIn` или `GoogleCalendar`
5. Запустите приложение и выполните синхронизацию

### Способ 2: Через ADB (Android Debug Bridge)

```bash
# Просмотр всех логов с тегом GoogleSignIn
adb logcat -s GoogleSignIn

# Просмотр всех логов с тегом GoogleCalendar
adb logcat -s GoogleCalendar

# Просмотр всех логов приложения
adb logcat | grep "com.clockcalendar.app"

# Сохранение логов в файл
adb logcat -s GoogleSignIn GoogleCalendar > android_logs.txt
```

### Способ 3: Через Chrome DevTools (для веб-версии в Capacitor)

1. Откройте Chrome
2. Перейдите на `chrome://inspect`
3. Найдите ваше устройство и нажмите **inspect**
4. Откройте вкладку **Console**
5. Фильтруйте по `GoogleSignIn` или `GoogleCalendar`

## Ключевые параметры для диагностики Bad Request

### 1. Конфигурация Google Sign In

**Что смотреть:**
- `GOOGLE_CLIENT_ID` - должен быть Android OAuth Client ID (не Web Client ID!)
- Длина `GOOGLE_CLIENT_ID` - должна быть около 40-50 символов
- `webClientId` в конфигурации - должен совпадать с Android Client ID

**Где искать в логах:**
```
[GoogleSignIn] === Начало конфигурации Google Sign In ===
[GoogleSignIn] GOOGLE_CLIENT_ID (первые 20 символов): ...
[GoogleSignIn] GOOGLE_CLIENT_ID (полная длина): ...
[GoogleSignIn] Конфигурация Google Sign In: { webClientId: ..., scopes: [...] }
```

**Возможные проблемы:**
- ❌ Используется Web Client ID вместо Android Client ID
- ❌ Client ID пустой или неверный
- ❌ Client ID не настроен в Google Cloud Console для Android

### 2. Процесс авторизации

**Что смотреть:**
- Статус `isSignedIn` - авторизован ли пользователь
- Результат `signIn()` - успешно ли прошла авторизация
- Наличие `accessToken` и `refreshToken`
- Длина токенов (access token обычно ~200+ символов)

**Где искать в логах:**
```
[GoogleSignIn] === Начало авторизации через Google Sign In ===
[GoogleSignIn] Статус авторизации: { isSignedIn: true/false }
[GoogleSignIn] Токены получены: { hasAccessToken: true, accessTokenLength: ... }
```

**Возможные проблемы:**
- ❌ `SIGN_IN_CANCELLED` - пользователь отменил авторизацию
- ❌ `PLAY_SERVICES_NOT_AVAILABLE` - Google Play Services недоступны
- ❌ `IN_PROGRESS` - авторизация уже выполняется
- ❌ Токены не получены или пустые

### 3. Обновление токена (Refresh Token)

**Что смотреть:**
- Наличие `refreshToken` в аккаунте
- Длина `refreshToken` (обычно ~200+ символов)
- Статус ответа от API (`200 OK` или `400 Bad Request`)
- Тело ошибки от API (если есть)

**Где искать в логах:**
```
[GoogleSignIn] === Обновление токена ===
[GoogleSignIn] Refresh token (первые 20 символов): ...
[GoogleSignIn] Запрос на обновление токена: { client_id: ..., grant_type: ... }
[GoogleSignIn] Ответ от API обновления токена: { status: 200/400, statusText: ... }
[GoogleSignIn] ОШИБКА обновления токена: { status: 400, error: {...} }
```

**Возможные проблемы:**
- ❌ `400 Bad Request` - неверный `client_id` или `refresh_token`
- ❌ `invalid_grant` - refresh token истек или недействителен
- ❌ `invalid_client` - неверный Client ID
- ❌ Refresh token отсутствует в аккаунте

### 4. Запросы к Google Calendar API

**Что смотреть:**
- URL запроса (должен быть корректным)
- Параметры запроса (`timeMin`, `timeMax`, `calendarId`)
- Наличие и валидность `Authorization` заголовка
- Статус ответа (`200 OK` или `400 Bad Request`)
- Тело ошибки от API

**Где искать в логах:**
```
[GoogleCalendar] === Получение событий из Google Calendar ===
[GoogleCalendar] Параметры запроса: { calendarId: ..., timeMin: ..., timeMax: ... }
[GoogleCalendar] Access token получен: { tokenLength: ..., tokenPreview: ... }
[GoogleCalendar] Запрос к Google Calendar API: { url: ..., method: 'GET', ... }
[GoogleCalendar] Ответ от Google Calendar API: { status: 200/400, statusText: ... }
[GoogleCalendar] ОШИБКА запроса к Google Calendar API: { status: 400, error: {...} }
```

**Возможные проблемы:**
- ❌ `400 Bad Request` - неверные параметры запроса
- ❌ `401 Unauthorized` - токен истек или недействителен
- ❌ `403 Forbidden` - недостаточно прав (scopes)
- ❌ Неверный формат дат (`timeMin`, `timeMax`)

## Типичные ошибки Bad Request и их решения

### Ошибка 1: "invalid_client" или "invalid_request"

**Причина:** Неверный Client ID или Client ID не настроен для Android

**Решение:**
1. Проверьте, что используется Android OAuth Client ID (не Web Client ID)
2. Убедитесь, что Client ID настроен в Google Cloud Console
3. Проверьте, что SHA-1 fingerprint добавлен в OAuth Client
4. Проверьте переменную окружения `VITE_GOOGLE_CLIENT_ID_ANDROID`

### Ошибка 2: "invalid_grant" при обновлении токена

**Причина:** Refresh token истек, недействителен или не соответствует Client ID

**Решение:**
1. Удалите аккаунт и переподключите его
2. Проверьте, что используется правильный Client ID
3. Убедитесь, что `offlineAccess: true` в конфигурации Google Sign In

### Ошибка 3: "Bad Request" при запросе к Calendar API

**Причина:** Неверные параметры запроса или формат дат

**Решение:**
1. Проверьте формат дат (`timeMin`, `timeMax` должны быть в ISO 8601)
2. Проверьте, что `calendarId` корректен (обычно `'primary'`)
3. Убедитесь, что токен имеет правильные scopes (calendar.readonly)

### Ошибка 4: "unauthorized_client" или "access_denied"

**Причина:** Недостаточно прав или неверные scopes

**Решение:**
1. Проверьте, что в конфигурации указаны правильные scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
2. Убедитесь, что Google Calendar API включен в Google Cloud Console

## Чек-лист для диагностики

- [ ] Проверьте, что `GOOGLE_CLIENT_ID` установлен и не пустой
- [ ] Убедитесь, что используется Android OAuth Client ID (не Web)
- [ ] Проверьте, что SHA-1 fingerprint добавлен в Google Cloud Console
- [ ] Убедитесь, что Google Calendar API включен
- [ ] Проверьте, что scopes указаны правильно
- [ ] Проверьте, что `offlineAccess: true` в конфигурации
- [ ] Убедитесь, что refresh token получен при первой авторизации
- [ ] Проверьте формат дат в запросах к API
- [ ] Убедитесь, что токен не истек (проверьте `tokenExpiry`)

## Пример успешного лога

```
[GoogleSignIn] === Начало конфигурации Google Sign In ===
[GoogleSignIn] Платформа: android
[GoogleSignIn] GOOGLE_CLIENT_ID (первые 20 символов): 1234567890-abc.apps...
[GoogleSignIn] GOOGLE_CLIENT_ID (полная длина): 45
[GoogleSignIn] Конфигурация Google Sign In: { webClientId: "1234567890-abc.apps...", offlineAccess: true, scopes: [...] }
[GoogleSignIn] Google Sign In настроен успешно

[GoogleSignIn] === Начало авторизации через Google Sign In ===
[GoogleSignIn] Статус авторизации: { isSignedIn: false }
[GoogleSignIn] signIn() выполнен, получен userInfo: { hasUser: true, email: "user@example.com" }
[GoogleSignIn] Токены получены: { hasAccessToken: true, accessTokenLength: 245, hasRefreshToken: true }
[GoogleSignIn] Авторизация успешна: { email: "user@example.com", hasAccessToken: true }

[GoogleCalendar] === Получение событий из Google Calendar ===
[GoogleCalendar] Параметры запроса: { calendarId: "primary", timeMin: "2024-01-01T00:00:00.000Z", ... }
[GoogleCalendar] Запрос к Google Calendar API: { url: "https://www.googleapis.com/calendar/v3/calendars/primary/events?...", method: "GET" }
[GoogleCalendar] Ответ от Google Calendar API: { status: 200, statusText: "OK" }
[GoogleCalendar] События успешно получены: { itemsCount: 10 }
```

## Пример лога с ошибкой Bad Request

```
[GoogleSignIn] === Обновление токена ===
[GoogleSignIn] GOOGLE_CLIENT_ID (первые 20 символов): 1234567890-abc.apps...
[GoogleSignIn] Запрос на обновление токена: { client_id: "1234567890-abc.apps...", grant_type: "refresh_token" }
[GoogleSignIn] Ответ от API обновления токена: { status: 400, statusText: "Bad Request", ok: false }
[GoogleSignIn] ОШИБКА обновления токена: { 
  status: 400, 
  error: { 
    error: "invalid_grant", 
    error_description: "Token has been expired or revoked." 
  } 
}
```

В этом случае проблема в том, что refresh token истек или был отозван. Нужно переподключить аккаунт.
