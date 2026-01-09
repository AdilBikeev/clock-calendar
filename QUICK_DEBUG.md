# Быстрая диагностика Bad Request

## Быстрая проверка (5 минут)

### 1. Проверьте логи Android

```bash
# Запустите это в терминале и выполните синхронизацию в приложении
adb logcat -s GoogleSignIn GoogleCalendar | grep -E "(ОШИБКА|ERROR|Bad Request|400)"

# Windows
# adb logcat -s GoogleSignIn GoogleCalendar | Select-String -Pattern "(ОШИБКА|ERROR|Bad Request|400)" | Out-File error_logs.txt
```

### 2. Проверьте ключевые параметры

Ищите в логах следующие строки:

#### ✅ Правильная конфигурация:
```
[GoogleSignIn] GOOGLE_CLIENT_ID (полная длина): 45-50
[GoogleSignIn] Конфигурация Google Sign In: { webClientId: "...", offlineAccess: true }
[GoogleSignIn] Google Sign In настроен успешно
```

#### ❌ Проблемы:
```
[GoogleSignIn] GOOGLE_CLIENT_ID пустой? true  ← ПРОБЛЕМА: Client ID не установлен
[GoogleSignIn] ОШИБКА настройки Google Sign In  ← ПРОБЛЕМА: Ошибка конфигурации
```

### 3. Проверьте процесс авторизации

#### ✅ Успешная авторизация:
```
[GoogleSignIn] Токены получены: { hasAccessToken: true, hasRefreshToken: true }
[GoogleSignIn] Авторизация успешна
```

#### ❌ Проблемы:
```
[GoogleSignIn] ОШИБКА авторизации Google: { code: "SIGN_IN_CANCELLED" }  ← Пользователь отменил
[GoogleSignIn] ОШИБКА авторизации Google: { code: "PLAY_SERVICES_NOT_AVAILABLE" }  ← Нет Google Play Services
```

### 4. Проверьте обновление токена

#### ✅ Успешное обновление:
```
[GoogleSignIn] Ответ от API обновления токена: { status: 200, ok: true }
[GoogleSignIn] Токен успешно обновлен
```

#### ❌ Bad Request при обновлении:
```
[GoogleSignIn] ОШИБКА обновления токена: { 
  status: 400, 
  error: { error: "invalid_grant" } 
}  ← Refresh token истек или неверный Client ID
```

### 5. Проверьте запросы к Calendar API

#### ✅ Успешный запрос:
```
[GoogleCalendar] Ответ от Google Calendar API: { status: 200, statusText: "OK" }
[GoogleCalendar] События успешно получены: { itemsCount: 10 }
```

#### ❌ Bad Request при запросе:
```
[GoogleCalendar] ОШИБКА запроса к Google Calendar API: { 
  status: 400, 
  error: { error: "invalid_request", error_description: "..." } 
}  ← Неверные параметры запроса
```

## Типичные ошибки и быстрые решения

### Ошибка: "GOOGLE_CLIENT_ID пустой?"

**Решение:**
1. Проверьте файл `.env` или переменные окружения
2. Убедитесь, что `VITE_GOOGLE_CLIENT_ID_ANDROID` установлен
3. Перезапустите приложение после изменения `.env`

### Ошибка: "invalid_grant" при обновлении токена

**Решение:**
1. Удалите аккаунт в настройках приложения
2. Переподключите аккаунт Google
3. Проверьте, что используется правильный Android Client ID

### Ошибка: "invalid_client"

**Решение:**
1. Проверьте, что используется Android OAuth Client ID (не Web Client ID)
2. Убедитесь, что SHA-1 fingerprint добавлен в Google Cloud Console
3. Проверьте формат Client ID (должен начинаться с цифр и содержать `.apps.googleusercontent.com`)

### Ошибка: "Bad Request" при запросе к Calendar API

**Решение:**
1. Проверьте формат дат в логах (`timeMin`, `timeMax` должны быть в ISO 8601)
2. Убедитесь, что токен имеет правильные scopes
3. Проверьте, что Google Calendar API включен в Google Cloud Console

## Команды для быстрой диагностики

```bash
# 1. Просмотр всех ошибок
adb logcat -s GoogleSignIn GoogleCalendar | grep -i "ошибка\|error\|bad request\|400"

# 2. Просмотр конфигурации
adb logcat -s GoogleSignIn | grep -E "(конфигурация|GOOGLE_CLIENT_ID|настроен)"

# 3. Просмотр процесса авторизации
adb logcat -s GoogleSignIn | grep -E "(авторизация|signIn|токены)"

# 4. Просмотр запросов к API
adb logcat -s GoogleCalendar | grep -E "(запрос|ответ|API)"

# 5. Сохранение всех логов в файл
adb logcat -s GoogleSignIn GoogleCalendar > debug_logs.txt
```

## Что отправлять при запросе помощи

Если проблема не решена, соберите следующую информацию:

1. **Логи с ошибкой:**
   ```bash
   adb logcat -s GoogleSignIn GoogleCalendar > error_logs.txt
   ```

2. **Конфигурация (без секретных данных):**
   - Первые 20 символов `GOOGLE_CLIENT_ID`
   - Длина `GOOGLE_CLIENT_ID`
   - Платформа (android/ios/web)

3. **Описание проблемы:**
   - Когда возникает ошибка (при авторизации, синхронизации, обновлении токена)
   - Текст ошибки из логов
   - Статус код (400, 401, 403 и т.д.)

4. **Проверенные пункты:**
   - [ ] Client ID установлен и не пустой
   - [ ] Используется Android OAuth Client ID
   - [ ] SHA-1 fingerprint добавлен в Google Cloud Console
   - [ ] Google Calendar API включен
   - [ ] Scopes указаны правильно
