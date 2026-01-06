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
  getMonth,
  isSameYear
} from 'date-fns'
import { ru } from 'date-fns/locale'
import './YearView.css'

interface YearViewProps {
  currentDate: Date
  onMonthClick?: (monthDate: Date) => void
}

const YearView: React.FC<YearViewProps> = ({ currentDate, onMonthClick }) => {
  const currentYear = currentDate.getFullYear()
  const months = Array.from({ length: 12 }, (_, i) => new Date(currentYear, i, 1))

  const handleMonthClick = (monthDate: Date): void => {
    if (onMonthClick) {
      onMonthClick(monthDate)
    }
  }

  const renderMiniMonth = (monthDate: Date): React.ReactElement => {
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    const calendarStart = startOfWeek(monthStart, { locale: ru })
    const calendarEnd = endOfWeek(monthEnd, { locale: ru })

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
    // Дни недели как одна буква на английском (M, T, W, T, F, S, S)
    const weekDays: string[] = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    
    // Проверяем, является ли этот месяц текущим выбранным месяцем
    const isSelectedMonth = isSameMonth(monthDate, currentDate) && isSameYear(monthDate, currentDate)

    return (
      <div 
        key={getMonth(monthDate)} 
        className={`mini-month ${isSelectedMonth ? 'selected-month' : ''}`}
        onClick={() => handleMonthClick(monthDate)}
        style={{
          animationDelay: `${getMonth(monthDate) * 0.03}s`
        }}
      >
        <div className="mini-month-title">
          {format(monthDate, 'LLLL', { locale: ru })}
        </div>
        <div className="mini-weekdays">
          {weekDays.map((day, index) => {
            const isSaturday = index === 5
            const isSunday = index === 6
            return (
              <div 
                key={index} 
                className={`mini-weekday ${isSaturday ? 'saturday' : ''} ${isSunday ? 'sunday' : ''}`}
              >
                {day}
              </div>
            )
          })}
        </div>
        <div className="mini-days-grid">
          {days.map((day, dayIndex) => {
            const isCurrentMonth = isSameMonth(day, monthDate)
            const isCurrentDay = isToday(day)
            const dayOfWeek = day.getDay() // 0 = воскресенье, 6 = суббота
            const isSaturday = dayOfWeek === 6
            const isSunday = dayOfWeek === 0
            
            return (
              <div
                key={dayIndex}
                className={`mini-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isCurrentDay ? 'today' : ''} ${isSaturday ? 'saturday' : ''} ${isSunday ? 'sunday' : ''}`}
                title={format(day, 'd MMMM yyyy', { locale: ru })}
              >
                <span className="mini-day-number">{format(day, 'd')}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="year-view">
      <div className="year-grid">
        {months.map(renderMiniMonth)}
      </div>
    </div>
  )
}

export default YearView

