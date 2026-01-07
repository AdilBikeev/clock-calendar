import React, { useState, useRef, useEffect } from 'react'
import { format, isSameDay, startOfMonth } from 'date-fns'
import { ru } from 'date-fns/locale'
import MonthView from './MonthView'
import YearView from './YearView'
import NavigationBar from './NavigationBar'
import EventModal from './EventModal'
import { Event, EVENT_COLORS } from '../types/event'
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
  const [events, setEvents] = useState<Event[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(null)
  const swipeRef = useRef<SwipeRef>({ startX: 0, startY: 0, isDragging: false })

  // Загрузка событий из localStorage
  useEffect(() => {
    const savedEvents = localStorage.getItem('calendar-events')
    if (savedEvents) {
      try {
        const parsed = JSON.parse(savedEvents)
        const eventsWithDates = parsed.map((e: any) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate)
        }))
        setEvents(eventsWithDates)
      } catch (error) {
        console.error('Error loading events:', error)
      }
    }
  }, [])

  // Сохранение событий в localStorage
  useEffect(() => {
    if (events.length > 0 || localStorage.getItem('calendar-events')) {
      localStorage.setItem('calendar-events', JSON.stringify(events))
    }
  }, [events])

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

  const handleDayClick = (date: Date): void => {
    setSelectedDate(date)
    setSelectedEvent(null)
    setHighlightedDate(null)
    setIsModalOpen(true)
  }

  const handleEventClick = (event: Event): void => {
    setSelectedEvent(event)
    setSelectedDate(null)
    setIsModalOpen(true)
  }

  const handleSaveEvent = (event: Event): void => {
    const existingIndex = events.findIndex(e => e.id === event.id)
    
    if (existingIndex >= 0) {
      // Обновление существующего события
      const updated = [...events]
      updated[existingIndex] = {
        ...event,
        color: event.color || updated[existingIndex].color
      }
      setEvents(updated)
    } else {
      // Добавление нового события
      // Находим уже используемые цвета для этого дня
      const dayEvents = events.filter(e => {
        const eventStart = new Date(e.startDate)
        const newEventStart = new Date(event.startDate)
        return isSameDay(eventStart, newEventStart)
      })
      const usedColors = dayEvents.map(e => e.color)
      
      // Находим первый доступный цвет
      let availableColor = EVENT_COLORS[0]
      for (const color of EVENT_COLORS) {
        if (!usedColors.includes(color)) {
          availableColor = color
          break
        }
      }
      
      const newEvent: Event = {
        ...event,
        color: availableColor
      }
      setEvents([...events, newEvent])
    }

    // Устанавливаем дату на день события и переключаемся на месячный вид
    const eventDate = new Date(event.startDate)
    setCurrentDate(startOfMonth(eventDate))
    setViewMode('month')
    
    // Выделяем день с событием
    setHighlightedDate(eventDate)

    // Очищаем выделение через 3 секунды
    setTimeout(() => {
      setHighlightedDate(null)
    }, 3000)

    // Закрываем модальное окно
    setIsModalOpen(false)
    setSelectedDate(null)
    setSelectedEvent(null)
  }

  const handleDeleteEvent = (eventId: string): void => {
    setEvents(events.filter(e => e.id !== eventId))
    setIsModalOpen(false)
    setSelectedDate(null)
    setSelectedEvent(null)
  }

  const handleCloseModal = (): void => {
    setIsModalOpen(false)
    setSelectedDate(null)
    setSelectedEvent(null)
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
          <MonthView 
            key={`month-${currentDate.getFullYear()}-${currentDate.getMonth()}`}
            currentDate={currentDate}
            events={events}
            highlightedDate={highlightedDate}
            onDayClick={(date: Date, isOtherMonth: boolean) => {
              if (isOtherMonth) {
                setCurrentDate(startOfMonth(date))
                setHighlightedDate(null)
              } else {
                handleDayClick(date)
              }
            }}
            onEventClick={handleEventClick}
          />
        ) : (
          <YearView 
            key={`year-${currentDate.getFullYear()}`}
            currentDate={currentDate} 
            onMonthClick={(monthDate: Date) => {
              setCurrentDate(monthDate)
              setViewMode('month')
            }}
          />
        )}
      </div>

      <NavigationBar viewMode={viewMode} setViewMode={setViewMode} />

      <EventModal
        isOpen={isModalOpen}
        selectedDate={selectedDate}
        event={selectedEvent}
        onClose={handleCloseModal}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  )
}

export default CalendarApp

