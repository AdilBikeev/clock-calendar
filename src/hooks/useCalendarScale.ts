import { useEffect, RefObject } from 'react'
import { ViewMode, CALENDAR_CONFIG } from '../constants'

/**
 * Custom hook для автоматического масштабирования календаря
 */
export const useCalendarScale = (
  calendarAppRef: RefObject<HTMLDivElement>,
  calendarContentRef: RefObject<HTMLDivElement>,
  viewMode: ViewMode
) => {
  useEffect(() => {
    const adjustScale = (): void => {
      const app = calendarAppRef.current
      const content = calendarContentRef.current
      if (!app || !content) return

      // Не применяем масштабирование для day-view, там используется прокрутка
      if (viewMode === 'day') {
        content.style.transform = ''
        content.style.transformOrigin = ''
        return
      }

      const header = app.querySelector('.calendar-header') as HTMLElement
      const headerHeight = header?.offsetHeight || 0

      // Вычисляем доступную высоту: высота экрана минус навигация минус отступы
      const availableHeight =
        window.innerHeight - CALENDAR_CONFIG.NAV_HEIGHT - CALENDAR_CONFIG.ROOT_PADDING

      // Максимальная высота контента: доступная высота минус header минус padding
      const maxContentHeight = availableHeight - headerHeight - CALENDAR_CONFIG.APP_PADDING

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
  }, [viewMode, calendarAppRef, calendarContentRef])
}
