const fs = require('fs');
const path = require('path');

const pluginsFilePath = path.join(__dirname, '../android/app/src/main/assets/capacitor.plugins.json');

// Определяем кастомный плагин, который нужно добавить
const customPlugin = {
    "pkg": "GoogleSignIn",
    "classpath": "com.clockcalendar.app.GoogleSignInPlugin"
};

// Проверяем существование файла
if (!fs.existsSync(pluginsFilePath)) {
    console.warn(`⚠️  Файл ${pluginsFilePath} не найден. Пропускаем добавление кастомного плагина.`);
    process.exit(0);
}

try {
    // Читаем существующий файл
    const content = fs.readFileSync(pluginsFilePath, 'utf8');
    let plugins = JSON.parse(content);
    
    // Проверяем, есть ли уже запись для нашего плагина
    const pluginExists = plugins.some(plugin => 
        plugin.classpath === customPlugin.classpath
    );
    
    if (!pluginExists) {
        // Добавляем кастомный плагин
        plugins.push(customPlugin);
        
        // Сохраняем файл с правильным форматированием
        const formattedContent = JSON.stringify(plugins, null, '\t');
        fs.writeFileSync(pluginsFilePath, formattedContent, 'utf8');
        
        console.log('✅ Кастомный плагин GoogleSignIn добавлен в capacitor.plugins.json');
    } else {
        console.log('ℹ️  Кастомный плагин GoogleSignIn уже присутствует в capacitor.plugins.json');
    }
} catch (error) {
    console.error('❌ Ошибка при обновлении capacitor.plugins.json:', error.message);
    process.exit(1);
}