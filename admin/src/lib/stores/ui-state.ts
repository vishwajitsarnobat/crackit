import { create } from 'zustand'

export type FilterScope =
  | 'analyticsAttendance'
  | 'analyticsPerformance'
  | 'analyticsStaffAttendance'
  | 'analyticsFinancials'
  | 'manageBatches'
  | 'manageEnrollments'
  | 'manageRewards'
  | 'taskExpenses'
  | 'taskSalary'
  | 'taskFees'
  | 'reportsStudents'

export type ScopedFilters = Record<string, string>

type UiStateStore = {
  filters: Partial<Record<FilterScope, ScopedFilters>>
  setFilters: (scope: FilterScope, next: ScopedFilters) => void
  patchFilters: (scope: FilterScope, next: Partial<ScopedFilters>) => void
  resetFilters: (scope: FilterScope) => void
  resetAllFilters: () => void
}

export const useUiStateStore = create<UiStateStore>((set) => ({
  filters: {},
  setFilters: (scope, next) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [scope]: next,
      },
    })),
  patchFilters: (scope, next) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [scope]: {
          ...(state.filters[scope] ?? {}),
          ...next,
        },
      },
    })),
  resetFilters: (scope) =>
    set((state) => {
      const filters = { ...state.filters }
      delete filters[scope]

      return { filters }
    }),
  resetAllFilters: () => set({ filters: {} }),
}))
