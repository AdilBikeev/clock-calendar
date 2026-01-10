/**
 * Утилиты для генерации уникальных идентификаторов
 */

// Counter для дополнительной уникальности (инкрементируется при каждом вызове)
let eventIdCounter = 0

/**
 * Генерирует уникальный идентификатор для локального события
 * Использует комбинацию timestamp, performance.now(), счетчика и случайного числа
 * для максимальной уникальности
 */
export const generateLocalEventId = (): string => {
  eventIdCounter++
  const timestamp = Date.now()
  const performanceTime = typeof performance !== 'undefined' ? performance.now() : Math.random() * 1000
  const random = Math.random().toString(36).substring(2, 11)
  const counter = eventIdCounter.toString(36).padStart(6, '0')
  
  return `local-${timestamp}-${counter}-${performanceTime.toString(36).substring(2, 10)}-${random}`
}

/**
 * Генерирует идентификатор для события из внешнего источника
 * Формат: {source}-{accountId}-{externalId}
 * Гарантирует уникальность через префикс источника и accountId
 */
export const generateExternalEventId = (
  source: 'google' | string,
  accountId: string,
  externalId: string
): string => {
  return `${source}-${accountId}-${externalId}`
}

/**
 * Проверяет, является ли ID локальным событием
 */
export const isLocalEventId = (id: string): boolean => {
  return id.startsWith('local-')
}

/**
 * Проверяет, является ли ID событием из внешнего источника
 */
export const isExternalEventId = (id: string, source?: string): boolean => {
  if (source) {
    return id.startsWith(`${source}-`)
  }
  // Проверяем на известные внешние источники
  return id.startsWith('google-') || (!id.startsWith('local-') && id.includes('-'))
}
