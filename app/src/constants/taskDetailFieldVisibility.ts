import type { UserRole } from '../types'

type TaskDetailFieldVisibilityRule = {
  hiddenFields: string[]
  roles: UserRole[]
}

const taskDetailFieldVisibilityRules: TaskDetailFieldVisibilityRule[] = [
  {
    roles: ['keyan_design'],
    hiddenFields: ['ppt单价', '定金', '预估总价', '预估尾款'],
  },
]

function normalizeFieldName(value: string): string {
  return value.replace(/\s+/g, '').trim().toLowerCase()
}

export function getHiddenTaskDetailFieldNames(role: UserRole): Set<string> {
  return new Set(
    taskDetailFieldVisibilityRules
      .filter((rule) => rule.roles.includes(role))
      .flatMap((rule) => rule.hiddenFields.map(normalizeFieldName)),
  )
}

export function shouldHideTaskDetailField(role: UserRole, fieldName: string): boolean {
  return getHiddenTaskDetailFieldNames(role).has(normalizeFieldName(fieldName))
}
