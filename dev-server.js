/**
 * Простой HTTP сервер для разработки без зависимостей от ws
 * Использует только встроенные модули Node.js
 */

const http = require('http')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const PORT = 3000
const HOST = '0.0.0.0'
const DIST_DIR = path.join(__dirname, 'dist')

// MIME типы
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf'
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('404 Not Found')
      return
    }

    const mimeType = getMimeType(filePath)
    res.writeHead(200, { 'Content-Type': mimeType })
    res.end(data)
  })
}

function handleRequest(req, res) {
  // Поддержка относительных URL (если нет host заголовка)
  const host = req.headers.host || `localhost:${PORT}`
  const url = new URL(req.url || '/', `http://${host}`)
  let filePath = url.pathname

  // Все маршруты, включая OAuth callback, возвращают index.html для SPA
  if (filePath.startsWith('/oauth/') || (!path.extname(filePath) && filePath !== '/')) {
    filePath = '/index.html'
  }

  // Безопасность: предотвращаем выход за пределы dist директории
  // Убираем начальный слеш для корректной работы path.join
  const relativePath = filePath === '/' ? 'index.html' : filePath.replace(/^\//, '')
  const fullPath = path.join(DIST_DIR, relativePath)
  const resolvedPath = path.normalize(fullPath)

  // Проверяем безопасность пути (кроссплатформенная проверка)
  const normalizedDistDir = path.resolve(DIST_DIR)
  const normalizedResolvedPath = path.resolve(resolvedPath)
  
  if (!normalizedResolvedPath.startsWith(normalizedDistDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    res.end('403 Forbidden')
    return
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Если файл не найден, пробуем index.html (для SPA роутинга)
      const indexPath = path.join(DIST_DIR, 'index.html')
      serveFile(indexPath, res)
      return
    }

    serveFile(resolvedPath, res)
  })
}

const server = http.createServer(handleRequest)

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 Development server running at:`)
  console.log(`   Local:   http://localhost:${PORT}`)
  console.log(`   Network: http://${HOST}:${PORT}\n`)
  console.log('📦 Note: Hot Module Replacement (HMR) is disabled.')
  console.log('   Changes will require a manual page refresh.\n')
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`)
    console.error(`   Please stop the other server or change the PORT in dev-server.js\n`)
  } else {
    console.error('❌ Server error:', err)
  }
  process.exit(1)
})
