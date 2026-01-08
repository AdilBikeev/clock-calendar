export const EVENT_COLORS: string[] = [
  '#007aff', // Синий
  '#ff3b30', // Красный
  '#ff9500', // Оранжевый
  '#ffcc00', // Желтый
  '#34c759', // Зеленый
  '#5ac8fa', // Голубой
  '#af52de', // Фиолетовый
  '#ff2d55', // Розовый
]

export const STORAGE_KEYS = {
  CALENDAR_EVENTS: 'calendar-events',
  CALENDAR_ACCOUNTS: 'calendar-accounts',
} as const

export const CALENDAR_CONFIG = {
  NAV_HEIGHT: 90,
  ROOT_PADDING: 20,
  APP_PADDING: 30,
  MIN_SWIPE_DISTANCE: 50,
  HIGHLIGHT_TIMEOUT: 3000,
} as const

export type ViewMode = 'month' | 'year' | 'day'
