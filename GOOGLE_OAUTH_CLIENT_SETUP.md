# Настройка Google OAuth Client для PKCE

## Проблема: "client_secret is missing"

Если вы видите ошибку `client_secret is missing` при попытке подключить Google аккаунт, это означает, что ваш OAuth client создан как **Web application**, который требует `client_secret` даже при использовании PKCE.

## Решение: Создайте OAuth Client как "Desktop app"

### Шаг 1: Создание нового OAuth Client

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. Перейдите в **APIs & Services** → **Credentials**
4. Нажмите **+ CREATE CREDENTIALS** → **OAuth client ID**

### Шаг 2: Выбор типа приложения

⚠️ **ВНИМАНИЕ**: Выберите **Desktop app** (НЕ Web application!)

```
Application type: Desktop app
```

### Шаг 3: Настройка

1. Укажите название (например: "Clock Calendar App")
2. Нажмите **CREATE**

### Шаг 4: Получение Client ID

После создания вы получите:
- **Client ID** - это единственное, что нужно скопировать
- **Client Secret** - НЕ нужен для Desktop app типа с PKCE!

### Шаг 5: Обновление .env файла

Обновите файл `.env` в корне проекта:

```env
GOOGLE_CLIENT_ID=ваш_новый_client_id_здесь
```

**Удалите или закомментируйте** старый Client ID, если он был для Web application типа.

### Шаг 6: Перезапуск приложения

```bash
# Остановите сервер (Ctrl+C)
# Запустите заново:
npm run dev
```

## Проверка

После создания Desktop app OAuth client:
- ✅ PKCE будет работать без `client_secret`
- ✅ Авторизация будет успешной
- ✅ Ошибка "client_secret is missing" исчезнет

## Отличия типов OAuth Client

### Desktop App
- ✅ Не требует `client_secret` для PKCE
- ✅ Подходит для клиентских приложений
- ✅ Redirect URI опционален (можно указать `http://localhost`)
- ✅ Безопасно для браузерных приложений

### Web Application
- ❌ Требует `client_secret` даже с PKCE
- ❌ Нужен серверный прокси или хранение secret в клиенте (небезопасно)
- ⚠️ Redirect URI обязателен и должен точно совпадать

## Важные замечания

1. **Можно иметь несколько OAuth clients**: Вы можете создать Desktop app client и оставить старый Web application client для других целей

2. **Redirect URI для Desktop app**: 
   - Можно оставить пустым
   - Или указать: `http://localhost` (для разработки)
   - Или: `http://localhost:3000/oauth/google/callback`

3. **Безопасность**: Desktop app тип с PKCE так же безопасен, как и Web application, но без необходимости в `client_secret`

## Устранение неполадок

- **Ошибка сохраняется**: Убедитесь, что вы используете Client ID от Desktop app типа, а не от Web application
- **Redirect URI mismatch**: Для Desktop app это обычно не проблема, но если возникло - добавьте `http://localhost` в authorized redirect URIs
- **Не работает в продакшене**: Убедитесь, что используете правильный redirect URI для вашего домена

## Дополнительная информация

Для более подробной информации см. [Google OAuth 2.0 для Desktop приложений](https://developers.google.com/identity/protocols/oauth2/native-app)
