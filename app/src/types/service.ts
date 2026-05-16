import type { ServiceType, TaskVersionRecord } from './index'

export type ServiceSubTaskListItemResponse = {
  id: number | string
  responsible_users?: Array<{
    id?: number | string
    user_id?: number | string
    name?: string | null
    user_name?: string | null
  }> | null
  task_id?: number | string | null
  parent_task_id?: number | string | null
  source_task_id?: number | string | null
  linked_task_id?: number | string | null
  sub_task_type?: string | null
  type?: string | null
  title?: string | null
  description?: string | null
  status?: string | null
  readonly?: boolean | null
  created_at?: string | null
  archived_at?: string | null
  owner_id?: number | string | null
  creator_user_id?: number | string | null
  current_stage?: {
    assignees?: Array<{
      user_id: number | string
      user_name?: string | null
    }> | null
    id?: number | string | null
    stage_name?: string | null
    status?: string | null
  } | null
  current_version?: {
    id?: number | string | null
    version_no?: string | null
    status?: string | null
    publish_status?: string | null
    total_page_count?: number | null
    expect_complete_at?: number | string | null
    completed_at?: number | string | null
    archived_at?: number | string | null
  } | null
  task?: {
    id?: number | string | null
    title?: string | null
    status?: string | null
    readonly?: boolean | null
    owner_id?: number | string | null
    creator_user_id?: number | string | null
    created_at?: string | null
    archived_at?: string | null
    current_stage?: ServiceSubTaskListItemResponse['current_stage']
    current_version?: ServiceSubTaskListItemResponse['current_version']
  } | null
}

export type ServiceSubTaskListResponse = {
  items: ServiceSubTaskListItemResponse[]
  page: number
  page_size: number
  total: number
}

export type ServiceSubTaskRecord = {
  archivedAt?: string | null
  createdAt: string
  currentStage?: {
    assignees: Array<{
      userId: string
      userName: string
    }>
    id: string
    stageName: string
    status: string
  } | null
  currentVersion: TaskVersionRecord
  description: string
  id: string
  readonly: boolean
  responsibleUsers: Array<{
    userId: string
    userName: string
  }>
  sourceTaskId?: string
  status: string
  title: string
  type: ServiceType
}
