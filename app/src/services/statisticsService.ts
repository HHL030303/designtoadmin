import { apiRequest } from './apiClient'

export interface UserWorkloadFilters {
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
  roleCode?: string
}

export interface UserWorkloadResponse {
  items: Record<string, unknown>[]
  page: number
  pageSize: number
  total: number
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
    const query: Record<string, string | number> = {
      ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
      ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
      page: filters.page ?? 1,
      page_size: filters.pageSize ?? 20,
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
      page:
        isRecord(data) && typeof data.page === 'number' && Number.isFinite(data.page)
          ? data.page
          : filters.page ?? 1,
      pageSize:
        isRecord(data) && typeof data.page_size === 'number' && Number.isFinite(data.page_size)
          ? data.page_size
          : filters.pageSize ?? 20,
      total:
        isRecord(data) && typeof data.total === 'number' && Number.isFinite(data.total)
          ? data.total
          : normalizeItems(data).length,
    }
  },
}
