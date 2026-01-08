import React, { useState, useEffect, useMemo } from 'react'
import { isSameDay, startOfDay, endOfDay, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import SimpleBar from 'simplebar-react'
import { Event } from '../../types/event'
import 'simplebar-react/dist/simplebar.min.css'
import './DayView.css'

interface DayViewProps {
  currentDate: Date
  events: Event[]
  onEventClick?: (event: Event) => void
  highlightedEventId?: string | null
}

const DayView: React.FC<DayViewProps> = ({ currentDate, events, onEventClick, highlightedEventId }) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)

  // Синхронизируем focusedEventId с highlightedEventId из родителя
  useEffect(() => {
    if (highlightedEventId) {
      setFocusedEventId(highlightedEventId)
    } else {
      // Если highlightedEventId сброшен - сбрасываем фокус
      setFocusedEventId(null)
    }
  }, [highlightedEventId])

  // Сбрасываем hover при изменении даты
  useEffect(() => {
    setHoveredEventId(null)
  }, [currentDate])

  // Автоматическая прокрутка к сфокусированному событию в списке
  useEffect(() => {
    if (focusedEventId) {
      // Используем requestAnimationFrame и setTimeout для надежной прокрутки
      requestAnimationFrame(() => {
        setTimeout(() => {
          const eventElement = document.querySelector(`[data-event-id="${focusedEventId}"]`) as HTMLElement
          if (eventElement) {
            // Ищем скроллируемый контейнер SimpleBar
            let scrollContainer: HTMLElement | null = null
            
            // Ищем родительский элемент с классом simplebar-content-wrapper
            let parent: HTMLElement | null = eventElement.parentElement
            while (parent) {
              if (parent.classList.contains('simplebar-content-wrapper')) {
                scrollContainer = parent
                break
              }
              parent = parent.parentElement
            }
            
            if (scrollContainer) {
              const elementRect = eventElement.getBoundingClientRect()
              const containerRect = scrollContainer.getBoundingClientRect()
              
              // Вычисляем позицию элемента относительно контейнера
              const elementTop = elementRect.top - containerRect.top + scrollContainer.scrollTop
              const elementCenter = elementTop + (elementRect.height / 2)
              const containerCenter = scrollContainer.clientHeight / 2
              
              // Вычисляем нужную позицию прокрутки
              const targetScrollTop = elementCenter - containerCenter
              
              // Прокручиваем к элементу
              scrollContainer.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
              })
            } else {
              // Fallback на обычный scrollIntoView
              eventElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              })
            }
          }
        }, 150)
      })
    }
  }, [focusedEventId])


  // Проверяем, является ли выбранный день текущим днем
  const isToday = isSameDay(currentDate, new Date())

  // Обновляем время только для текущего дня
  useEffect(() => {
    if (!isToday) {
      // Если выбран не текущий день, не обновляем время
      return
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [isToday])

  // Получаем и сортируем события для выбранного дня
  const dayEvents = useMemo(() => {
    const dayStart = startOfDay(currentDate)
    const dayEnd = endOfDay(currentDate)

    // Фильтруем события, которые пересекаются с выбранным днем
    const filteredEvents = events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      
      // Событие попадает в день, если оно начинается до конца дня и заканчивается после начала дня
      return eventStart <= dayEnd && eventEnd >= dayStart
    })

    // Сортируем события
    return filteredEvents.sort((a, b) => {
      const aStart = new Date(a.startDate)
      const aEnd = new Date(a.endDate)
      const bStart = new Date(b.startDate)
      const bEnd = new Date(b.endDate)
      
      // Проверяем, заканчивается ли событие в другой день
      const aEndsOtherDay = !isSameDay(aEnd, currentDate)
      const bEndsOtherDay = !isSameDay(bEnd, currentDate)
      
      // Приоритет: события, которые заканчиваются в другой день
      if (aEndsOtherDay && !bEndsOtherDay) return -1
      if (!aEndsOtherDay && bEndsOtherDay) return 1
      
      // Затем события на весь день
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      
      // Остальные сортируются по времени начала
      return aStart.getTime() - bStart.getTime()
    })
  }, [events, currentDate])

  // Форматируем время для отображения
  const formatTime = (date: Date): string => {
    return format(date, 'HH:mm', { locale: ru })
  }

  // Функция для расчета угла на 12-часовом циферблате (по аналогии с примером)
  const timeToAngle = (hours: number, minutes: number): number => {
    // Для 12-часового циферблата используем hours % 12
    const totalMinutes = (hours % 12) * 60 + minutes
    return (totalMinutes / 720) * 360 - 90 // -90 чтобы начать сверху
  }

  // Функция для создания SVG пути дуги (по аналогии с примером)
  const createArc = (
    startHour: number,
    startMin: number,
    endHour: number,
    endMin: number,
    radius: number,
    center: number
  ): string => {
    const startAngle = timeToAngle(startHour, startMin)
    const endAngle = timeToAngle(endHour, endMin)

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)

    const largeArc = endAngle - startAngle > 180 ? 1 : 0

    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
  }

  // Функция для расчета данных дуги события для конкретного периода
  const calculateArcDataForPeriod = (
    event: Event,
    periodStart: number,
    periodEnd: number,
    dayStart: Date,
    dayEnd: Date,
    clockRadius: number,
    center: number,
    allTimedEvents: Event[]
  ): { event: Event; arcPath: string; radius: number; isAbove: boolean } | null => {
    const eventStart = event.startDate instanceof Date ? event.startDate : new Date(event.startDate)
    const eventEnd = event.endDate instanceof Date ? event.endDate : new Date(event.endDate)
    
    // Определяем время отображения для этого периода
    let displayStartTime: Date
    let displayEndTime: Date
    
    // Если событие начинается до начала дня - начинаем с начала AM периода дня окончания
    if (eventStart < dayStart) {
      // Событие началось до начала дня - если это день окончания, начинаем с AM (00:00)
      if (periodStart === 0) {
        displayStartTime = new Date(dayStart) // Начало AM периода (00:00)
      } else {
        // Для PM периода не показываем, если событие началось до дня
        return null
      }
    } else {
      displayStartTime = new Date(eventStart.getTime())
    }
    
    // Если событие заканчивается после конца дня - показываем до конца соответствующего периода
    if (eventEnd > dayEnd) {
      if (periodEnd === 24) {
        displayEndTime = new Date(dayEnd) // Конец PM периода (23:59:59)
      } else {
        // Для AM периода не показываем, если событие заканчивается после дня
        displayEndTime = new Date(dayStart)
        displayEndTime.setHours(12, 0, 0, 0) // Конец AM периода (12:00)
      }
    } else {
      displayEndTime = new Date(eventEnd.getTime())
    }
    
    const startHours = displayStartTime.getHours()
    const startMinutes = displayStartTime.getMinutes()
    const endHours = displayEndTime.getHours()
    const endMinutes = displayEndTime.getMinutes()
    
    // Проверяем, пересекается ли событие с этим периодом
    const eventOverlapsPeriod = (startHours < periodEnd && endHours >= periodStart)
    
    if (!eventOverlapsPeriod) {
      return null
    }
    
    // Ограничиваем время рамками периода для отображения
    let arcStartHour = Math.max(startHours, periodStart)
    let arcStartMin = startHours < periodStart ? 0 : startMinutes
    
    let arcEndHour = Math.min(endHours, periodEnd === 24 ? 23 : periodEnd - 1)
    let arcEndMin = endHours >= periodEnd ? (periodEnd === 24 ? 59 : 59) : endMinutes
    
    // Если событие начинается до периода - начинаем с начала периода
    if (startHours < periodStart) {
      arcStartHour = periodStart
      arcStartMin = 0
    }
    
    // Если событие заканчивается после периода - заканчиваем в конце периода
    if (endHours >= periodEnd) {
      arcEndHour = periodEnd === 24 ? 23 : (periodEnd - 1)
      arcEndMin = periodEnd === 24 ? 59 : 59
    }
    
    const arcPath = createArc(arcStartHour, arcStartMin, arcEndHour, arcEndMin, clockRadius, center)
    
    // Проверяем пересечения с другими событиями
    const overlappingEvents = allTimedEvents.filter(otherEvent => {
      if (otherEvent.id === event.id) return false
      const otherStart = otherEvent.startDate instanceof Date ? otherEvent.startDate : new Date(otherEvent.startDate)
      const otherEnd = otherEvent.endDate instanceof Date ? otherEvent.endDate : new Date(otherEvent.endDate)
      return (eventStart < otherEnd && eventEnd > otherStart)
    })

    const shouldBeAbove = overlappingEvents.some(otherEvent => {
      const otherStart = otherEvent.startDate instanceof Date ? otherEvent.startDate : new Date(otherEvent.startDate)
      const otherEnd = otherEvent.endDate instanceof Date ? otherEvent.endDate : new Date(otherEvent.endDate)
      const otherStartMinutes = otherStart.getHours() * 60 + otherStart.getMinutes()
      const otherEndMinutes = otherEnd.getHours() * 60 + otherEnd.getMinutes()
      const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes()
      const eventEndMinutes = eventEnd.getHours() * 60 + eventEnd.getMinutes()
      const eventDuration = eventEndMinutes - eventStartMinutes
      const otherDuration = otherEndMinutes - otherStartMinutes
      
      return otherStartMinutes > eventStartMinutes || otherDuration > eventDuration
    })
    
    return {
      event,
      arcPath,
      radius: clockRadius,
      isAbove: shouldBeAbove
    }
  }

  // Вычисляем события для AM и PM циферблатов
  const { amEvents, pmEvents } = useMemo(() => {
    const dayStart = startOfDay(currentDate)
    const dayEnd = endOfDay(currentDate)
    const clockRadius = 88 // Радиус окружности для дуг (внешний край циферблата)
    const center = 100 // Центр SVG viewBox

    // Фильтруем события на весь день - их не показываем на дугах
    const timedEvents = dayEvents.filter(event => {
      if (event.allDay) return false
      const eventStart = event.startDate instanceof Date ? event.startDate : new Date(event.startDate)
      const eventEnd = event.endDate instanceof Date ? event.endDate : new Date(event.endDate)
      return eventStart <= dayEnd && eventEnd >= dayStart
    })

    // Разделяем события на AM и PM
    const amEventsData = timedEvents
      .map(event => calculateArcDataForPeriod(event, 0, 12, dayStart, dayEnd, clockRadius, center, timedEvents))
      .filter((arc): arc is NonNullable<typeof arc> => arc !== null)
    
    const pmEventsData = timedEvents
      .map(event => calculateArcDataForPeriod(event, 12, 24, dayStart, dayEnd, clockRadius, center, timedEvents))
      .filter((arc): arc is NonNullable<typeof arc> => arc !== null)

    return {
      amEvents: amEventsData,
      pmEvents: pmEventsData
    }
  }, [dayEvents, currentDate])

  // Обработчик клика по дуге - только устанавливает фокус, не открывает окно редактирования
  const handleArcClick = (eventId: string): void => {
    setFocusedEventId(eventId)
  }

  // Обработчик клика на циферблат (сброс фокуса при клике вне дуги)
  const handleClockClick = (e: React.MouseEvent): void => {
    const target = e.target as HTMLElement
    // Сбрасываем фокус и hover, если клик не по дуге события
    if (!target.closest('.event-arc')) {
      setFocusedEventId(null)
      setHoveredEventId(null)
    }
  }

  // Обработчик клика на контейнер дня (сброс фокуса при клике на пустую область)
  const handleDayViewClick = (e: React.MouseEvent): void => {
    const target = e.target as HTMLElement
    // Сбрасываем фокус и hover, если клик не по элементу события
    if (!target.closest('.day-event-item')) {
      setFocusedEventId(null)
      setHoveredEventId(null)
    }
  }

  // Рендеринг одного циферблата (AM или PM)
  const renderClockFace = (
    period: 'AM' | 'PM',
    periodStart: number,
    periodEnd: number,
    eventsData: Array<{ event: Event; arcPath: string; radius: number; isAbove: boolean }>
  ): React.ReactElement => {
    const showHands = isToday && currentTime.getHours() >= periodStart && currentTime.getHours() < periodEnd
    
    // Вычисляем углы для стрелок
    let hourAngle = 0
    let minuteAngle = 0
    let secondAngle = 0
    
    if (showHands) {
      const now = currentTime
      const hours24 = now.getHours()
      hourAngle = timeToAngle(hours24, now.getMinutes())
      minuteAngle = timeToAngle(hours24, now.getMinutes() + now.getSeconds() / 60)
      secondAngle = timeToAngle(hours24, now.getMinutes() + now.getSeconds() / 60 + now.getMilliseconds() / 60000)
    }
    
    return (
      <div className="day-clock-wrapper" key={period}>
        <div className="day-clock-period-title">
          {period} ({periodStart}:00 - {periodEnd}:00)
        </div>
        <div className={`day-clock-container ${!isToday || !showHands ? 'inactive' : ''}`}>
          <div className={`day-clock ${!isToday || !showHands ? 'inactive' : ''}`}>
            <svg viewBox="0 0 200 200" className="clock-face">
              {/* Циферблат */}
              <circle cx="100" cy="100" r="95" className="clock-outline" />
              
              {/* Метки часов */}
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30) - 90
                const x1 = 100 + 70 * Math.cos(angle * Math.PI / 180)
                const y1 = 100 + 70 * Math.sin(angle * Math.PI / 180)
                const x2 = 100 + 88 * Math.cos(angle * Math.PI / 180)
                const y2 = 100 + 88 * Math.sin(angle * Math.PI / 180)
                const number = i === 0 ? 12 : i
                const textX = 100 + 52 * Math.cos(angle * Math.PI / 180)
                const textY = 100 + 52 * Math.sin(angle * Math.PI / 180)
                return (
                  <g key={i}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className="hour-mark"
                    />
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="hour-number"
                      fontSize="18"
                      fontWeight="600"
                    >
                      {number}
                    </text>
                  </g>
                )
              })}

              {/* Метки минут */}
              {[...Array(60)].map((_, i) => {
                if (i % 5 !== 0) {
                  const angle = (i * 6) - 90
                  const x1 = 100 + 82 * Math.cos(angle * Math.PI / 180)
                  const y1 = 100 + 82 * Math.sin(angle * Math.PI / 180)
                  const x2 = 100 + 88 * Math.cos(angle * Math.PI / 180)
                  const y2 = 100 + 88 * Math.sin(angle * Math.PI / 180)
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className="minute-mark"
                    />
                  )
                }
                return null
              })}

              {/* Дуги событий - сначала рисуем те, что должны быть внизу */}
              <g className="event-arcs-layer" onClick={handleClockClick}>
                {eventsData
                  .filter(arcData => !arcData.isAbove)
                  .map(arcData => {
                    const isHovered = hoveredEventId === arcData.event.id
                    const isFocused = focusedEventId === arcData.event.id
                    
                    return (
                      <path
                        key={`arc-bottom-${arcData.event.id}-${period}`}
                        className={`event-arc ${isHovered ? 'hovered' : ''} ${isFocused ? 'focused' : ''}`}
                        d={arcData.arcPath}
                        stroke={arcData.event.color}
                        strokeWidth={(isHovered || isFocused) ? "10" : "8"}
                        fill="none"
                        strokeLinecap="round"
                        style={{
                          opacity: 1,
                          filter: (isHovered || isFocused) ? `drop-shadow(0 0 6px ${arcData.event.color})` : 'none'
                        }}
                        onMouseEnter={() => setHoveredEventId(arcData.event.id)}
                        onMouseLeave={() => {
                          if (focusedEventId !== arcData.event.id) {
                            setHoveredEventId(null)
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleArcClick(arcData.event.id)
                        }}
                      />
                    )
                  })}
                {/* Затем рисуем те, что должны быть поверх */}
                {eventsData
                  .filter(arcData => arcData.isAbove)
                  .map(arcData => {
                    const isHovered = hoveredEventId === arcData.event.id
                    const isFocused = focusedEventId === arcData.event.id
                    
                    return (
                      <path
                        key={`arc-top-${arcData.event.id}-${period}`}
                        className={`event-arc ${isHovered ? 'hovered' : ''} ${isFocused ? 'focused' : ''}`}
                        d={arcData.arcPath}
                        stroke={arcData.event.color}
                        strokeWidth={(isHovered || isFocused) ? "10" : "8"}
                        fill="none"
                        strokeLinecap="round"
                        style={{
                          opacity: 0.5,
                          filter: (isHovered || isFocused) ? `drop-shadow(0 0 6px ${arcData.event.color})` : 'none'
                        }}
                        onMouseEnter={() => setHoveredEventId(arcData.event.id)}
                        onMouseLeave={() => {
                          if (focusedEventId !== arcData.event.id) {
                            setHoveredEventId(null)
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleArcClick(arcData.event.id)
                        }}
                      />
                    )
                  })}
              </g>

              {/* Центр циферблата */}
              <circle cx="100" cy="100" r="6" className="clock-center" />

              {/* Стрелки (только для текущего времени в этом периоде) */}
              {showHands && (
                <>
                  {/* Часовая стрелка */}
                  <line
                    x1="100"
                    y1="100"
                    x2={100 + 35 * Math.cos(hourAngle * Math.PI / 180)}
                    y2={100 + 35 * Math.sin(hourAngle * Math.PI / 180)}
                    className="hour-hand"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  {/* Минутная стрелка */}
                  <line
                    x1="100"
                    y1="100"
                    x2={100 + 50 * Math.cos(minuteAngle * Math.PI / 180)}
                    y2={100 + 50 * Math.sin(minuteAngle * Math.PI / 180)}
                    className="minute-hand"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Секундная стрелка */}
                  <line
                    x1="100"
                    y1="100"
                    x2={100 + 55 * Math.cos(secondAngle * Math.PI / 180)}
                    y2={100 + 55 * Math.sin(secondAngle * Math.PI / 180)}
                    className="second-hand"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </>
              )}
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SimpleBar 
      className="day-view" 
      onClick={handleDayViewClick} 
      style={{ 
        maxHeight: '100%', 
        width: '100%',
        height: '100%',
        flex: '1 1 auto',
        minHeight: 0
      }}
    >
      {/* Контейнер для двух циферблатов в одну строку */}
      <div className="day-clocks-row">
        {renderClockFace('AM', 0, 12, amEvents)}
        {renderClockFace('PM', 12, 24, pmEvents)}
      </div>

      {/* Список событий */}
      <div className="day-events-list">
        {dayEvents.length === 0 ? (
          <div className="day-events-empty">Нет событий на этот день</div>
        ) : (
          dayEvents.map(event => {
            const eventStart = new Date(event.startDate)
            const eventEnd = new Date(event.endDate)
            const isAllDay = event.allDay
            const endsOtherDay = !isSameDay(eventEnd, currentDate)
            const isHovered = hoveredEventId === event.id
            const isFocused = focusedEventId === event.id
            
              return (
              <div 
                key={event.id}
                data-event-id={event.id}
                className={`day-event-item ${isAllDay || endsOtherDay ? 'all-day' : ''} ${isHovered ? 'hovered' : ''} ${isFocused ? 'focused' : ''}`}
                onMouseEnter={() => setHoveredEventId(event.id)}
                onMouseLeave={() => {
                  if (focusedEventId !== event.id) {
                    setHoveredEventId(null)
                  }
                }}
                onClick={() => {
                  setFocusedEventId(event.id)
                  if (onEventClick) {
                    onEventClick(event)
                  }
                }}
              >
                <div 
                  className="day-event-color-dot" 
                  style={{ backgroundColor: event.color }}
                />
                <div className="day-event-content">
                  <div className="day-event-title">{event.title}</div>
                  {isAllDay ? (
                    <div className="day-event-time">Весь день</div>
                  ) : (
                    <div className="day-event-time">
                      {formatTime(eventStart)} - {formatTime(eventEnd)}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </SimpleBar>
  )
}

export default DayView

