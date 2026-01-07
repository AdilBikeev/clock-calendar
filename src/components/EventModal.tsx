import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Event } from '../types/event'
import './EventModal.css'

interface EventModalProps {
  isOpen: boolean
  selectedDate: Date | null
  event: Event | null
  onClose: () => void
  onSave: (event: Event) => void
  onDelete: (eventId: string) => void
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  selectedDate,
  event,
  onClose,
  onSave,
  onDelete
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
      const date = new Date(selectedDate)
      date.setHours(0, 0, 0, 0)
      const startDateStr = format(date, 'yyyy-MM-dd')
      
      // Дата окончания такая же, как дата начала
      const endDateStr = startDateStr
      
      setTitle('')
      setDescription('')
      setAllDay(false)
      setStartDate(startDateStr)
      setStartTime('09:00')
      setEndDate(endDateStr)
      setEndTime('10:00') // На 1 час позже времени начала
    }
  }, [event, selectedDate])

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
        start = new Date(`${startDate}T${startTime}`)
        end = new Date(`${endDate}T${endTime}`)
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
      <div className="event-modal" onClick={(e) => e.stopPropagation()}>
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

        <div className="event-modal-content">
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
            autoFocus
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
                <div className="event-modal-date-group">
                  <input
                    type="date"
                    className="event-modal-date"
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
                    className="event-modal-time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={allDay}
                  />
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
              <div className="event-modal-datetime-row">
                <div className="event-modal-date-group">
                  <input
                    type="date"
                    className="event-modal-date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={allDay}
                  />
                  <input
                    type="time"
                    className="event-modal-time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={allDay}
                  />
                </div>
              </div>
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
        </div>
      </div>
    </div>
  )
}

export default EventModal

