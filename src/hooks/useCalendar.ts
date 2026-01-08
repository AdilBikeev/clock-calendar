import { useState, useCallback } from 'react'
import { ViewMode } from '../constants'

/**
 * Custom hook для навигации по календарю
 */
export const useCalendar = (initialDate: Date = new Date(), initialViewMode: ViewMode = 'month') => {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate)
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)

  /**
   * Переход к предыдущему месяцу
   */
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])

  /**
   * Переход к следующему месяцу
   */
  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])

  /**
   * Переход к предыдущему году
   */
  const goToPreviousYear = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1))
  }, [])

  /**
   * Переход к следующему году
   */
  const goToNextYear = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1))
  }, [])

  /**
   * Переход к предыдущему дню
   */
  const goToPreviousDay = useCallback(() => {
    setCurrentDate((prev) => {
      const prevDay = new Date(prev)
      prevDay.setDate(prevDay.getDate() - 1)
      return prevDay
    })
  }, [])

  /**
   * Переход к следующему дню
   */
  const goToNextDay = useCallback(() => {
    setCurrentDate((prev) => {
      const nextDay = new Date(prev)
      nextDay.setDate(nextDay.getDate() + 1)
      return nextDay
    })
  }, [])

  /**
   * Переход к предыдущему периоду в зависимости от режима просмотра
   */
  const goToPrevious = useCallback(() => {
    if (viewMode === 'day') {
      goToPreviousDay()
    } else if (viewMode === 'month') {
      goToPreviousMonth()
    } else {
      goToPreviousYear()
    }
  }, [viewMode, goToPreviousDay, goToPreviousMonth, goToPreviousYear])

  /**
   * Переход к следующему периоду в зависимости от режима просмотра
   */
  const goToNext = useCallback(() => {
    if (viewMode === 'day') {
      goToNextDay()
    } else if (viewMode === 'month') {
      goToNextMonth()
    } else {
      goToNextYear()
    }
  }, [viewMode, goToNextDay, goToNextMonth, goToNextYear])

  /**
   * Переключение режима просмотра
   */
  const changeViewMode = useCallback(
    (mode: ViewMode) => {
      if (mode === 'day') {
        // При переключении на "День" устанавливаем текущий день
        setCurrentDate(new Date())
      }
      setViewMode(mode)
    },
    []
  )

  /**
   * Переход к конкретной дате
   */
  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date)
  }, [])

  return {
    currentDate,
    viewMode,
    setCurrentDate,
    setViewMode: changeViewMode,
    goToPrevious,
    goToNext,
    goToPreviousMonth,
    goToNextMonth,
    goToPreviousYear,
    goToNextYear,
    goToPreviousDay,
    goToNextDay,
    goToDate,
  }
}
