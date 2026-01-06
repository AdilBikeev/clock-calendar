import React, { useState, useRef } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import MonthView from './MonthView'
import YearView from './YearView'
import NavigationBar from './NavigationBar'
import './CalendarApp.css'

type ViewMode = 'month' | 'year'

interface SwipeRef {
  startX: number
  startY: number
  isDragging: boolean
}

const CalendarApp: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const swipeRef = useRef<SwipeRef>({ startX: 0, startY: 0, isDragging: false })

  const handlePreviousMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handlePreviousYear = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))
  }

  const handleNextYear = (): void => {
    setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))
  }

  const handleSwipeLeft = (): void => {
    if (viewMode === 'month') {
      handleNextMonth()
    } else {
      handleNextYear()
    }
  }

  const handleSwipeRight = (): void => {
    if (viewMode === 'month') {
      handlePreviousMonth()
    } else {
      handlePreviousYear()
    }
  }

  const handleStart = (clientX: number, clientY: number): void => {
    swipeRef.current.startX = clientX
    swipeRef.current.startY = clientY
    swipeRef.current.isDragging = true
  }

  const handleEnd = (clientX: number, clientY: number): void => {
    if (!swipeRef.current.isDragging) return

    const diffX = swipeRef.current.startX - clientX
    const diffY = swipeRef.current.startY - clientY
    const minSwipeDistance = 50

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        handleSwipeLeft()
      } else {
        handleSwipeRight()
      }
    }

    swipeRef.current.isDragging = false
  }

  const handleTouchStart = (e: React.TouchEvent): void => {
    const touch = e.touches[0]
    handleStart(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = (e: React.TouchEvent): void => {
    const touch = e.changedTouches[0]
    handleEnd(touch.clientX, touch.clientY)
  }

  const handleMouseDown = (e: React.MouseEvent): void => {
    handleStart(e.clientX, e.clientY)
    e.preventDefault()
  }

  const handleMouseUp = (e: React.MouseEvent): void => {
    handleEnd(e.clientX, e.clientY)
  }

  const handleMouseLeave = (e: React.MouseEvent): void => {
    if (swipeRef.current.isDragging) {
      handleEnd(e.clientX, e.clientY)
    }
  }

  const monthTitle = format(currentDate, 'LLLL yyyy', { locale: ru })
  const yearTitle = format(currentDate, 'yyyy', { locale: ru })

  return (
    <div className="calendar-app">
      <div className="calendar-header">
        <div className="header-navigation">
          <button 
            className="nav-button" 
            onClick={viewMode === 'month' ? handlePreviousMonth : handlePreviousYear}
            aria-label="Предыдущий период"
          >
            ‹
          </button>
          <h1 className="calendar-title">
            {viewMode === 'month' ? monthTitle : yearTitle}
          </h1>
          <button 
            className="nav-button" 
            onClick={viewMode === 'month' ? handleNextMonth : handleNextYear}
            aria-label="Следующий период"
          >
            ›
          </button>
        </div>
      </div>

      <div 
        className="calendar-content"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {viewMode === 'month' ? (
          <MonthView currentDate={currentDate} />
        ) : (
          <YearView currentDate={currentDate} />
        )}
      </div>

      <NavigationBar viewMode={viewMode} setViewMode={setViewMode} />
    </div>
  )
}

export default CalendarApp

