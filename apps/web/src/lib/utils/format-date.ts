import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

// Returns a human-readable relative label for session timestamps
export function formatSessionDate(date: Date): string {
  if (isToday(date)) return formatDistanceToNow(date, { addSuffix: true })
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d, yyyy')
}

// Returns a full timestamp for message tooltips
export function formatMessageTime(date: Date): string {
  return format(date, 'h:mm a')
}

// Returns a short file size label
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
