# Устранение проблем с OAuth на Android

## Ошибка: "Access blocked: invalid request"

Эта ошибка обычно означает, что redirect URI не совпадает с зарегистрированным в Google Cloud Console.

### Шаги для диагностики:

1. **Проверьте логи в консоли:**
   - Откройте DevTools в Android Studio или используйте `adb logcat`
   - Найдите логи с текстом "Building OAuth URL with redirect URI:"
   - Скопируйте значение redirect URI

2. **Проверьте redirect URI в Google Cloud Console:**
   - Откройте Google Cloud Console → APIs & Services → Credentials
   - Найдите ваш Desktop app OAuth client
   - Проверьте раздел **Authorized redirect URIs**
   - Убедитесь, что redirect URI **точно совпадает** (включая протокол, порт, путь)

3. **Важные моменты:**
   - Redirect URI должен быть **точно таким же**, как в коде
   - Учитывайте регистр символов
   - Учитывайте наличие/отсутствие слеша в конце
   - `http://localhost:3000/oauth/google/callback` ≠ `http://localhost:3000/oauth/google/callback/`
   - `http://localhost:3000/oauth/google/callback` ≠ `https://localhost:3000/oauth/google/callback`

### Решение для Android:

Для Android устройств `localhost` не работает, так как это адрес компьютера, а не устройства.

**Вариант 1: Использовать ngrok (рекомендуется)**

1. Запустите ngrok:
   ```bash
   ngrok http 3000
   ```

2. Скопируйте HTTPS URL (например: `https://abc123.ngrok.io`)

3. Добавьте в `.env`:
   ```env
   VITE_MOBILE_REDIRECT_URI=https://abc123.ngrok.io/oauth/google/callback
   ```

4. В Google Cloud Console добавьте redirect URI:
   ```
   https://abc123.ngrok.io/oauth/google/callback
   ```

5. Перезапустите dev server

**Вариант 2: Использовать nip.io**

1. Узнайте IP-адрес компьютера (например: `192.168.1.100`)

2. Добавьте в `.env`:
   ```env
   VITE_MOBILE_REDIRECT_URI=http://192.168.1.100.nip.io:3000/oauth/google/callback
   ```

3. В Google Cloud Console добавьте redirect URI:
   ```
   http://192.168.1.100.nip.io:3000/oauth/google/callback
   ```

### Проверка соответствия redirect URI:

После добавления логирования в коде, проверьте в консоли:

```
Building OAuth URL with redirect URI: http://localhost:3000/oauth/google/callback
```

Это значение должно **точно совпадать** с тем, что в Google Cloud Console.

### Дополнительные проверки:

1. **Убедитесь, что Client ID правильный:**
   - Проверьте, что используете Client ID для Desktop app OAuth client
   - Client ID должен начинаться с правильного префикса

2. **Проверьте переменные окружения:**
   - Убедитесь, что `.env` файл существует
   - Убедитесь, что переменные начинаются с `VITE_`
   - Перезапустите dev server после изменения `.env`

3. **Проверьте, что промежуточная страница доступна:**
   - Откройте redirect URI в браузере на компьютере
   - Должна открыться страница "Авторизация..."
   - Если страница не открывается, проверьте, что Vite dev server запущен

### Если проблема сохраняется:

1. Скопируйте полный OAuth URL из логов (первые 200 символов)
2. Проверьте, что все параметры корректны
3. Убедитесь, что в Google Cloud Console добавлен **именно тот** redirect URI, который используется в коде
4. Дождитесь распространения изменений в Google Cloud Console (может занять несколько минут)
