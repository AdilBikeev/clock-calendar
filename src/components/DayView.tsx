import React, { useState, useEffect } from 'react'
import { isSameDay } from 'date-fns'
import './DayView.css'

interface DayViewProps {
  currentDate: Date
}

const DayView: React.FC<DayViewProps> = ({ currentDate }) => {
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
    </div>
  )
}

export default DayView

