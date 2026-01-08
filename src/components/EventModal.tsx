import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import SimpleBar from 'simplebar-react'
import { Event } from '../types/event'
import 'simplebar-react/dist/simplebar.min.css'
import './EventModal.css'

interface EventModalProps {
  isOpen: boolean
  selectedDate: Date | null
  event: Event | null
  onClose: () => void
  onSave: (event: Event) => void
  onDelete: (eventId: string) => void
  defaultAllDay?: boolean
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  selectedDate,
  event,
  onClose,
  onSave,
  onDelete,
  defaultAllDay = false
}) => {
  const [title, setTitle] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [startTime, setStartTime] = useState<string>('09:00')
  const [endDate, setEndDate] = useState<string>('')
  const [endTime, setEndTime] = useState<string>('10:00')
  const [allDay, setAllDay] = useState<boolean>(false)
  const [description, setDescription] = useState<string>('')
  const [titleError, setTitleError] = useState<boolean>(false)
  const [shakeKey, setShakeKey] = useState<number>(0)
  const modalRef = React.useRef<HTMLDivElement>(null)

  // Предотвращаем движение модального окна при появлении клавиатуры
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const modal = modalRef.current
    const overlay = modal.closest('.event-modal-overlay') as HTMLElement
    
    if (!overlay) return

    // Сохраняем начальную позицию overlay при открытии
    const getInitialTop = () => {
      // Используем getBoundingClientRect для получения точной позиции
      const rect = overlay.getBoundingClientRect()
      return rect.top
    }
    
    let initialTop = getInitialTop()
    let lastScrollY = window.scrollY
    let lastVisualViewportScrollY = 0

    // Функция для фиксации позиции overlay
    const fixOverlayPosition = () => {
      const currentTop = overlay.getBoundingClientRect().top
      const offsetY = currentTop - initialTop
      
      // Если overlay сдвинулся более чем на 1px, компенсируем это
      if (Math.abs(offsetY) > 1) {
        // Используем transform для компенсации, так как он не влияет на layout
        const currentTransform = overlay.style.transform || 'translateY(0)'
        const currentY = currentTransform.match(/translateY\((-?\d+(?:\.\d+)?)px\)/)?.[1] || '0'
        const newY = parseFloat(currentY) - offsetY
        overlay.style.transform = `translateY(${newY}px)`
        
        // Обновляем initialTop чтобы следующая проверка была относительно новой позиции
        initialTop = overlay.getBoundingClientRect().top + offsetY
      }
    }
    
    const handleViewportScroll = () => {
      if (window.visualViewport) {
        // Предотвращаем движение через компенсацию
        fixOverlayPosition()
        // Сбрасываем scroll visual viewport если он изменился
        const scrollTop = (window.visualViewport as any).scrollTop
        if (scrollTop !== undefined && scrollTop !== lastVisualViewportScrollY) {
          // Не можем напрямую сбросить scrollTop visual viewport,
          // но можем компенсировать движение
          fixOverlayPosition()
          lastVisualViewportScrollY = scrollTop
        }
      }
    }

    const handleViewportResize = () => {
      fixOverlayPosition()
    }

    // Предотвращаем автоматическую прокрутку браузера при фокусе на полях ввода
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && 
          overlay.contains(target)) {
        // Сбрасываем scroll страницы если он изменился
        if (window.scrollY !== lastScrollY) {
          window.scrollTo(0, lastScrollY)
        }
        
        // Прокручиваем только внутри модального окна, если нужно
        setTimeout(() => {
          const scrollContainer = target.closest('.simplebar-content-wrapper') as HTMLElement
          if (scrollContainer) {
            const targetRect = target.getBoundingClientRect()
            const containerRect = scrollContainer.getBoundingClientRect()
            
            if (targetRect.bottom > containerRect.bottom) {
              const scrollAmount = targetRect.bottom - containerRect.bottom + 20
              scrollContainer.scrollTop += scrollAmount
            } else if (targetRect.top < containerRect.top) {
              const scrollAmount = containerRect.top - targetRect.top + 20
              scrollContainer.scrollTop -= scrollAmount
            }
          }
          // Проверяем и фиксируем позицию после прокрутки
          fixOverlayPosition()
        }, 150)
      }
    }

    // Подписываемся на события
    if (window.visualViewport) {
      window.visualViewport.addEventListener('scroll', handleViewportScroll)
      window.visualViewport.addEventListener('resize', handleViewportResize)
      document.addEventListener('focusin', handleFocus, true)
      
      // Периодически проверяем и фиксируем позицию
      const positionCheckInterval = setInterval(fixOverlayPosition, 50)
      
      return () => {
        window.visualViewport?.removeEventListener('scroll', handleViewportScroll)
        window.visualViewport?.removeEventListener('resize', handleViewportResize)
        document.removeEventListener('focusin', handleFocus, true)
        clearInterval(positionCheckInterval)
        // Сбрасываем стили при закрытии
        overlay.style.transform = ''
      }
    }
  }, [isOpen])

  // Предотвращаем прокрутку страницы при открытом модальном окне
  useEffect(() => {
    if (!isOpen) return

    // Сохраняем текущую позицию прокрутки
    const scrollY = window.scrollY
    
    // Фиксируем позицию body
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'

    return () => {
      // Восстанавливаем прокрутку при закрытии
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  useEffect(() => {
    if (event) {
      // Редактирование существующего события
      setTitle(event.title)
      setAllDay(event.allDay)
      setDescription(event.description || '')
      
      const start = new Date(event.startDate)
      const end = new Date(event.endDate)
      
      setStartDate(format(start, 'yyyy-MM-dd'))
      setStartTime(format(start, 'HH:mm'))
      setEndDate(format(end, 'yyyy-MM-dd'))
      setEndTime(format(end, 'HH:mm'))
    } else if (selectedDate) {
      // Создание нового события
      const now = new Date()
      
      // Вычисляем время начала: текущее время + 1 час
      const startTimeDate = new Date(now)
      startTimeDate.setHours(startTimeDate.getHours() + 1)
      // Округляем минуты и секунды до 0
      startTimeDate.setMinutes(0, 0, 0)
      
      // Вычисляем время окончания: время начала + 1 час
      const endTimeDate = new Date(startTimeDate)
      endTimeDate.setHours(endTimeDate.getHours() + 1)
      
      // Используем selectedDate как базовую дату для начала события
      const selectedDay = new Date(selectedDate)
      selectedDay.setHours(0, 0, 0, 0)
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      
      // Определяем дату начала события
      // Если selectedDate - это сегодня и время начала на сегодня, используем сегодня
      // Если время начала на завтра, используем завтра
      // Если selectedDate - другой день, используем его
      let startDateToUse: Date
      if (selectedDay.getTime() === today.getTime()) {
        // selectedDate - это сегодня
        if (startTimeDate.getDate() === now.getDate() && 
            startTimeDate.getMonth() === now.getMonth() && 
            startTimeDate.getFullYear() === now.getFullYear()) {
          // Время начала сегодня
          startDateToUse = new Date(today)
        } else {
          // Время начала завтра
          startDateToUse = new Date(today)
          startDateToUse.setDate(startDateToUse.getDate() + 1)
        }
      } else {
        // selectedDate - другой день, используем его
        startDateToUse = new Date(selectedDay)
      }
      
      // Определяем дату окончания
      // Если время окончания на следующий день после даты начала, увеличиваем дату
      const endTimeOnStartDay = new Date(startDateToUse)
      endTimeOnStartDay.setHours(endTimeDate.getHours(), endTimeDate.getMinutes(), 0, 0)
      
      let endDateToUse: Date
      if (endTimeDate.getHours() < startTimeDate.getHours() || 
          (endTimeDate.getHours() === startTimeDate.getHours() && endTimeDate.getMinutes() < startTimeDate.getMinutes())) {
        // Время окончания на следующий день (переход через полночь)
        endDateToUse = new Date(startDateToUse)
        endDateToUse.setDate(endDateToUse.getDate() + 1)
      } else {
        // Время окончания в тот же день
        endDateToUse = new Date(startDateToUse)
      }
      
      const startDateStr = format(startDateToUse, 'yyyy-MM-dd')
      const endDateStr = format(endDateToUse, 'yyyy-MM-dd')
      const startTimeStr = format(startTimeDate, 'HH:mm')
      const endTimeStr = format(endTimeDate, 'HH:mm')
      
      setTitle('')
      setDescription('')
      setAllDay(defaultAllDay)
      setStartDate(startDateStr)
      setStartTime(startTimeStr)
      setEndDate(endDateStr)
      setEndTime(endTimeStr)
    }
  }, [event, selectedDate, defaultAllDay])

  // Умная корректировка даты/времени окончания: если начало > конца, устанавливаем конец на начало + 1 час
  useEffect(() => {
    // Пропускаем корректировку для событий "Весь день" или если поля не заполнены
    if (allDay || !startDate || !endDate || !startTime || !endTime) {
      return
    }

    try {
      // Создаем Date объекты для сравнения
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

      const startDateTime = new Date(startYear, startMonth - 1, startDay, startHour, startMin, 0, 0)
      const endDateTime = new Date(endYear, endMonth - 1, endDay, endHour, endMin, 0, 0)

      // Если дата/время начала превышает дату/время окончания, корректируем окончание
      if (startDateTime >= endDateTime) {
        // Устанавливаем конец на начало + 1 час
        const newEndDateTime = new Date(startDateTime)
        newEndDateTime.setHours(newEndDateTime.getHours() + 1)

        // Обновляем дату и время окончания
        const newEndDate = format(newEndDateTime, 'yyyy-MM-dd')
        const newEndTime = format(newEndDateTime, 'HH:mm')

        setEndDate(newEndDate)
        setEndTime(newEndTime)
      }
    } catch (error) {
      // Игнорируем ошибки парсинга дат
      console.error('Error adjusting end date/time:', error)
    }
  }, [startDate, startTime, endDate, endTime, allDay])

  const handleSave = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!title.trim()) {
      setTitleError(true)
      // Запускаем анимацию тряски при каждой ошибке
      setShakeKey(prev => prev + 1)
      // Перемещаем фокус на поле с ошибкой
      setTimeout(() => {
        const titleInput = document.querySelector('.event-modal-title') as HTMLInputElement
        if (titleInput) {
          titleInput.focus()
        }
      }, 0)
      return
    }
    
    setTitleError(false)

    try {
      let start: Date
      let end: Date

      if (allDay) {
        // Для событий на весь день устанавливаем время на начало и конец дня
        start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
      } else {
        // Создаем дату с локальным временем
        // startDate в формате 'yyyy-MM-dd', startTime в формате 'HH:mm'
        const [startHour, startMin] = startTime.split(':').map(Number)
        const [endHour, endMin] = endTime.split(':').map(Number)
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number)
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number)
        
        // Создаем Date объекты с локальным временем (месяц в Date начинается с 0)
        start = new Date(startYear, startMonth - 1, startDay, startHour, startMin, 0, 0)
        end = new Date(endYear, endMonth - 1, endDay, endHour, endMin, 0, 0)
      }

      // Убеждаемся, что дата окончания не раньше даты начала
      if (end < start) {
        end = new Date(start)
        if (!allDay) {
          end.setHours(start.getHours() + 1)
        }
      }

      const eventData: Event = {
        id: event?.id || `event-${Date.now()}-${Math.random()}`,
        title: title.trim(),
        startDate: start,
        endDate: end,
        allDay,
        description: description.trim() || undefined,
        color: event?.color || ''
      }

      onSave(eventData)
      // onClose вызывается в handleSaveEvent в CalendarApp после сохранения
    } catch (error) {
      console.error('Error saving event:', error)
    }
  }

  const handleDelete = (): void => {
    if (event) {
      onDelete(event.id)
      onClose()
    }
  }

  const handleCancel = (): void => {
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="event-modal-overlay" onClick={handleCancel}>
      <div ref={modalRef} className="event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="event-modal-header">
          <button 
            type="button"
            className="event-modal-save" 
            onClick={handleSave}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Сохранить
          </button>
          
          <div className="event-modal-header-actions">
            {event && (
              <button className="event-modal-delete" onClick={handleDelete} title="Удалить">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
            <button className="event-modal-close" onClick={handleCancel} title="Закрыть" aria-label="Закрыть">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <SimpleBar className="event-modal-content">
          <input
            key={shakeKey}
            type="text"
            className={`event-modal-title ${titleError ? 'error' : ''}`}
            placeholder="Добавьте название"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              // Ошибка исчезает только когда пользователь начинает изменять поле
              if (titleError) {
                setTitleError(false)
              }
            }}
            autoFocus={!event} // Автофокус только при создании нового события
          />

          <div className="event-modal-field">
            <div className="event-modal-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="event-modal-datetime">
              <div className="event-modal-datetime-row">
                <div className="event-modal-date-group event-modal-start-group">
                  <input
                    type="date"
                    className="event-modal-date event-modal-start-date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      if (allDay) {
                        // При изменении даты начала для событий "Весь день" обновляем дату окончания
                        setEndDate(e.target.value)
                      } else {
                        // Для обычных событий также обновляем дату окончания на ту же дату
                        setEndDate(e.target.value)
                      }
                    }}
                  />
                  <input
                    type="time"
                    className="event-modal-time event-modal-start-time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={allDay}
                  />
                </div>
                
                <div className="event-modal-arrow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                
                <div className="event-modal-date-group event-modal-end-group">
                  <input
                    type="date"
                    className="event-modal-date event-modal-end-date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={allDay}
                  />
                  <input
                    type="time"
                    className="event-modal-time event-modal-end-time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={allDay}
                  />
                </div>
              </div>
              
              <label className="event-modal-all-day-toggle">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setAllDay(checked)
                    if (checked) {
                      // При включении "Весь день" синхронизируем даты и блокируем дату окончания
                      setEndDate(startDate)
                    }
                  }}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Весь день</span>
              </label>
            </div>
          </div>

          <div className="event-modal-field">
            <div className="event-modal-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
                <line x1="4" y1="22" x2="14" y2="22" />
              </svg>
            </div>
            <textarea
              className="event-modal-description"
              placeholder="Добавьте описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </SimpleBar>
      </div>
    </div>
  )
}

export default EventModal

