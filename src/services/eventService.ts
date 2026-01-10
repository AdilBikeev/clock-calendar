import { isSameDay, startOfMonth } from 'date-fns'
import { Event } from '../types/event'
import { getAvailableColor } from '../utils/eventUtils'
import { generateLocalEventId } from '../utils/idUtils'

/**
 * Сервис для работы с событиями
 */

/**
 * Создает новое событие
 */
export const createEvent = (
  events: Event[],
  eventData: Omit<Event, 'id' | 'color' | 'owner'>,
  defaultDate: Date
): Event => {
  const availableColor = getAvailableColor(events, defaultDate)

  return {
    ...eventData,
    id: generateLocalEventId(),
    color: availableColor,
    owner: 'local', // По умолчанию события создаются в приложении
  }
}

/**
 * Обновляет существующее событие
 */
export const updateEvent = (events: Event[], updatedEvent: Event): Event[] => {
  const existingIndex = events.findIndex((e) => e.id === updatedEvent.id)

  if (existingIndex >= 0) {
    const updated = [...events]
    updated[existingIndex] = {
      ...updatedEvent,
      color: updatedEvent.color || updated[existingIndex].color,
    }
    return updated
  }

  return events
}

/**
 * Добавляет новое событие или обновляет существующее
 */
export const saveEvent = (events: Event[], event: Event, defaultDate: Date): Event[] => {
  const existingIndex = events.findIndex((e) => e.id === event.id)

  if (existingIndex >= 0) {
    return updateEvent(events, event)
  } else {
    // Добавление нового события
    // Находим уже используемые цвета для этого дня
    const dayEvents = events.filter((e) => {
      const eventStart = new Date(e.startDate)
      const newEventStart = new Date(event.startDate)
      return isSameDay(eventStart, newEventStart)
    })
    const usedColors = dayEvents.map((e) => e.color)

    // Находим первый доступный цвет
    let availableColor = getAvailableColor(events, defaultDate)
    for (const color of event.color ? [event.color] : []) {
      if (!usedColors.includes(color)) {
        availableColor = color
        break
      }
    }

    const newEvent: Event = {
      ...event,
      color: event.color || availableColor,
      owner: event.owner || 'local', // Если owner не указан, по умолчанию 'local'
    }

    return [...events, newEvent]
  }
}

/**
 * Удаляет событие по ID
 */
export const deleteEvent = (events: Event[], eventId: string): Event[] => {
  return events.filter((e) => e.id !== eventId)
}

/**
 * Получает события для определенного дня
 */
export const getEventsForDay = (events: Event[], date: Date): Event[] => {
  return events.filter((e) => {
    const eventStart = new Date(e.startDate)
    return isSameDay(eventStart, date)
  })
}

/**
 * Проверяет, нужно ли обновить текущую дату после сохранения события
 */
export const shouldUpdateCurrentDate = (
  eventDate: Date,
  currentDate: Date,
  viewMode: 'month' | 'year' | 'day'
): Date | null => {
  if (viewMode === 'month') {
    const eventMonth = startOfMonth(eventDate)
    const currentMonth = startOfMonth(currentDate)
    if (eventMonth.getTime() !== currentMonth.getTime()) {
      return eventMonth
    }
  } else if (viewMode === 'day') {
    if (!isSameDay(eventDate, currentDate)) {
      return eventDate
    }
  } else if (viewMode === 'year') {
    const eventYear = eventDate.getFullYear()
    const currentYear = currentDate.getFullYear()
    if (eventYear !== currentYear) {
      return new Date(eventYear, 0, 1)
    }
  }

  return null
}
