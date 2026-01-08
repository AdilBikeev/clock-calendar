import { useRef, useCallback } from 'react'
import { CALENDAR_CONFIG } from '../constants'

interface SwipeRef {
  startX: number
  startY: number
  isDragging: boolean
}

/**
 * Custom hook для обработки свайпов (жестов перетаскивания)
 */
export const useSwipe = (onSwipeLeft: () => void, onSwipeRight: () => void) => {
  const swipeRef = useRef<SwipeRef>({ startX: 0, startY: 0, isDragging: false })

  const handleStart = useCallback((clientX: number, clientY: number) => {
    swipeRef.current.startX = clientX
    swipeRef.current.startY = clientY
    swipeRef.current.isDragging = true
  }, [])

  const handleEnd = useCallback(
    (clientX: number, clientY: number) => {
      if (!swipeRef.current.isDragging) return

      const diffX = swipeRef.current.startX - clientX
      const diffY = swipeRef.current.startY - clientY

      if (
        Math.abs(diffX) > Math.abs(diffY) &&
        Math.abs(diffX) > CALENDAR_CONFIG.MIN_SWIPE_DISTANCE
      ) {
        if (diffX > 0) {
          onSwipeLeft()
        } else {
          onSwipeRight()
        }
      }

      swipeRef.current.isDragging = false
    },
    [onSwipeLeft, onSwipeRight]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY)
    },
    [handleStart]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0]
      handleEnd(touch.clientX, touch.clientY)
    },
    [handleEnd]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY)
      e.preventDefault()
    },
    [handleStart]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handleEnd(e.clientX, e.clientY)
    },
    [handleEnd]
  )

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      if (swipeRef.current.isDragging) {
        handleEnd(e.clientX, e.clientY)
      }
    },
    [handleEnd]
  )

  return {
    handleTouchStart,
    handleTouchEnd,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
  }
}
