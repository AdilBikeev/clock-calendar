import { isSameDay } from 'date-fns'
import { Event } from '../types/event'
import { EVENT_COLORS } from '../constants'

/**
 * Утилиты для работы с событиями
 */

/**
 * Находит первый доступный цвет для события в заданный день
 */
export const getAvailableColor = (events: Event[], date: Date): string => {
  // Находим уже используемые цвета для этого дня
  const dayEvents = events.filter((e) => {
    const eventStart = new Date(e.startDate)
    return isSameDay(eventStart, date)
  })
  const usedColors = dayEvents.map((e) => e.color)

  // Находим первый доступный цвет
  for (const color of EVENT_COLORS) {
    if (!usedColors.includes(color)) {
      return color
    }
  }

  // Если все цвета заняты, возвращаем первый
  return EVENT_COLORS[0]
}

/**
 * Проверяет, существует ли событие с данным ID
 */
export const eventExists = (events: Event[], eventId: string): boolean => {
  return events.some((e) => e.id === eventId)
}

/**
 * Находит событие по ID
 */
export const findEventById = (events: Event[], eventId: string): Event | undefined => {
  return events.find((e) => e.id === eventId)
}
