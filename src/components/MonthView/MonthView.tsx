import React from 'react'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { Event } from '../../types/event'
import './MonthView.css'

interface MonthViewProps {
  currentDate: Date
  events: Event[]
  highlightedDate?: Date | null
  onDayClick?: (date: Date) => void
}

const MonthView: React.FC<MonthViewProps> = ({ currentDate, events, highlightedDate, onDayClick }) => {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { locale: ru })
  const calendarEnd = endOfWeek(monthEnd, { locale: ru })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays: string[] = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const getDayEvents = (day: Date): Event[] => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      return isSameDay(eventStart, day)
    })
  }

  const handleDayClick = (day: Date): void => {
    if (onDayClick) {
      // При клике на любой день - открываем представление "День" для этого дня
      onDayClick(day)
    }
  }

  return (
    <div className="month-view">
      <div className="weekdays">
        {weekDays.map((day, index) => {
          const isSaturday = index === 5
          const isSunday = index === 6
          return (
            <div 
              key={index} 
              className={`weekday ${isSaturday ? 'saturday' : ''} ${isSunday ? 'sunday' : ''}`}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="days-grid">
        {days.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isCurrentDay = isToday(day)
          const isHighlighted = highlightedDate && isSameDay(day, highlightedDate)
          const dayOfWeek = day.getDay() // 0 = воскресенье, 6 = суббота
          const isSaturday = dayOfWeek === 6
          const isSunday = dayOfWeek === 0
          const dayEvents = getDayEvents(day)
          
          return (
            <div
              key={index}
              className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''} ${isHighlighted ? 'highlighted' : ''} ${isSaturday ? 'saturday' : ''} ${isSunday ? 'sunday' : ''}`}
              style={{
                animationDelay: `${index * 0.01}s`
              }}
              onClick={() => {
                // Любой клик по ячейке дня переводит в представление "День"
                handleDayClick(day)
              }}
            >
              <span className="day-number">{format(day, 'd')}</span>
              {dayEvents.length > 0 && (
                <div className="day-events-indicators">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="day-event-dot"
                      style={{ backgroundColor: event.color }}
                      title={event.title}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="day-event-more">
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MonthView

