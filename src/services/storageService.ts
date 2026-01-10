import { Event } from '../types/event'
import { STORAGE_KEYS } from '../constants'
import { parseLocalDateTime, serializeLocalDateTime } from '../utils/dateUtils'

/**
 * Сервис для работы с localStorage
 */

/**
 * Загружает события из localStorage
 */
export const loadEventsFromStorage = (): Event[] => {
  try {
    const savedEvents = localStorage.getItem(STORAGE_KEYS.CALENDAR_EVENTS)
    if (!savedEvents) {
      return []
    }

    const parsed = JSON.parse(savedEvents)
    const eventsWithDates = parsed.map((e: any) => {
      let startDate: Date
      let endDate: Date

      if (typeof e.startDate === 'string') {
        startDate = parseLocalDateTime(e.startDate)
      } else {
        startDate = new Date(e.startDate)
      }

      if (typeof e.endDate === 'string') {
        endDate = parseLocalDateTime(e.endDate)
      } else {
        endDate = new Date(e.endDate)
      }

      // Миграция: если у события нет owner, устанавливаем 'local'
      // (все существующие события считаются созданными в приложении)
      const owner = e.owner || 'local'

      return {
        ...e,
        startDate,
        endDate,
        owner,
      }
    })

    return eventsWithDates
  } catch (error) {
    console.error('Error loading events from storage:', error)
    return []
  }
}

/**
 * Сохраняет события в localStorage
 */
export const saveEventsToStorage = (events: Event[]): void => {
  try {
    // Сериализуем события, сохраняя локальное время правильно
    const serializedEvents = events.map((e) => ({
      ...e,
      startDate: e.startDate instanceof Date ? serializeLocalDateTime(e.startDate) : e.startDate,
      endDate: e.endDate instanceof Date ? serializeLocalDateTime(e.endDate) : e.endDate,
    }))

    localStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(serializedEvents))
  } catch (error) {
    console.error('Error saving events to storage:', error)
  }
}

/**
 * Очищает все события из localStorage
 */
export const clearEventsFromStorage = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CALENDAR_EVENTS)
  } catch (error) {
    console.error('Error clearing events from storage:', error)
  }
}
