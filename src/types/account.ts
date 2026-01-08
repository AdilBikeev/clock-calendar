export type AccountType = 'google' | 'outlook' | 'apple'

export interface CalendarAccount {
  id: string
  type: AccountType
  email: string
  name?: string
  accessToken?: string
  refreshToken?: string
  tokenExpiry?: number
  syncedAt?: Date
  calendarId?: string // ID календаря в внешней системе
}

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string // ISO 8601
    date?: string // YYYY-MM-DD
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  htmlLink?: string
  colorId?: string
}
