import { format } from 'date-fns'
import { create } from 'zustand'

export type FinancialAnalyticsFilters = {
  centreId: string
  month: string
  year: string
  salarySearch: string
  salaryBatchFilter: string
  feeSearch: string
  feeBatchFilter: string
}

type FinancialAnalyticsFilterStore = FinancialAnalyticsFilters & {
  setFilter: <K extends keyof FinancialAnalyticsFilters>(key: K, value: FinancialAnalyticsFilters[K]) => void
  patchFilters: (next: Partial<FinancialAnalyticsFilters>) => void
  resetFilters: () => void
}

function buildDefaultFilters(): FinancialAnalyticsFilters {
  const now = new Date()

  return {
    centreId: '',
    month: format(now, 'yyyy-MM'),
    year: String(now.getFullYear()),
    salarySearch: '',
    salaryBatchFilter: 'all',
    feeSearch: '',
    feeBatchFilter: 'all',
  }
}

export const useFinancialAnalyticsFilterStore = create<FinancialAnalyticsFilterStore>((set) => ({
  ...buildDefaultFilters(),
  setFilter: (key, value) => set(() => ({ [key]: value })),
  patchFilters: (next) => set((state) => ({ ...state, ...next })),
  resetFilters: () => set(() => buildDefaultFilters()),
}))
