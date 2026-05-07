import type { DesignerPageAssignment, DispatchPayload } from '../types'

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0
}

export function sanitizePageAssignments(
  assignments: DesignerPageAssignment[] | undefined,
): DesignerPageAssignment[] {
  return (assignments ?? []).filter(
    (assignment) => assignment.designer && isPositiveInteger(assignment.pageCount),
  )
}

export function summarizePageAssignments(
  assignments: DesignerPageAssignment[] | undefined,
  leadDesigner?: string,
): string {
  const validAssignments = sanitizePageAssignments(assignments)

  if (validAssignments.length === 0) {
    return '暂无'
  }

  return validAssignments
    .map((assignment) => {
      const leadLabel = assignment.designer === leadDesigner ? '主设计师 · ' : ''
      return `${assignment.designer}（${leadLabel}${assignment.pageCount} 页）`
    })
    .join('、')
}

export function validatePageDispatchPayload(
  payload: DispatchPayload,
  totalPageCount?: number,
): string | null {
  const assignments = sanitizePageAssignments(payload.pageAssignments)

  if (assignments.length === 0) {
    return '请至少添加一位内页设计师并填写页数'
  }

  if (!payload.leadDesigner) {
    return '请选择内页主设计师'
  }

  const assignedDesigners = assignments.map((assignment) => assignment.designer)
  const uniqueDesigners = new Set(assignedDesigners)

  if (uniqueDesigners.size !== assignedDesigners.length) {
    return '同一位内页设计师只能分配一次'
  }

  if (!uniqueDesigners.has(payload.leadDesigner)) {
    return '主设计师必须包含在内页分工中'
  }

  if (totalPageCount && assignments.reduce((sum, item) => sum + item.pageCount, 0) !== totalPageCount) {
    return `分配页数合计需等于总页数 ${totalPageCount} 页`
  }

  return null
}
