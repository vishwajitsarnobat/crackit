import { format, subDays } from 'date-fns'
import { create } from 'zustand'

type YearMode = 'present' | 'absent' | 'partial' | 'all'
type TableFilter = 'all' | 'present' | 'absent' | 'partial'

export type StaffAttendanceAnalyticsFilters = {
  centreId: string
  batchId: string
  teacherId: string
  fromDate: string
  toDate: string
  year: string
  yearMode: YearMode
  tableFilter: TableFilter
}

type StaffAttendanceAnalyticsFilterStore = StaffAttendanceAnalyticsFilters & {
  setFilter: <K extends keyof StaffAttendanceAnalyticsFilters>(
    key: K,
    value: StaffAttendanceAnalyticsFilters[K]
  ) => void
  patchFilters: (next: Partial<StaffAttendanceAnalyticsFilters>) => void
  resetFilters: () => void
}

function buildDefaultFilters(): StaffAttendanceAnalyticsFilters {
  const now = new Date()

  return {
    centreId: '',
    batchId: '',
    teacherId: '',
    fromDate: format(subDays(now, 29), 'yyyy-MM-dd'),
    toDate: format(now, 'yyyy-MM-dd'),
    year: String(now.getFullYear()),
    yearMode: 'all',
    tableFilter: 'all',
  }
}

export const useStaffAttendanceAnalyticsFilterStore = create<StaffAttendanceAnalyticsFilterStore>((set) => ({
  ...buildDefaultFilters(),
  setFilter: (key, value) => set(() => ({ [key]: value })),
  patchFilters: (next) => set((state) => ({ ...state, ...next })),
  resetFilters: () => set(() => buildDefaultFilters()),
}))
