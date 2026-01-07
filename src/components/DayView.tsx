import React, { useState, useEffect, useMemo } from 'react'
import { isSameDay, startOfDay, endOfDay, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Event } from '../types/event'
import './DayView.css'

interface DayViewProps {
  currentDate: Date
  events: Event[]
  onEventClick?: (event: Event) => void
}

const DayView: React.FC<DayViewProps> = ({ currentDate, events, onEventClick }) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date())


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

  // Получаем время для отображения
  let hours12: number
  let minutes: number
  let seconds: number

  if (isToday) {
    // Если выбран текущий день - показываем текущее время
    const now = currentTime
    const hours24 = now.getHours()
    hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24
    minutes = now.getMinutes()
    seconds = now.getSeconds()
  } else {
    // Если выбран не текущий день - показываем 00:00
    hours12 = 12
    minutes = 0
    seconds = 0
  }

  // Вычисляем углы для стрелок
  // Для 12:00 (00:00 в 12-часовом формате) - часовая стрелка на 12, минутная и секундная на 0
  const hourAngle = hours12 === 12 ? -90 : (hours12 * 30 + minutes * 0.5) - 90
  const minuteAngle = (minutes * 6) - 90
  const secondAngle = (seconds * 6) - 90

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

  return (
    <div className="day-view">
      <div className={`day-clock-container ${!isToday ? 'inactive' : ''}`}>
        <div className={`day-clock ${!isToday ? 'inactive' : ''}`}>
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
                    fontSize="12"
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

            {/* Центр циферблата */}
            <circle cx="100" cy="100" r="5" className="clock-center" />

            {/* Стрелки */}
            {/* Часовая стрелка */}
            <line
              x1="100"
              y1="100"
              x2={100 + 35 * Math.cos(hourAngle * Math.PI / 180)}
              y2={100 + 35 * Math.sin(hourAngle * Math.PI / 180)}
              className="hour-hand"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Минутная стрелка */}
            <line
              x1="100"
              y1="100"
              x2={100 + 50 * Math.cos(minuteAngle * Math.PI / 180)}
              y2={100 + 50 * Math.sin(minuteAngle * Math.PI / 180)}
              className="minute-hand"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Секундная стрелка */}
            <line
              x1="100"
              y1="100"
              x2={100 + 55 * Math.cos(secondAngle * Math.PI / 180)}
              y2={100 + 55 * Math.sin(secondAngle * Math.PI / 180)}
              className="second-hand"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
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
            
              return (
              <div 
                key={event.id} 
                className={`day-event-item ${isAllDay || endsOtherDay ? 'all-day' : ''}`}
                onClick={() => {
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
    </div>
  )
}

export default DayView

