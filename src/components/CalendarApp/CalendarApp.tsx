import React, { useState, useRef, useEffect, useCallback } from 'react'
import { format, subMonths, addMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import SimpleBar from 'simplebar-react'
import { FaCog } from 'react-icons/fa'
import MonthView from '../MonthView/MonthView'
import YearView from '../YearView/YearView'
import DayView from '../DayView/DayView'
import NavigationBar from '../NavigationBar/NavigationBar'
import EventModal from '../EventModal/EventModal'
import SettingsPanel from '../SettingsPanel/SettingsPanel'
import AccountModal from '../AccountModal/AccountModal'
import { Event } from '../../types/event'
import { CALENDAR_CONFIG } from '../../constants'
import { useEvents } from '../../hooks/useEvents'
import { useCalendar } from '../../hooks/useCalendar'
import { useSwipe } from '../../hooks/useSwipe'
import { useCalendarScale } from '../../hooks/useCalendarScale'
import { useQuickAddEvent } from '../../hooks/useQuickAddEvent'
import { useAccounts } from '../../hooks/useAccounts'
import { shouldUpdateCurrentDate } from '../../services/eventService'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { configureGoogleSignIn } from '../../services/googleSignInService'
import 'simplebar-react/dist/simplebar.min.css'
import './CalendarApp.css'

const CalendarApp: React.FC = () => {
  // Используем custom hooks для управления состоянием
  const calendar = useCalendar()
  const { events, saveEvent, deleteEvent, addEvent, updateEvent } = useEvents()
  const {
    accounts,
    isAccountsLoaded,
    connectGoogleAccount,
    handleGoogleOAuthSuccess,
    syncAllAccounts,
    removeAccount,
  } = useAccounts()

  // Состояние для модального окна событий
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [highlightedDate, setHighlightedDate] = useState<Date | null>(null)
  const [focusedEventId, setFocusedEventId] = useState<string | null>(null)
  const [defaultAllDay, setDefaultAllDay] = useState<boolean>(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false)
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const hasSyncedOnMount = useRef<boolean>(false)
  const syncInProgressRef = useRef<boolean>(false)
  const lastSyncedDateRef = useRef<Date | null>(null)
  const lastSyncedAccountsCountRef = useRef<number>(0)
  const lastSyncTimeRef = useRef<number>(0)

  // Refs для DOM элементов
  const calendarAppRef = useRef<HTMLDivElement>(null)
  const calendarContentRef = useRef<HTMLDivElement>(null)

  // Используем custom hooks для свайпов и масштабирования
  const swipeHandlers = useSwipe(calendar.goToNext, calendar.goToPrevious)
  useCalendarScale(calendarAppRef, calendarContentRef, calendar.viewMode)

  // Инициализация Google Sign In при монтировании компонента
  useEffect(() => {
    const initGoogleSignIn = async () => {
      try {
        await configureGoogleSignIn()
      } catch (error) {
        // Google Sign In может быть недоступен (не React Native окружение)
        // Это нормально, будет использоваться веб-авторизация
        console.log('Google Sign In недоступен, будет использоваться веб-авторизация')
      }
    }

    initGoogleSignIn()
  }, [])

  // Обработчик создания события
  const handleCreateEvent = useCallback(() => {
    let defaultDate: Date

    if (calendar.viewMode === 'day') {
      // Если находимся в представлении "День", используем выбранный день
      defaultDate = new Date(calendar.currentDate)
      defaultDate.setHours(0, 0, 0, 0)
    } else {
      // Иначе используем текущий день
      defaultDate = new Date()
      defaultDate.setHours(0, 0, 0, 0)
    }

    setSelectedDate(defaultDate)
    setSelectedEvent(null)
    setHighlightedDate(null)
    setDefaultAllDay(true)
    setIsModalOpen(true)
  }, [calendar.viewMode, calendar.currentDate])

  // Хук для быстрого добавления событий
  const quickAdd = useQuickAddEvent(
    calendar.viewMode,
    calendar.currentDate,
    events,
    handleCreateEvent,
    (event) => {
      saveEvent(event, calendar.currentDate)
    }
  )

  // Сбрасываем фокус при изменении представления или даты
  useEffect(() => {
    if (calendar.viewMode !== 'day') {
      setFocusedEventId(null)
      setSelectedEvent(null)
      setHighlightedDate(null)
    }
  }, [calendar.viewMode])

  useEffect(() => {
    if (calendar.viewMode === 'day') {
      // При изменении дня в day view - сбрасываем фокус
      setFocusedEventId(null)
      setSelectedEvent(null)
    }
  }, [calendar.currentDate, calendar.viewMode])

  // Синхронизация событий из Google Calendar
  const syncGoogleEvents = useCallback(async () => {
    const now = Date.now()
    
    // Проверяем через ref, чтобы избежать гонки условий
    // Также проверяем, что прошло хотя бы 500мс с последней синхронизации
    if (accounts.length === 0 || syncInProgressRef.current || (now - lastSyncTimeRef.current < 500)) {
      return
    }

    syncInProgressRef.current = true
    lastSyncTimeRef.current = now
    setIsSyncing(true)
    try {
      // Определяем диапазон дат для синхронизации (текущий месяц ± 1 месяц)
      const timeMin = subMonths(calendar.currentDate, 1)
      const timeMax = addMonths(calendar.currentDate, 1)

      // Получаем события из всех подключенных аккаунтов
      const syncedEvents = await syncAllAccounts(timeMin, timeMax, events)

      // Создаем Set с ID всех синхронизированных событий из внешних источников
      const syncedEventIds = new Set(syncedEvents.map((e) => e.id))
      
      // Находим все события из внешних источников (Google), которые находятся в диапазоне синхронизации
      // Используем текущий список events для проверки
      const externalEventsInRange = events.filter((e) => {
        if (e.owner !== 'google') {
          return false // Игнорируем локальные события
        }
        // Проверяем, попадает ли событие в диапазон синхронизации
        const eventStart = new Date(e.startDate)
        return eventStart >= timeMin && eventStart <= timeMax
      })

      // Удаляем события из внешних источников, которых больше нет в ответе от источника
      // Важно: делаем это до добавления новых событий, чтобы не удалить только что добавленные
      const eventsToDelete: string[] = []
      for (const externalEvent of externalEventsInRange) {
        if (!syncedEventIds.has(externalEvent.id)) {
          // Событие больше не приходит от внешнего источника - помечаем для удаления
          eventsToDelete.push(externalEvent.id)
        }
      }

      // Удаляем отмеченные события
      eventsToDelete.forEach((eventId) => {
        deleteEvent(eventId)
      })

      // Обновляем существующие события из внешних источников и добавляем новые
      // Важно: обновляем только события из внешних источников (owner = 'google')
      // Локальные события не должны перезаписываться
      const existingEventIds = new Map(events.map((e) => [e.id, e]))
      for (const event of syncedEvents) {
        const existingEvent = existingEventIds.get(event.id)
        if (existingEvent) {
          // Событие уже существует
          // Обновляем только если это событие из внешнего источника
          // (чтобы не перезаписать локальные изменения)
          if (existingEvent.owner === 'google' || existingEvent.owner === event.owner) {
            updateEvent(event)
          }
        } else {
          // Добавляем только новое событие
          addEvent(event)
        }
      }
      
      // Обновляем метки последней синхронизации
      lastSyncedDateRef.current = new Date(calendar.currentDate)
      lastSyncedAccountsCountRef.current = accounts.length
    } catch (error) {
      // Ошибка синхронизации событий Google Calendar
      console.error('Ошибка синхронизации:', error)
    } finally {
      setIsSyncing(false)
      // Не сбрасываем syncInProgressRef сразу, дадим небольшую задержку
      setTimeout(() => {
        syncInProgressRef.current = false
      }, 500)
    }
  }, [accounts.length, syncAllAccounts, events, calendar.currentDate, addEvent, updateEvent])

  // Обработка OAuth callback через deep links
  useEffect(() => {
    const processOAuthCallback = (url: string) => {
      console.log('[CalendarApp] Обработка OAuth callback URL:', url)
      
      try {
        // Парсим URL (может быть кастомная схема com.clockcalendar.app://)
        let urlObj: URL
        try {
          urlObj = new URL(url)
        } catch (e) {
          // Если не удалось распарсить как URL, пробуем извлечь параметры из строки
          console.log('[CalendarApp] Попытка парсинга кастомной схемы URL')
          // Извлекаем параметры из строки вида: com.clockcalendar.app://oauth/google/callback?code=...&state=...
          const match = url.match(/[?&](code|state|error)=([^&]+)/g)
          if (!match) {
            console.error('[CalendarApp] Не удалось извлечь параметры из URL')
            return
          }
          
          const params: Record<string, string> = {}
          match.forEach((param) => {
            const [key, value] = param.substring(1).split('=')
            params[key] = decodeURIComponent(value)
          })
          
          const code = params.code
          const state = params.state
          const error = params.error

          if (error) {
            console.error('[CalendarApp] OAuth error:', error)
            return
          }

          if (code && state) {
            console.log('[CalendarApp] Параметры извлечены из кастомной схемы, обработка...')
            handleGoogleOAuthSuccess(code, state)
              .then(() => {
                syncGoogleEvents()
              })
              .catch((error) => {
                console.error('[CalendarApp] Ошибка обработки OAuth callback:', error)
              })
          }
          return
        }
        
        const code = urlObj.searchParams.get('code')
        const state = urlObj.searchParams.get('state')
        const error = urlObj.searchParams.get('error')

        if (error) {
          console.error('[CalendarApp] OAuth error:', error)
          return
        }

        if (code && state) {
          console.log('[CalendarApp] OAuth callback параметры получены, обработка...')
          // Обрабатываем OAuth callback
          handleGoogleOAuthSuccess(code, state)
            .then(() => {
              // Синхронизируем события после успешного подключения
              syncGoogleEvents()
            })
            .catch((error) => {
              console.error('[CalendarApp] Ошибка обработки OAuth callback:', error)
            })
        }
      } catch (error) {
        console.error('[CalendarApp] Ошибка парсинга URL:', error)
      }
    }

    // Для веб-приложений обрабатываем URL из window.location
    if (!Capacitor.isNativePlatform()) {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      const error = urlParams.get('error')

      if (error) {
        // Очищаем URL параметры
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      }

      if (code && state) {
        // Обрабатываем OAuth callback
        handleGoogleOAuthSuccess(code, state)
          .then(() => {
            // Синхронизируем события после успешного подключения
            syncGoogleEvents()
          })
          .catch(() => {
            // Ошибка обработки OAuth callback
          })
          .finally(() => {
            // Очищаем URL параметры
            window.history.replaceState({}, document.title, window.location.pathname)
          })
      }
    } else {
      const urlListener = App.addListener('appUrlOpen', (event) => {
        processOAuthCallback(event.url)
      })

      App.getLaunchUrl().then((result) => {
        if (result?.url) {
          processOAuthCallback(result.url)
        }
      })

      return () => {
        urlListener.then((l) => l.remove())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Обработчик события успешной нативной авторизации
  const handleNativeAuthSuccess = useCallback(async (event: any) => {
    const { state } = event.detail
    
    try {
      await handleGoogleOAuthSuccess('native_auth', state)
      sessionStorage.removeItem('oauth_state')
      sessionStorage.removeItem('oauth_native_result')
      await new Promise(resolve => setTimeout(resolve, 200))
      await syncGoogleEvents()
    } catch (error) {
      console.error('[CalendarApp] Ошибка обработки нативной авторизации:', error)
    }
  }, [handleGoogleOAuthSuccess, syncGoogleEvents])

  // Проверяем результаты нативной авторизации для Android
  const checkNativeAuth = useCallback(async () => {
    if (Capacitor.getPlatform() === 'android') {
      const savedState = sessionStorage.getItem('oauth_state')
      const nativeResult = sessionStorage.getItem('oauth_native_result')
      
      if (savedState && nativeResult) {
        try {
          const stateData = JSON.parse(atob(savedState))
          if (stateData.nativeAuth) {
            await handleGoogleOAuthSuccess('native_auth', savedState)
            sessionStorage.removeItem('oauth_state')
            sessionStorage.removeItem('oauth_native_result')
            await new Promise(resolve => setTimeout(resolve, 200))
            await syncGoogleEvents()
          }
        } catch (e) {
          console.error('[CalendarApp] Ошибка обработки сохраненного результата нативной авторизации:', e)
        }
      }
    }
  }, [handleGoogleOAuthSuccess, syncGoogleEvents])

  // Подписываемся на событие успешной нативной авторизации
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      window.addEventListener('google-native-auth-success', handleNativeAuthSuccess)
      
      // Проверяем нативную авторизацию при монтировании
      checkNativeAuth()
      
      return () => {
        window.removeEventListener('google-native-auth-success', handleNativeAuthSuccess)
      }
    }
  }, [handleNativeAuthSuccess, checkNativeAuth])

  // Автоматическая синхронизация при загрузке аккаунтов и при изменении даты/аккаунтов
  useEffect(() => {
    // Не синхронизируем если аккаунты еще не загружены или их нет
    if (!isAccountsLoaded || accounts.length === 0 || syncInProgressRef.current) {
      return
    }

    // Первая синхронизация при монтировании
    if (!hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true
      lastSyncedDateRef.current = new Date(calendar.currentDate)
      lastSyncedAccountsCountRef.current = accounts.length
      syncGoogleEvents()
      return
    }

    // Последующие синхронизации при изменении даты или количества аккаунтов
    const dateChanged = !lastSyncedDateRef.current || 
      lastSyncedDateRef.current.getTime() !== calendar.currentDate.getTime()
    const accountsCountChanged = lastSyncedAccountsCountRef.current !== accounts.length
    
    if (dateChanged || accountsCountChanged) {
      syncGoogleEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAccountsLoaded, calendar.currentDate, accounts.length])

  // Обработчики событий
  const handleDayClick = (date: Date): void => {
    // При клике на любой день - открываем представление "День" для этого дня
    calendar.goToDate(date)
    calendar.setViewMode('day')
  }

  const handleEventClick = (event: Event): void => {
    setSelectedEvent(event)
    setSelectedDate(null)
    setIsModalOpen(true)
    setFocusedEventId(event.id)
    // Сохраняем ID события для фокуса в DayView
    setHighlightedDate(new Date(event.startDate))
  }

  const handleSaveEvent = (event: Event): void => {
    // Определяем дату по умолчанию для цветов
    const defaultDate = event.startDate instanceof Date ? event.startDate : new Date()

    // Сохраняем событие
    saveEvent(event, defaultDate)

    // Обновляем представление в зависимости от текущего режима просмотра
    const eventDate = new Date(event.startDate)
    const newDate = shouldUpdateCurrentDate(eventDate, calendar.currentDate, calendar.viewMode)

    if (newDate) {
      calendar.goToDate(newDate)
    }

    // Выделяем день с событием в месячном представлении
    if (calendar.viewMode === 'month') {
      setHighlightedDate(eventDate)
      // Очищаем выделение через 3 секунды
      setTimeout(() => {
        setHighlightedDate(null)
      }, CALENDAR_CONFIG.HIGHLIGHT_TIMEOUT)
    }

    // Закрываем модальное окно
    setIsModalOpen(false)
    setSelectedDate(null)
    setSelectedEvent(null)
  }

  const handleDeleteEvent = (eventId: string): void => {
    deleteEvent(eventId)
    setIsModalOpen(false)
    setSelectedDate(null)
    setSelectedEvent(null)
    setFocusedEventId(null)
  }

  const handleCloseModal = (): void => {
    setIsModalOpen(false)
    setSelectedDate(null)
    setDefaultAllDay(false) // Сбрасываем флаг при закрытии
    // selectedEvent не сбрасываем сразу, чтобы сохранить фокус в DayView
    // Он будет сброшен при изменении представления или даты
  }

  const handleSettingsToggle = (): void => {
    setIsSettingsOpen(!isSettingsOpen)
  }

  const handleAddAccount = (): void => {
    setIsAccountModalOpen(true)
  }

  const handleSelectAccount = async (accountType: 'google') => {
    if (accountType === 'google') {
      try {
        await connectGoogleAccount()
        // OAuth процесс перенаправит пользователя на Google
        // После возврата callback будет обработан в useEffect выше
      } catch (error) {
        // Ошибка подключения Google аккаунта
        console.error('Ошибка подключения Google аккаунта:', error)
        alert(`Ошибка подключения Google аккаунта: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  const handleRemoveAccount = async (accountId: string) => {
    // Удаляем аккаунт (включая выход из Google Sign-In для Google аккаунтов)
    await removeAccount(accountId)
    // Удаляем события, связанные с этим аккаунтом
    const accountEvents = events.filter((e) => e.id.startsWith(`google-${accountId}-`))
    accountEvents.forEach((event) => {
      deleteEvent(event.id)
    })
  }

  // Форматирование заголовков
  const monthTitle = format(calendar.currentDate, 'LLLL yyyy', { locale: ru })
  const yearTitle = format(calendar.currentDate, 'yyyy', { locale: ru })
  const dayTitle = format(calendar.currentDate, 'd MMMM yyyy', { locale: ru })

  const calendarTitle =
    calendar.viewMode === 'month' ? monthTitle : calendar.viewMode === 'year' ? yearTitle : dayTitle

  return (
    <>
      <div className="app-wrapper">
        <div className="top-navigation-bar">
          <div className="top-nav-content">
            <div className="top-nav-spacer"></div>
            <button
              className="settings-button"
              aria-label="Настройки календаря"
              onClick={handleSettingsToggle}
            >
              <FaCog size={24} />
            </button>
          </div>
        </div>
        <div className="calendar-content-wrapper">
          <div className="calendar-app" ref={calendarAppRef}>
            <div className="calendar-header">
              <div className="header-navigation">
                <button
                  className="nav-button"
                  onClick={calendar.goToPrevious}
                  aria-label="Предыдущий период"
                >
                  ‹
                </button>
                <h1 className="calendar-title">{calendarTitle}</h1>
                <button
                  className="nav-button"
                  onClick={calendar.goToNext}
                  aria-label="Следующий период"
                >
                  ›
                </button>
              </div>
            </div>

            <div
              ref={calendarContentRef}
              className="calendar-content"
              onTouchStart={swipeHandlers.handleTouchStart}
              onTouchEnd={swipeHandlers.handleTouchEnd}
              onMouseDown={swipeHandlers.handleMouseDown}
              onMouseUp={swipeHandlers.handleMouseUp}
              onMouseLeave={swipeHandlers.handleMouseLeave}
            >
              {calendar.viewMode === 'month' ? (
                <MonthView
                  key={`month-${calendar.currentDate.getFullYear()}-${calendar.currentDate.getMonth()}`}
                  currentDate={calendar.currentDate}
                  events={events}
                  highlightedDate={highlightedDate}
                  onDayClick={handleDayClick}
                />
              ) : calendar.viewMode === 'year' ? (
                <SimpleBar
                  style={{ maxHeight: '100%', flex: '1 1 auto', minHeight: 0, padding: '8px' }}
                >
                  <YearView
                    key={`year-${calendar.currentDate.getFullYear()}`}
                    currentDate={calendar.currentDate}
                    onMonthClick={(monthDate: Date) => {
                      calendar.goToDate(monthDate)
                      calendar.setViewMode('month')
                    }}
                  />
                </SimpleBar>
              ) : (
                <DayView
                  key={`day-${calendar.currentDate.getFullYear()}-${calendar.currentDate.getMonth()}-${calendar.currentDate.getDate()}`}
                  currentDate={calendar.currentDate}
                  events={events}
                  onEventClick={handleEventClick}
                  highlightedEventId={focusedEventId}
                />
              )}
            </div>
          </div>
        </div>

        {/* Панель быстрого добавления событий (только для месячного и дневного календаря) */}
        {(calendar.viewMode === 'month' || calendar.viewMode === 'day') && (
          <div className="quick-add-event-bar">
            <input
              type="text"
              className="quick-add-event-input"
              placeholder="Название события"
              value={quickAdd.quickEventTitle}
              onChange={(e) => quickAdd.setQuickEventTitle(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  quickAdd.handleQuickAddEvent()
                }
              }}
            />
            <button
              className="quick-add-event-button"
              onClick={quickAdd.handleQuickAddEvent}
              title="Добавить событие"
              aria-label="Добавить событие"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <NavigationBar viewMode={calendar.viewMode} setViewMode={calendar.setViewMode} />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={handleSettingsToggle}
        onAddAccount={handleAddAccount}
        accounts={accounts}
        onRemoveAccount={handleRemoveAccount}
        onSync={syncGoogleEvents}
        isSyncing={isSyncing}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSelectAccount={handleSelectAccount}
      />

      <EventModal
        isOpen={isModalOpen}
        selectedDate={selectedDate}
        event={selectedEvent}
        onClose={handleCloseModal}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        defaultAllDay={defaultAllDay}
      />
    </>
  )
}

export default CalendarApp
