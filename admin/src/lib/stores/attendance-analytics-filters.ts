import { format, subDays } from 'date-fns'
import { create } from 'zustand'

type YearMode = 'present' | 'absent' | 'both'
type TableStatus = 'all' | 'present' | 'absent'

export type AttendanceAnalyticsFilters = {
  centreId: string
  batchId: string
  studentId: string
  month: string
  fromDate: string
  toDate: string
  year: string
  yearMode: YearMode
  tableStatus: TableStatus
  studentSearch: string
}

type AttendanceAnalyticsFilterStore = AttendanceAnalyticsFilters & {
  setFilter: <K extends keyof AttendanceAnalyticsFilters>(key: K, value: AttendanceAnalyticsFilters[K]) => void
  patchFilters: (next: Partial<AttendanceAnalyticsFilters>) => void
  resetFilters: () => void
}

function buildDefaultFilters(): AttendanceAnalyticsFilters {
  const now = new Date()

  return {
    centreId: '',
    batchId: '',
    studentId: '',
    month: '',
    fromDate: format(subDays(now, 29), 'yyyy-MM-dd'),
    toDate: format(now, 'yyyy-MM-dd'),
    year: String(now.getFullYear()),
    yearMode: 'both',
    tableStatus: 'all',
    studentSearch: '',
  }
}

export const useAttendanceAnalyticsFilterStore = create<AttendanceAnalyticsFilterStore>((set) => ({
  ...buildDefaultFilters(),
  setFilter: (key, value) =>
    set(() => ({
      [key]: value,
    })),
  patchFilters: (next) => set((state) => ({ ...state, ...next })),
  resetFilters: () => set(() => buildDefaultFilters()),
}))
