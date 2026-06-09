import type { ProjectOption } from '../types'

const TASK_LIST_EXTENSION_PROJECT_CODES = ['医护设计项目','科研线项目'] as const

const TASK_BUTTON_LIST_EXTENSION_PROJECT_CODES = ['科研线项目'] as const


export function shouldShowTaskListExtensionColumns(
  project: Pick<ProjectOption, 'name'> | null | undefined,
): boolean {
  if (!project?.name) {
    return false
  }

  return TASK_LIST_EXTENSION_PROJECT_CODES.includes(
    project.name as (typeof TASK_LIST_EXTENSION_PROJECT_CODES)[number],
  )
}


export function shouldShowButtonTaskListExtensionColumns(
  project: Pick<ProjectOption, 'name'> | null | undefined,
): boolean {
  if (!project?.name) {
    return false
  }

  return TASK_BUTTON_LIST_EXTENSION_PROJECT_CODES.includes(
    project.name as (typeof TASK_BUTTON_LIST_EXTENSION_PROJECT_CODES)[number],
  )
}