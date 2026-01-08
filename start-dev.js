/**
 * Скрипт для запуска dev-сервера и webpack watch одновременно
 * Использует только встроенные модули Node.js
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting development server...\n')

// Определяем команду для npx в зависимости от платформы
const isWindows = process.platform === 'win32'

// Путь к dev-server.js
const devServerPath = path.join(__dirname, 'dev-server.js')

// Для Windows используем cmd.exe для запуска npx
// Для других платформ используем прямое выполнение
const webpackArgs = ['webpack', '--mode', 'development', '--watch']

let webpackProcess

if (isWindows) {
  // На Windows используем cmd /c для правильной обработки путей с пробелами
  webpackProcess = spawn('cmd', ['/c', 'npx', ...webpackArgs], {
    stdio: 'inherit',
    cwd: __dirname
  })
} else {
  webpackProcess = spawn('npx', webpackArgs, {
    stdio: 'inherit',
    cwd: __dirname
  })
}

// Обработка ошибок запуска webpack
webpackProcess.on('error', (err) => {
  console.error('\n❌ Failed to start webpack:', err.message)
  process.exit(1)
})

// Даем время webpack собрать проект первый раз
setTimeout(() => {
  // Запускаем простой HTTP сервер
  // Используем process.execPath для получения пути к node
  const serverProcess = spawn(process.execPath, [devServerPath], {
    stdio: 'inherit',
    cwd: __dirname
  })
  
  // Обработка ошибок запуска сервера
  serverProcess.on('error', (err) => {
    console.error('\n❌ Failed to start server:', err.message)
    webpackProcess.kill()
    process.exit(1)
  })

  // Обработка завершения процессов
  const cleanup = () => {
    console.log('\n\n🛑 Stopping development server...')
    if (isWindows) {
      // На Windows используем taskkill для корректного завершения дочерних процессов
      webpackProcess.kill()
      serverProcess.kill()
    } else {
      webpackProcess.kill('SIGINT')
      serverProcess.kill('SIGINT')
    }
    setTimeout(() => process.exit(0), 1000)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
  
  // Для Windows также обрабатываем событие выхода
  if (isWindows) {
    process.on('exit', () => {
      webpackProcess.kill()
      serverProcess.kill()
    })
  }

  webpackProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error('\n❌ Webpack process exited with code', code)
      serverProcess.kill()
      process.exit(code)
    }
  })

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error('\n❌ Server process exited with code', code)
      webpackProcess.kill()
      process.exit(code)
    }
  })
}, 2000)
