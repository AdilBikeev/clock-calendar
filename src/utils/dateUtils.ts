/**
 * Утилиты для работы с датами
 */

/**
 * Парсит строку даты в формате "YYYY-MM-DDTHH:mm:ss" в объект Date
 * Сохраняет локальное время (не UTC)
 */
export const parseLocalDateTime = (dateStr: string): Date => {
  // Формат: "2026-01-07T23:00:00"
  const parts = dateStr.split('T')
  if (parts.length === 2) {
    const [datePart, timePart] = parts
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute, second = 0] = timePart.split(':').map(Number)
    // Создаем Date с локальным временем (месяц в Date начинается с 0)
    return new Date(year, month - 1, day, hour, minute, second, 0)
  }
  // Если формат не подошел, используем стандартный парсинг
  return new Date(dateStr)
}

/**
 * Сериализует объект Date в строку формата "YYYY-MM-DDTHH:mm:ss"
 * Сохраняет локальное время (не UTC)
 */
export const serializeLocalDateTime = (date: Date): string => {
  // Сохраняем дату в формате, который сохраняет локальное время
  // Формат: "YYYY-MM-DDTHH:mm:ss" (без 'Z', что означает локальное время)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

/**
 * Преобразует строку даты или Date в Date
 */
export const toDate = (date: string | Date): Date => {
  if (date instanceof Date) {
    return date
  }
  return parseLocalDateTime(date)
}
