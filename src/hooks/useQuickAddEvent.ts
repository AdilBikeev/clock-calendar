import { useState, useCallback } from 'react'
import { Event } from '../types/event'
import { ViewMode } from '../constants'
import { getAvailableColor } from '../utils/eventUtils'
import { generateLocalEventId } from '../utils/idUtils'

/**
 * Custom hook для быстрого добавления событий
 */
export const useQuickAddEvent = (
  viewMode: ViewMode,
  currentDate: Date,
  events: Event[],
  onCreateEmptyEvent: () => void,
  onAddEvent: (event: Event) => void
) => {
  const [quickEventTitle, setQuickEventTitle] = useState<string>('')

  const handleQuickAddEvent = useCallback(() => {
    if (!quickEventTitle.trim()) {
      // Если поле пустое - открываем модальное окно с флагом "Весь день" по умолчанию
      onCreateEmptyEvent()
      return
    }

    // Определяем дату события
    let eventDate: Date
    if (viewMode === 'day') {
      // На дневном календаре - используем выбранный день
      eventDate = new Date(currentDate)
    } else {
      // На месячном календаре - используем текущий день
      eventDate = new Date()
    }
    eventDate.setHours(0, 0, 0, 0)

    // Дата окончания - тот же день, конец дня
    const endDate = new Date(eventDate)
    endDate.setHours(23, 59, 59, 999)

    // Находим первый доступный цвет
    const availableColor = getAvailableColor(events, eventDate)

    // Создаем новое событие
    const newEvent: Event = {
      id: generateLocalEventId(),
      title: quickEventTitle.trim(),
      startDate: eventDate,
      endDate: endDate,
      allDay: true,
      color: availableColor,
      owner: 'local', // События, созданные в приложении, имеют owner = 'local'
    }

    onAddEvent(newEvent)
    setQuickEventTitle('') // Очищаем поле ввода
  }, [quickEventTitle, viewMode, currentDate, events, onCreateEmptyEvent, onAddEvent])

  return {
    quickEventTitle,
    setQuickEventTitle,
    handleQuickAddEvent,
  }
}
