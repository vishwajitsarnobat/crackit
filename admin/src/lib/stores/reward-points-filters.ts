import { create } from 'zustand'

export type RewardPointsFilters = {
  centreId: string
  batchId: string
  search: string
  selectedStudentId: string
}

type RewardPointsFilterStore = RewardPointsFilters & {
  setFilter: <K extends keyof RewardPointsFilters>(key: K, value: RewardPointsFilters[K]) => void
  patchFilters: (next: Partial<RewardPointsFilters>) => void
  resetFilters: () => void
}

const defaultState: RewardPointsFilters = {
  centreId: '',
  batchId: '',
  search: '',
  selectedStudentId: '',
}

export const useRewardPointsFilterStore = create<RewardPointsFilterStore>((set) => ({
  ...defaultState,
  setFilter: (key, value) => set(() => ({ [key]: value })),
  patchFilters: (next) => set((state) => ({ ...state, ...next })),
  resetFilters: () => set(() => defaultState),
}))
