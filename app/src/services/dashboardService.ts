import type { DashboardStats } from '../types'
import { apiRequest } from './apiClient'

type DashboardSummaryResponse = {
  overdue_count?: number | null
  sub_task_active_count?: number | null
  task_completed?: number | null
  task_processing?: number | null
  task_total?: number | null
}

function normalizeMetric(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export type DashboardDatasetConfig = {
  apiPath: string
  datasetName: string
  paramsJson: Record<string, unknown>
}

export type DashboardCustomMenuItem = {
  menuName: string
  requestUrl: string
}

export type DashboardStatisticConfig = {
  customMenuList: DashboardCustomMenuItem[]
  datasetList: DashboardDatasetConfig[]
  rawConfig: Record<string, unknown>
}

export type DashboardResolvedDataset = {
  apiPath: string
  data: unknown
  datasetName: string
  params: Record<string, string | number>
}

export type DashboardDatasetQueryOverrides = Record<string, Record<string, string>>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeDatasetConfig(entry: unknown): DashboardDatasetConfig | null {
  if (!isRecord(entry)) {
    return null
  }

  const apiPath = typeof entry.api_path === 'string' ? entry.api_path : ''
  const datasetName = typeof entry.dataset_name === 'string' ? entry.dataset_name : ''
  const paramsJson = isRecord(entry.params_json) ? entry.params_json : {}

  if (!apiPath || !datasetName) {
    return null
  }

  return {
    apiPath,
    datasetName,
    paramsJson,
  }
}

function normalizeCustomMenuItem(entry: unknown): DashboardCustomMenuItem | null {
  if (!isRecord(entry)) {
    return null
  }

  const menuName = typeof entry.menu_name === 'string' ? entry.menu_name.trim() : ''
  const requestUrl = typeof entry.request_url === 'string' ? entry.request_url.trim() : ''

  if (!menuName || !requestUrl) {
    return null
  }

  return {
    menuName,
    requestUrl,
  }
}

function buildTemplateContext(
  value: unknown,
  context: Record<string, string | number> = {},
): Record<string, string | number> {
  if (!isRecord(value)) {
    return context
  }

  Object.entries(value).forEach(([key, entry]) => {
    if (Array.isArray(entry)) {
      return
    }

    if (typeof entry === 'string' || typeof entry === 'number') {
      context[key] = entry
      return
    }

    if (isRecord(entry)) {
      buildTemplateContext(entry, context)
    }
  })

  return context
}

function resolveTemplateString(
  template: string,
  context: Record<string, string | number>,
): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, key: string) => {
    const replacement = context[key]
    return replacement === undefined ? '' : String(replacement)
  })
}

function resolveQueryParams(
  paramsJson: Record<string, any>,
  context: Record<string, string | number>,
): Record<string, string | number> {
  const resolved: Record<string, any> = {}
  Object.entries(paramsJson).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const nextValue = resolveTemplateString(value, context)
      if (nextValue !== '') {
        resolved[key] = nextValue
      }
      return
    } else {
      resolved[key] = value
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      resolved[key] = value
    }
  })

  return resolved
}

export const dashboardService = {
  async getSummary(): Promise<DashboardStats> {
    const data = await apiRequest<DashboardSummaryResponse>('/api/statistics/summary')

    return {
      active: normalizeMetric(data.task_processing),
      archived: normalizeMetric(data.sub_task_active_count),
      overdue: normalizeMetric(data.overdue_count),
      total: normalizeMetric(data.task_total),
    }
  },

  async getStatisticConfig(): Promise<DashboardStatisticConfig> {
    const data = await apiRequest<Record<string, unknown>>('/api/project_statistic_config')
    const customMenuList = Array.isArray(data.custom_menu_list)
      ? data.custom_menu_list
        .map((entry) => normalizeCustomMenuItem(entry))
        .filter((entry): entry is DashboardCustomMenuItem => entry !== null)
      : []
    const datasetList = Array.isArray(data.dataset_list)
      ? data.dataset_list
        .map((entry) => normalizeDatasetConfig(entry))
        .filter((entry): entry is DashboardDatasetConfig => entry !== null)
      : []

    return {
      customMenuList,
      datasetList,
      rawConfig: data,
    }
  },

  async getResolvedDatasets(
    queryOverrides: DashboardDatasetQueryOverrides = {},
  ): Promise<DashboardResolvedDataset[]> {
    const config = await this.getStatisticConfig()
    const templateContext = buildTemplateContext(config.rawConfig)

    return Promise.all(
      config.datasetList.map(async (dataset) => {
        const datasetKey = `${dataset.datasetName}::${dataset.apiPath}`
        const params = {
          ...resolveQueryParams(dataset.paramsJson, templateContext),
          ...(queryOverrides[datasetKey] ?? {}),
        }
        const data = await apiRequest<unknown>(dataset.apiPath, { query: params })

        return {
          apiPath: dataset.apiPath,
          data,
          datasetName: dataset.datasetName,
          params,
        }
      }),
    )
  },
}
