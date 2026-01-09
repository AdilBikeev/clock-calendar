# Настройка OAuth для мобильных устройств

## Решение: WebView с loopback redirect

Для мобильных устройств используется **встроенный WebView** приложения для открытия OAuth. Это позволяет корректно обработать redirect на loopback интерфейс (`127.0.0.1:8080`) внутри приложения.

После авторизации Google перенаправляет на `http://127.0.0.1:8080/oauth/google/callback`, который обрабатывается внутри WebView приложения.

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
   http://127.0.0.1:8080/oauth/google/callback
   ```
7. Сохраните изменения

## Настройка для локальной разработки

Для локальной разработки используется loopback интерфейс (`127.0.0.1:8080`), который обрабатывается внутри WebView приложения. Дополнительная настройка не требуется.

## Настройка для продакшена

Для продакшена используется тот же подход с loopback интерфейсом. Дополнительная настройка не требуется.

## Преимущества этого подхода

- ✅ **Простота:** Не требует промежуточных страниц или deep links
- ✅ **Надежность:** Redirect обрабатывается внутри приложения автоматически
- ✅ **Совместимость:** Работает на Android и iOS без дополнительной настройки
- ✅ **Соответствие стандартам:** Использует loopback интерфейс согласно RFC 8252

## Настройка Capacitor

В `capacitor.config.ts` настроен Android scheme:

```typescript
server: {
  androidScheme: 'https',
  cleartext: true
}
```

Это позволяет обрабатывать HTTP запросы на loopback интерфейс внутри WebView.

## Устранение проблем

### Ошибка: "invalid_request" или "redirect_uri_mismatch"

**Решение:**
- Убедитесь, что redirect URI точно соответствует: `http://127.0.0.1:8080/oauth/google/callback`
- Проверьте, что redirect URI добавлен в Google Cloud Console
- Дождитесь распространения изменений (может занять несколько минут)

### Ошибка 400 после выбора аккаунта на Android

**Решение:**
- Убедитесь, что используется `window.location.href` вместо Browser плагина для мобильных устройств
- Проверьте, что redirect URI в коде соответствует тому, что в Google Cloud Console
- Убедитесь, что в `capacitor.config.ts` настроен `cleartext: true` для обработки HTTP запросов
- Выполните `npx cap sync` после изменений в конфигурации

## Дополнительные ресурсы

- [Capacitor Browser Plugin](https://capacitorjs.com/docs/apis/browser)
- [Capacitor App API - Deep Links](https://capacitorjs.com/docs/apis/app)
- [Google OAuth 2.0 для нативных приложений](https://developers.google.com/identity/protocols/oauth2/native-app?hl=ru)
