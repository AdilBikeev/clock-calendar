import React, { useState, useRef, useEffect } from 'react'
import { format, isSameDay, startOfMonth } from 'date-fns'
import { ru } from 'date-fns/locale'
import MonthView from './MonthView'
import YearView from './YearView'
import DayView from './DayView'
import NavigationBar from './NavigationBar'
import EventModal from './EventModal'
import { Event, EVENT_COLORS } from '../types/event'
import './CalendarApp.css'

type ViewMode = 'month' | 'year' | 'day'

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
  const calendarAppRef = useRef<HTMLDivElement>(null)
  const calendarContentRef = useRef<HTMLDivElement>(null)

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

  // Автоматическое масштабирование контента если он не помещается
  useEffect(() => {
    const adjustScale = (): void => {
      const app = calendarAppRef.current
      const content = calendarContentRef.current
      if (!app || !content) return

      const header = app.querySelector('.calendar-header') as HTMLElement
      const headerHeight = header?.offsetHeight || 0
      
      // Вычисляем доступную высоту: высота экрана минус навигация (70px) минус отступы (20px сверху и снизу)
      const navHeight = 70
      const rootPadding = 20
      const availableHeight = window.innerHeight - navHeight - rootPadding
      
      // Максимальная высота контента: доступная высота минус header минус padding calendar-app (30px)
      const appPadding = 30
      const maxContentHeight = availableHeight - headerHeight - appPadding

      // Получаем реальную высоту контента
      content.style.transform = '' // Сбрасываем трансформацию для измерения
      content.style.transformOrigin = ''
      const contentHeight = content.scrollHeight

      if (contentHeight > maxContentHeight && maxContentHeight > 0) {
        const scale = Math.min(maxContentHeight / contentHeight, 1)
        content.style.transform = `scale(${scale})`
        content.style.transformOrigin = 'top center'
      } else {
        content.style.transform = ''
        content.style.transformOrigin = ''
      }
    }

    // Задержка для завершения рендеринга
    const timeoutId = setTimeout(adjustScale, 50)
    window.addEventListener('resize', adjustScale)

    return () => {
      window.removeEventListener('resize', adjustScale)
      clearTimeout(timeoutId)
    }
  }, [viewMode, currentDate, events])

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

  const handlePreviousDay = (): void => {
    const prevDay = new Date(currentDate)
    prevDay.setDate(prevDay.getDate() - 1)
    setCurrentDate(prevDay)
  }

  const handleNextDay = (): void => {
    const nextDay = new Date(currentDate)
    nextDay.setDate(nextDay.getDate() + 1)
    setCurrentDate(nextDay)
  }

  const handleSwipeLeft = (): void => {
    if (viewMode === 'day') {
      handleNextDay()
    } else if (viewMode === 'month') {
      handleNextMonth()
    } else {
      handleNextYear()
    }
  }

  const handleSwipeRight = (): void => {
    if (viewMode === 'day') {
      handlePreviousDay()
    } else if (viewMode === 'month') {
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

  const handleDayClick = (date: Date, isOtherMonth: boolean): void => {
    // При клике на любой день - открываем представление "День" для этого дня
    setCurrentDate(date)
    setViewMode('day')
  }

  const handleCreateEvent = (): void => {
    let defaultDate: Date
    
    if (viewMode === 'day') {
      // Если находимся в представлении "День", используем выбранный день
      defaultDate = new Date(currentDate)
      defaultDate.setHours(0, 0, 0, 0)
    } else {
      // Иначе используем текущий день
      defaultDate = new Date()
      defaultDate.setHours(0, 0, 0, 0)
    }
    
    setSelectedDate(defaultDate)
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

    // Обновляем представление в зависимости от текущего режима просмотра
    const eventDate = new Date(event.startDate)
    
    if (viewMode === 'month') {
      // Если находимся в месячном представлении, обновляем месяц только если событие в другом месяце
      const eventMonth = startOfMonth(eventDate)
      const currentMonth = startOfMonth(currentDate)
      if (eventMonth.getTime() !== currentMonth.getTime()) {
        setCurrentDate(eventMonth)
      }
      // Выделяем день с событием
      setHighlightedDate(eventDate)
      // Очищаем выделение через 3 секунды
      setTimeout(() => {
        setHighlightedDate(null)
      }, 3000)
    } else if (viewMode === 'day') {
      // Если находимся в дневном представлении, обновляем день только если событие в другой день
      if (!isSameDay(eventDate, currentDate)) {
        setCurrentDate(eventDate)
      }
    } else if (viewMode === 'year') {
      // Если находимся в годовом представлении, обновляем год только если событие в другом году
      const eventYear = eventDate.getFullYear()
      const currentYear = currentDate.getFullYear()
      if (eventYear !== currentYear) {
        setCurrentDate(new Date(eventYear, 0, 1))
      }
    }

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
  const dayTitle = format(currentDate, 'd MMMM yyyy', { locale: ru })

  return (
    <div className="calendar-app" ref={calendarAppRef}>
      <div className="calendar-header">
        <div className="header-navigation">
          <button 
            className="nav-button" 
            onClick={
              viewMode === 'day' 
                ? handlePreviousDay 
                : viewMode === 'month' 
                  ? handlePreviousMonth 
                  : handlePreviousYear
            }
            aria-label="Предыдущий период"
          >
            ‹
          </button>
          <h1 className="calendar-title">
            {viewMode === 'month' ? monthTitle : viewMode === 'year' ? yearTitle : dayTitle}
          </h1>
          <button 
            className="nav-button" 
            onClick={
              viewMode === 'day' 
                ? handleNextDay 
                : viewMode === 'month' 
                  ? handleNextMonth 
                  : handleNextYear
            }
            aria-label="Следующий период"
          >
            ›
          </button>
        </div>
      </div>

      <button 
        className="calendar-add-event-btn-header"
        onClick={handleCreateEvent}
        title="Добавить событие"
        aria-label="Добавить событие"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <div 
        ref={calendarContentRef}
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
            onDayClick={handleDayClick}
          />
        ) : viewMode === 'year' ? (
          <YearView 
            key={`year-${currentDate.getFullYear()}`}
            currentDate={currentDate} 
            onMonthClick={(monthDate: Date) => {
              setCurrentDate(monthDate)
              setViewMode('month')
            }}
          />
        ) : (
          <DayView 
            key={`day-${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`}
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      <NavigationBar 
        viewMode={viewMode} 
        setViewMode={(mode: ViewMode) => {
          if (mode === 'day') {
            // При переключении на "День" устанавливаем текущий день
            setCurrentDate(new Date())
          }
          setViewMode(mode)
        }}
      />

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

