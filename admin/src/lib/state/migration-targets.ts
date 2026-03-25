export type MigrationTarget = {
  area: string
  currentPattern: 'fetch-useEffect' | 'custom-hook' | 'local-ui-state'
  targetPattern: 'tanstack-query' | 'zustand'
  filePath: string
  note: string
}

export const migrationTargets: MigrationTarget[] = [
  {
    area: 'Manage data resources',
    currentPattern: 'custom-hook',
    targetPattern: 'tanstack-query',
    filePath: 'src/lib/hooks/use-manage-data.ts',
    note: 'Natural first migration target because it already centralizes fetch logic.',
  },
  {
    area: 'Attendance analytics filters',
    currentPattern: 'local-ui-state',
    targetPattern: 'zustand',
    filePath: 'src/components/analytics/attendance/attendance-dashboard.tsx',
    note: 'Shared centre/batch/student filters should become reusable scoped client state.',
  },
  {
    area: 'Performance analytics data fetching',
    currentPattern: 'fetch-useEffect',
    targetPattern: 'tanstack-query',
    filePath: 'src/components/analytics/performance/performance-dashboard.tsx',
    note: 'Direct fetch lifecycle can move to cache-aware queries and invalidation.',
  },
  {
    area: 'Financial analytics filters',
    currentPattern: 'local-ui-state',
    targetPattern: 'zustand',
    filePath: 'src/components/analytics/financial/financial-dashboard.tsx',
    note: 'Month, year, and centre filters are a reusable dashboard state shape.',
  },
  {
    area: 'Approvals screen data fetching',
    currentPattern: 'fetch-useEffect',
    targetPattern: 'tanstack-query',
    filePath: 'src/app/(main)/approvals/page.tsx',
    note: 'Tab-based refetching maps well to query keys and mutations.',
  },
]
