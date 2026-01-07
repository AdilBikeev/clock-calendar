export interface Event {
  id: string
  title: string
  startDate: Date
  endDate: Date
  allDay: boolean
  description?: string
  color: string
}

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

