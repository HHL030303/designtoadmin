import { PROJECT_STORAGE_KEY } from '../constants/storage'

type ApiEnvelope<T> = {
  success: boolean
  status_code: number
  status_message: string
  data: T
}

type RequestOptions = {
  body?: unknown
  includeProjectHeader?: boolean
  headers?: HeadersInit
  method?: 'GET' | 'POST'
  projectHeaderId?: string
  query?: Record<string, string | number | undefined>
}

type StoredProject = {
  id?: string
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(path, window.location.origin)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return `${url.pathname}${url.search}`
}

function getStoredProjectId() {
  const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as StoredProject
    return parsed.id ?? null
  } catch {
    return null
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers)

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.includeProjectHeader !== false) {
    const projectId = options.projectHeaderId ?? getStoredProjectId()

    if (projectId) {
      headers.set('X-Project-Id', projectId)
    }
  }

  const response = await fetch(buildUrl(path, options.query), {
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
    headers,
    method: options.method ?? 'GET',
  })

  const payload = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !payload.success) {
    throw new Error(payload.status_message || '请求失败，请稍后重试')
  }

  return payload.data
}
