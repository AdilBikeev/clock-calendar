import { useState, useEffect, useCallback } from 'react'
import { Event } from '../types/event'
import { loadEventsFromStorage, saveEventsToStorage } from '../services/storageService'
import { saveEvent as saveEventService, deleteEvent as deleteEventService } from '../services/eventService'
import { STORAGE_KEYS } from '../constants'

/**
 * Custom hook для управления событиями календаря
 */
export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [isEventsLoaded, setIsEventsLoaded] = useState<boolean>(false)

  // Загрузка событий из localStorage при монтировании
  useEffect(() => {
    const loadedEvents = loadEventsFromStorage()
    setEvents(loadedEvents)
    setIsEventsLoaded(true)
  }, [])

  // Сохранение событий в localStorage при изменении (только после загрузки)
  useEffect(() => {
    if (!isEventsLoaded) {
      return
    }

    // Сохраняем только если есть события или они были загружены ранее
    if (events.length > 0 || localStorage.getItem(STORAGE_KEYS.CALENDAR_EVENTS)) {
      saveEventsToStorage(events)
    }
  }, [events, isEventsLoaded])

  /**
   * Сохраняет событие (создает новое или обновляет существующее)
   */
  const saveEvent = useCallback(
    (event: Event, defaultDate: Date) => {
      setEvents((prevEvents) => saveEventService(prevEvents, event, defaultDate))
    },
    []
  )

  /**
   * Удаляет событие по ID
   */
  const deleteEvent = useCallback((eventId: string) => {
    setEvents((prevEvents) => deleteEventService(prevEvents, eventId))
  }, [])

  /**
   * Создает новое событие
   */
  const addEvent = useCallback((event: Event) => {
    setEvents((prevEvents) => [...prevEvents, event])
  }, [])

  /**
   * Обновляет существующее событие
   */
  const updateEvent = useCallback((updatedEvent: Event) => {
    setEvents((prevEvents) => {
      const index = prevEvents.findIndex((e) => e.id === updatedEvent.id)
      if (index >= 0) {
        const updated = [...prevEvents]
        updated[index] = {
          ...updatedEvent,
          color: updatedEvent.color || updated[index].color,
        }
        return updated
      }
      return prevEvents
    })
  }, [])

  return {
    events,
    isEventsLoaded,
    saveEvent,
    deleteEvent,
    addEvent,
    updateEvent,
  }
}
