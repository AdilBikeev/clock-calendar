import React from 'react'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday
} from 'date-fns'
import { ru } from 'date-fns/locale'
import './MonthView.css'

interface MonthViewProps {
  currentDate: Date
  onDayClick?: (date: Date) => void
}

const MonthView: React.FC<MonthViewProps> = ({ currentDate, onDayClick }) => {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { locale: ru })
  const calendarEnd = endOfWeek(monthEnd, { locale: ru })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weekDays: string[] = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const handleDayClick = (day: Date, isCurrentMonth: boolean): void => {
    if (!isCurrentMonth && onDayClick) {
      // При клике на день другого месяца переключаемся на этот месяц
      onDayClick(startOfMonth(day))
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
          const dayOfWeek = day.getDay() // 0 = воскресенье, 6 = суббота
          const isSaturday = dayOfWeek === 6
          const isSunday = dayOfWeek === 0
          
          return (
            <div
              key={index}
              className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''} ${isSaturday ? 'saturday' : ''} ${isSunday ? 'sunday' : ''}`}
              style={{
                animationDelay: `${index * 0.01}s`
              }}
              onClick={() => handleDayClick(day, isCurrentMonth)}
            >
              <span className="day-number">{format(day, 'd')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MonthView

