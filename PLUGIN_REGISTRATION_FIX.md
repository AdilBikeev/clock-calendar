# Исправление регистрации Capacitor плагина

## Проблема

Ошибка: `"GoogleSignIn" plugin is not implemented on android`

Это означает, что Capacitor не может найти нативную реализацию плагина.

## Решение

### 1. Убедитесь, что плагин правильно расположен

Плагин должен быть в:
```
android/app/src/main/java/com/clockcalendar/app/GoogleSignInPlugin.java
```

### 2. Пересоберите проект

После добавления плагина необходимо пересобрать Android проект:

```bash
# В Android Studio:
# Build → Clean Project
# Build → Rebuild Project

# Или через командную строку:
cd android
./gradlew clean
./gradlew assembleDebug
```

### 3. Синхронизируйте Capacitor

```bash
npm run build
npx cap sync
```

### 4. Проверьте, что плагин компилируется

В Android Studio:
1. Откройте `GoogleSignInPlugin.java`
2. Проверьте, нет ли ошибок компиляции (красные подчеркивания)
3. Убедитесь, что все импорты правильные

### 5. Проверьте логи компиляции

```bash
cd android
./gradlew assembleDebug --info | grep -i "GoogleSignIn"
```

Должно быть видно, что класс компилируется.

## Альтернативное решение: Явная регистрация плагина

Если автоматическая регистрация не работает, можно явно зарегистрировать плагин в `MainActivity.java`:

```java
package com.clockcalendar.app;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Явная регистрация плагина
        ArrayList<Class<? extends Plugin>> plugins = new ArrayList<>();
        plugins.add(com.clockcalendar.app.GoogleSignInPlugin.class);
        
        this.init(savedInstanceState, plugins);
    }
}
```

## Проверка работы

После пересборки проверьте логи:

```bash
adb logcat -s Capacitor/Console | grep -i "GoogleSignIn"
```

Должно быть:
```
[GoogleSignIn] === Начало конфигурации Google Sign In ===
[GoogleSignInPlugin] Configuring Google Sign In with webClientId: ...
[GoogleSignInPlugin] Google Sign In configured successfully
```

## Если проблема сохраняется

1. Убедитесь, что используете правильную версию Capacitor (8.0.0)
2. Проверьте, что все зависимости установлены
3. Попробуйте удалить `android/app/build` и пересобрать
4. Проверьте, что имя плагина в `@CapacitorPlugin(name = "GoogleSignIn")` совпадает с именем в `registerPlugin('GoogleSignIn')`
