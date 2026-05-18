import { apiRequest } from './apiClient'

export interface UserWorkloadFilters {
  dateFrom?: string
  dateTo?: string
  roleCode?: string
}

export interface UserWorkloadResponse {
  items: Record<string, unknown>[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeItems(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is Record<string, unknown> => isRecord(item))
  }

  if (isRecord(data) && Array.isArray(data.items)) {
    return data.items.filter((item): item is Record<string, unknown> => isRecord(item))
  }

  return []
}

export const statisticsService = {
  async getUserWorkload(filters: UserWorkloadFilters): Promise<UserWorkloadResponse> {
    const roleCode = filters.roleCode?.trim()
    const query: Record<string, string> = {
      ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
      ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
      ...(roleCode
        ? {
          role: roleCode,
          role_code: roleCode,
          user_role: roleCode,
        }
        : {}),
    }

    const data = await apiRequest<unknown>('/api/statistics/user_workload', { query })

    return {
      items: normalizeItems(data),
    }
  },
}
