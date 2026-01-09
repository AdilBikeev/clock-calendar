# Настройка OAuth для Android устройств

## Проблема с redirect URI

Google **не принимает IP-адреса локальной сети** для redirect URI в Desktop app OAuth clients. Разрешены только:
- `http://localhost` или `http://127.0.0.1` с портом
- Публичные домены с TLD (например, `.com`, `.org`)

Но когда OAuth открывается в системном браузере на Android устройстве, redirect на `localhost` не вернется в приложение, так как это адрес компьютера, а не устройства.

## Решение: Использование туннеля (ngrok) или nip.io

### Вариант 1: Использование ngrok (рекомендуется)

1. **Установите ngrok:**
   - Скачайте с [ngrok.com](https://ngrok.com/download)
   - Или через npm: `npm install -g ngrok`

2. **Запустите ngrok туннель:**
   ```bash
   ngrok http 3000
   ```
   Это создаст публичный URL, например: `https://abc123.ngrok.io`

3. **Добавьте в `.env` файл:**
   ```env
   VITE_MOBILE_REDIRECT_URI=https://abc123.ngrok.io/oauth/google/callback
   ```

4. **В Google Cloud Console добавьте redirect URI:**
   - Откройте Google Cloud Console → APIs & Services → Credentials
   - Найдите ваш Desktop app OAuth client
   - В разделе **Authorized redirect URIs** добавьте:
     ```
     https://abc123.ngrok.io/oauth/google/callback
     ```
   - Сохраните изменения

5. **Перезапустите dev server:**
   ```bash
   npm run dev
   ```

**Важно:** URL ngrok меняется при каждом запуске (в бесплатной версии). Обновляйте redirect URI в Google Cloud Console и `.env` файле при каждом новом запуске ngrok.

### Вариант 2: Использование nip.io

1. **Узнайте IP-адрес вашего компьютера в локальной сети:**
   - Windows: `ipconfig` (ищите IPv4 адрес)
   - Mac/Linux: `ifconfig` или `ip addr`

2. **Создайте домен через nip.io:**
   Если ваш IP-адрес `192.168.1.100`, используйте: `192.168.1.100.nip.io`

3. **Настройте Vite для работы с этим доменом:**
   В `vite.config.ts` убедитесь, что `host: true` установлен (уже настроено)

4. **Добавьте в `.env` файл:**
   ```env
   VITE_MOBILE_REDIRECT_URI=http://192.168.1.100.nip.io:3000/oauth/google/callback
   ```

5. **В Google Cloud Console добавьте redirect URI:**
   ```
   http://192.168.1.100.nip.io:3000/oauth/google/callback
   ```

**Примечание:** nip.io работает только в локальной сети. Убедитесь, что Android устройство и компьютер в одной сети.

### Вариант 3: Использование реального домена

Если у вас есть реальный домен:

1. **Настройте DNS:**
   - Создайте A-запись, указывающую на IP-адрес вашего сервера
   - Или используйте CNAME для поддомена

2. **Настройте SSL сертификат:**
   - Используйте Let's Encrypt или другой бесплатный SSL

3. **Добавьте в `.env` файл:**
   ```env
   VITE_MOBILE_REDIRECT_URI=https://yourdomain.com/oauth/google/callback
   ```

4. **В Google Cloud Console добавьте redirect URI:**
   ```
   https://yourdomain.com/oauth/google/callback
   ```

## Как это работает

1. Пользователь нажимает "Подключить Google аккаунт"
2. Открывается системный браузер (Chrome Custom Tabs) с Google авторизацией
3. Пользователь выбирает аккаунт и авторизуется
4. Google перенаправляет на промежуточную страницу (через ngrok/nip.io/домен)
5. Промежуточная страница автоматически делает deep link: `com.clockcalendar.app://oauth/callback?code=...&state=...`
6. Система распознает deep link и открывает приложение
7. Приложение обрабатывает callback и завершает OAuth flow

## Устранение проблем

### Ошибка: "Invalid Redirect: must end with a public top-level domain"

**Решение:**
- Используйте ngrok, nip.io или реальный домен
- Не используйте IP-адреса локальной сети

### ngrok URL меняется при каждом запуске

**Решение:**
- В бесплатной версии ngrok URL меняется
- Обновляйте redirect URI в Google Cloud Console и `.env` файле
- Или используйте платную версию ngrok с фиксированным доменом

### Промежуточная страница не доступна

**Решение:**
- Убедитесь, что ngrok туннель запущен
- Убедитесь, что Vite dev server запущен (`npm run dev`)
- Проверьте, что URL в `.env` файле совпадает с URL в Google Cloud Console

### Deep link не открывает приложение

**Решение:**
- Убедитесь, что в `capacitor.config.ts` настроены deep links:
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
- Выполните `npx cap sync` после изменений
- Проверьте, что приложение правильно обрабатывает событие `appUrlOpen`
