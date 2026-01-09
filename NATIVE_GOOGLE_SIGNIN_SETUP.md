# Настройка нативной авторизации Google без redirect_uri

## Решение

Создан Capacitor плагин для нативной авторизации Google, который работает аналогично `@react-native-google-signin/google-signin`:
- ✅ **НЕ требует redirect_uri**
- ✅ Использует нативную авторизацию через Google Play Services
- ✅ Работает напрямую через нативные SDK Android

## Что было сделано

1. Создан Capacitor плагин `GoogleSignIn` в `src/plugins/GoogleSignIn.ts`
2. Создана Android реализация в `android/app/src/main/java/com/clockcalendar/app/GoogleSignInPlugin.java`
3. Обновлен сервис `googleSignInService.ts` для использования плагина
4. Добавлены зависимости Google Sign-In в `build.gradle`

## Настройка

### 1. Добавить зависимости в build.gradle

Зависимости уже добавлены в `android/app/build.gradle`:
```gradle
implementation 'com.google.android.gms:play-services-auth:21.2.0'
```

### 2. Зарегистрировать плагин в MainActivity

Откройте `android/app/src/main/java/com/clockcalendar/app/MainActivity.java` и добавьте:

```java
package com.clockcalendar.app;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Регистрируем GoogleSignIn плагин
        this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
            add(com.clockcalendar.app.GoogleSignInPlugin.class);
        }});
    }
}
```

### 3. Настроить переменные окружения

В файле `.env` установите:

```env
# Web OAuth Client ID (используется для получения idToken и serverAuthCode)
VITE_GOOGLE_CLIENT_ID=ваш_web_client_id.apps.googleusercontent.com
```

**ВАЖНО:** Используйте **Web OAuth Client ID**, не Android Client ID!

### 4. Синхронизировать с Android

```bash
npm run build
npx cap sync
```

### 5. Собрать и запустить

```bash
# В Android Studio или через командную строку
cd android
./gradlew assembleDebug
```

## Как это работает

1. Пользователь нажимает "Подключить Google аккаунт"
2. Вызывается `GoogleSignIn.signIn()` из плагина
3. Открывается **нативное окно авторизации Google** (не браузер!)
4. После авторизации возвращается `GoogleSignInAccount` через `onActivityResult`
5. Получаем `accessToken` через `GoogleAuthUtil.getToken()`
6. Получаем `idToken` и `serverAuthCode` из `GoogleSignInAccount`
7. Аккаунт добавляется в приложение

**Никакого redirect_uri не требуется!**

## Преимущества

- ✅ Не требует redirect_uri
- ✅ Не требует промежуточных HTTPS страниц
- ✅ Не требует deep links
- ✅ Работает напрямую через Google Play Services
- ✅ Более безопасно и быстро
- ✅ Нативный UX (нативное окно авторизации)

## Отличия от веб-авторизации

| Веб-авторизация | Нативная авторизация |
|----------------|---------------------|
| Требует redirect_uri | ❌ Не требуется |
| Требует HTTPS для sensitive scopes | ❌ Не требуется |
| Открывает браузер | ✅ Нативное окно |
| Требует промежуточную страницу | ❌ Не требуется |
| Работает через OAuth flow | ✅ Работает через Google Play Services |

## Устранение проблем

### Проблема: Плагин не найден

**Решение:**
1. Убедитесь, что плагин зарегистрирован в `MainActivity`
2. Выполните `npx cap sync`
3. Пересоберите приложение

### Проблема: "Not configured"

**Решение:**
1. Убедитесь, что `configureGoogleSignIn()` вызван при запуске приложения
2. Проверьте, что `VITE_GOOGLE_CLIENT_ID` установлен
3. Проверьте логи на наличие ошибок конфигурации

### Проблема: "PLAY_SERVICES_NOT_AVAILABLE"

**Решение:**
1. Убедитесь, что Google Play Services установлены на устройстве
2. Обновите Google Play Services через Play Store
3. Проверьте, что устройство поддерживает Google Play Services

### Проблема: Ошибки компиляции Java

**Решение:**
1. Убедитесь, что зависимости добавлены в `build.gradle`
2. Синхронизируйте Gradle в Android Studio
3. Очистите и пересоберите проект: `./gradlew clean build`

## Проверка работы

### Логи

```bash
adb logcat -s GoogleSignInPlugin | grep -E "(configure|signIn|токены)"
```

Ожидаемые логи:
```
[GoogleSignIn] === Начало конфигурации Google Sign In ===
[GoogleSignIn] Google Sign In настроен успешно
[GoogleSignIn] === Начало авторизации через Google Sign In ===
[GoogleSignIn] signIn() выполнен, получен userInfo
[GoogleSignIn] Токены получены
[GoogleSignIn] Авторизация успешна
```

### Тестирование

1. Запустите приложение на Android устройстве
2. Перейдите в настройки → Добавить аккаунт → Google
3. Должно открыться **нативное окно авторизации** (не браузер!)
4. После авторизации аккаунт должен быть добавлен автоматически

## Дополнительные ресурсы

- [Google Sign-In для Android](https://developers.google.com/identity/sign-in/android)
- [Capacitor Plugin Development](https://capacitorjs.com/docs/plugins)
- [Google Play Services Auth](https://developers.google.com/android/guides/overview)
