# Настройка Google OAuth 2.0 для синхронизации календаря

Для работы синхронизации с Google Calendar необходимо настроить OAuth 2.0.

## Реализация OAuth 2.0 с PKCE

Приложение использует **OAuth 2.0 с PKCE (Proof Key for Code Exchange)** для безопасной авторизации без необходимости в серверном прокси или `client_secret`.

### Что такое PKCE?

PKCE - это расширение OAuth 2.0 (RFC 7636), которое позволяет публичным клиентам (веб-приложениям, мобильным приложениям) безопасно выполнять OAuth flow без необходимости хранить `client_secret` в клиентском коде.

### Как это работает:

1. **Генерация code_verifier**: Приложение генерирует случайную строку (code_verifier)
2. **Создание code_challenge**: Вычисляется SHA256 хэш от code_verifier и кодируется в base64url (code_challenge)
3. **Авторизация**: Пользователь перенаправляется на Google с code_challenge
4. **Обмен кода на токены**: При возврате с кодом авторизации, приложение отправляет code_verifier вместо client_secret

Это обеспечивает высокий уровень безопасности без необходимости в серверном компоненте.

### Альтернативный вариант: Серверный прокси

Если вы предпочитаете использовать серверный прокси (например, для дополнительной логики или мониторинга), вы можете настроить переменную окружения `TOKEN_PROXY_URL`. В этом случае приложение будет использовать прокси вместо прямого обмена через PKCE.

## Настройка Google Cloud Console

### Важно: Тип OAuth Client

Google OAuth для **веб-приложений** (Web application) требует `client_secret` даже с PKCE. Для полностью клиентского приложения без сервера нужно создать OAuth client как **Desktop app**.

### Вариант 1: Desktop App (Рекомендуется для PKCE без сервера)

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **Create Credentials** → **OAuth client ID**
5. **Важно**: Выберите тип приложения **Desktop app** (не Web application!)
6. Укажите название клиента (например, "Calendar App")
7. Сохраните **Client ID** - это всё, что нужно для PKCE!

**Преимущества Desktop app типа:**
- ✅ Не требует `client_secret` для PKCE
- ✅ Полностью клиентская реализация
- ✅ Безопасно работает в браузере
- ✅ Redirect URI не нужно указывать (или можно указать `http://localhost`)

**Важно**: Используйте именно тип "Desktop app", а не "Web application". Web application требует client_secret даже с PKCE.

## Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Google OAuth 2.0 Client ID (обязательно!)
# Получите Client ID от OAuth client типа "Desktop app" в Google Cloud Console
GOOGLE_CLIENT_ID=your_desktop_app_client_id_here

# Client Secret (может потребоваться для Desktop app в браузере)
# Если Google требует client_secret, скопируйте его из Google Cloud Console и добавьте сюда
# ⚠️ ВНИМАНИЕ: Client Secret будет виден в клиентском коде (небезопасно для продакшена!)
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Redirect URI (опционально, по умолчанию используется текущий origin + /oauth/google/callback)
# Для Desktop app типа можно оставить пустым или указать http://localhost
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/google/callback
```

**Минимальная конфигурация**: 
- Обязательно: `GOOGLE_CLIENT_ID` 
- Может потребоваться: `GOOGLE_CLIENT_SECRET` (если Google требует его для Desktop app в браузере)

**Как получить Client Secret:**
1. Откройте [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Найдите ваш OAuth client (Desktop app или Web application)
3. Нажмите на название клиента для редактирования
4. Скопируйте **Client Secret** (если его нет, создайте новый)
5. Добавьте в `.env` файл

## Включение Google Calendar API

1. В Google Cloud Console перейдите в **APIs & Services** → **Library**
2. Найдите **Google Calendar API**
3. Нажмите **Enable**

## Установка зависимостей

Убедитесь, что установлены необходимые зависимости:

```bash
npm install react-icons
```

## Тестирование

После настройки:

1. Запустите приложение: `npm run dev`
2. Откройте настройки (иконка шестеренки)
3. Нажмите "Добавить аккаунт"
4. Выберите "Google Calendar"
5. Авторизуйтесь в Google
6. После успешной авторизации аккаунт должен появиться в списке подключенных аккаунтов
7. События из Google Calendar автоматически синхронизируются

## Устранение неполадок

- **Ошибка "Invalid client"**: Проверьте правильность `GOOGLE_CLIENT_ID` в `.env` файле
- **Ошибка "Redirect URI mismatch"**: Убедитесь, что redirect URI в Google Cloud Console точно совпадает с используемым в приложении (по умолчанию: `http://localhost:3000/oauth/google/callback`)
- **Ошибка "Code verifier not found"**: OAuth flow был прерван или браузер очистил sessionStorage. Попробуйте подключить аккаунт заново
- **Ошибка "Invalid OAuth state"**: Проблема с CSRF защитой. Убедитесь, что cookies и sessionStorage разрешены в браузере
- **События не синхронизируются**: 
  - Проверьте, что Google Calendar API включен в Google Cloud Console
  - Убедитесь, что аккаунт успешно подключен (отображается в настройках)
  - Проверьте консоль браузера на наличие ошибок
- **Проблемы с CORS**: PKCE работает полностью на клиентской стороне, проблемы с CORS не должны возникать

## Технические детали

### Безопасность PKCE

PKCE обеспечивает защиту от:
- **Code interception attacks**: code_verifier никогда не передается в URL
- **Code injection attacks**: code_challenge проверяется на сервере Google
- **Man-in-the-middle attacks**: используется криптографически стойкий хэш (SHA256)

### Совместимость

- ✅ Все современные браузеры (Chrome, Firefox, Safari, Edge)
- ✅ Требуется поддержка Web Crypto API (встроена во все современные браузеры)
- ✅ Работает без серверного компонента
- ✅ Не требует client_secret
