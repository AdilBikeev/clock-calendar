# Настройка OAuth для мобильных устройств с нативным всплывающим окном

## Решение: Browser плагин с промежуточной страницей

Для мобильных устройств используется **Browser плагин** (`@capacitor/browser`), который открывает OAuth в нативном всплывающем окне:
- **Android**: Chrome Custom Tabs (нативное всплывающее окно)
- **iOS**: Safari View Controller (нативное всплывающее окно)

После авторизации Google перенаправляет на промежуточную страницу, которая делает deep link обратно в приложение.

## Как это работает

1. **Инициализация OAuth:**
   - Приложение использует Browser плагин для открытия Google авторизации
   - На Android открывается Chrome Custom Tabs (выглядит как нативное всплывающее окно)
   - На iOS открывается Safari View Controller (выглядит как нативное всплывающее окно)

2. **После авторизации:**
   - Google перенаправляет на промежуточную страницу: `http://localhost:3000/oauth/callback?code=...&state=...`
   - Промежуточная страница (`public/oauth/callback.html`) автоматически делает deep link: `com.clockcalendar.app://oauth/callback?code=...&state=...`
   - Система распознает deep link и открывает приложение

3. **Обработка callback:**
   - Приложение получает deep link через событие `appUrlOpen`
   - Извлекаются параметры `code` и `state` из URL
   - Выполняется обмен кода на токены и подключение аккаунта

## Инструкция по настройке Google Cloud Console

1. Откройте [Google Cloud Console](https://console.cloud.google.com/)
2. Выберите ваш проект
3. Перейдите в **APIs & Services** → **Credentials**
4. Найдите ваш **Desktop app** OAuth client
5. Нажмите на него для редактирования
6. В разделе **Authorized redirect URIs** добавьте:
   ```
   http://localhost:3000/oauth/callback
   ```
   **Примечание:** Для продакшена используйте ваш реальный домен, например:
   ```
   https://yourdomain.com/oauth/callback
   ```
7. Сохраните изменения

## Настройка для локальной разработки

Для локальной разработки промежуточная страница доступна по адресу `http://localhost:3000/oauth/callback` через Vite dev server.

**Важно:** Убедитесь, что Vite dev server запущен (`npm run dev`) при тестировании OAuth на мобильных устройствах.

## Настройка для продакшена

Для продакшена нужно:

1. Разместить промежуточную страницу `public/oauth/callback.html` на вашем веб-сервере
2. Обновить redirect URI в `src/services/googleCalendarService.ts`:
   ```typescript
   return 'https://yourdomain.com/oauth/callback'
   ```
3. Обновить redirect URI в Google Cloud Console соответственно

## Преимущества этого подхода

- ✅ **Нативный вид:** Chrome Custom Tabs и Safari View Controller выглядят как нативные всплывающие окна
- ✅ **Безопасность:** OAuth происходит в системном браузере, а не в WebView
- ✅ **UX:** Пользователь видит знакомый интерфейс Google авторизации
- ✅ **Надежность:** Deep links гарантированно возвращают управление приложению

## Настройка Capacitor

В `capacitor.config.ts` настроены deep links:

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

Это обеспечивает обработку кастомной URL схемы как deep link.

## Устранение проблем

### Ошибка: "invalid_request" или "redirect_uri_mismatch"

**Решение:**
- Убедитесь, что redirect URI точно соответствует: `http://localhost:3000/oauth/callback`
- Проверьте, что redirect URI добавлен в Google Cloud Console
- Дождитесь распространения изменений (может занять несколько минут)

### Приложение не открывается после авторизации Google

**Решение:**
- Убедитесь, что в `capacitor.config.ts` настроены deep links с правильной схемой
- Проверьте, что промежуточная страница доступна по адресу `http://localhost:3000/oauth/callback`
- Убедитесь, что Vite dev server запущен при тестировании
- Проверьте, что приложение правильно обрабатывает событие `appUrlOpen`
- Выполните `npx cap sync` после изменений в конфигурации

### Browser открывается полноэкранно вместо всплывающего окна

**Решение:**
- На Android Chrome Custom Tabs автоматически открываются как всплывающее окно
- На iOS убедитесь, что используется `presentationStyle: 'popover'` в настройках Browser
- Проверьте версию Capacitor Browser плагина

### Промежуточная страница не доступна

**Решение:**
- Убедитесь, что Vite dev server запущен (`npm run dev`)
- Проверьте, что файл `public/oauth/callback.html` существует
- Для продакшена убедитесь, что файл размещен на веб-сервере

## Дополнительные ресурсы

- [Capacitor Browser Plugin](https://capacitorjs.com/docs/apis/browser)
- [Capacitor App API - Deep Links](https://capacitorjs.com/docs/apis/app)
- [Google OAuth 2.0 для нативных приложений](https://developers.google.com/identity/protocols/oauth2/native-app?hl=ru)
