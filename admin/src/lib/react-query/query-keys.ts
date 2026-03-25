export const queryKeys = {
  manage: {
    all: ['manage'] as const,
    resource: (resource: string, filters?: Record<string, string>) =>
      ['manage', resource, filters ?? {}] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    resource: (resource: string, filters?: Record<string, string>) =>
      ['analytics', resource, filters ?? {}] as const,
  },
  reports: {
    all: ['reports'] as const,
    resource: (resource: string, filters?: Record<string, string>) =>
      ['reports', resource, filters ?? {}] as const,
  },
  profile: ['profile'] as const,
} as const
