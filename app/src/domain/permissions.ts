import { statusMeta } from '../constants/workflow'
import type {
  CourseRecord,
  CourseStatus,
  ProjectPermission,
  RoleActionSummary,
  ServiceType,
  UserRole,
  ViewKey,
} from '../types'
import { canCompleteResearch } from './courseWorkflow'
import {
  canAccessViewByProjectPermissions,
  getAvailableViewsByProjectPermissions,
} from './menuPermissions'

const advancePermissionMap: Partial<Record<CourseStatus, UserRole[]>> = {
  research: ['researcher', 'admin'],
  pendingStyleDispatch: ['coordinator', 'admin'],
  styleInProgress: ['styleDesigner', 'admin'],
  pendingPageDispatch: ['coordinator', 'admin'],
  pageInProgress: ['pageDesigner', 'admin'],
  pendingArchive: ['coordinator', 'admin'],
  aftersales: ['planner', 'admin'],
  iteration: ['planner', 'admin'],
}

const createCourseRoles: UserRole[] = ['planner', 'admin','wuhan_design_cooperation']
const serviceTicketRoles: Record<ServiceType, UserRole[]> = {
  售后: ['sales', 'planner', 'admin'],
  迭代: ['planner', 'admin'],
}

export function canAccessView(role: UserRole, view: ViewKey, permissions: ProjectPermission[] = []) {
  return canAccessViewByProjectPermissions(role, view, permissions)
}

export function getAvailableViews(role: UserRole, permissions: ProjectPermission[] = []) {
  return getAvailableViewsByProjectPermissions(role, permissions)
}

export function canAdvanceCourse(role: UserRole, course: CourseRecord) {
  if (!(advancePermissionMap[course.status] ?? []).includes(role)) {
    return false
  }

  if (course.status === 'research') {
    return canCompleteResearch(course)
  }

  return true
}

export function canEditStyleDispatch(role: UserRole, course: CourseRecord) {
  return ['coordinator', 'admin'].includes(role) &&
    (
      course.status === 'pendingStyleDispatch' ||
      (course.status === 'styleInProgress' && course.styleAttachments.length === 0)
    )
}

export function canEditPageDispatch(role: UserRole, course: CourseRecord) {
  return ['coordinator', 'admin'].includes(role) &&
    (
      course.status === 'pendingPageDispatch' ||
      (course.status === 'pageInProgress' && course.pageAttachments.length === 0)
    )
}

export function canManageDispatch(role: UserRole, course: CourseRecord) {
  return canEditStyleDispatch(role, course) ||
    canEditPageDispatch(role, course) ||
    (
      ['coordinator', 'admin'].includes(role) &&
      course.status === 'pendingArchive'
    )
}

export function canUploadStyleDraft(role: UserRole, course: CourseRecord) {
  return ['styleDesigner', 'admin'].includes(role) && course.status === 'styleInProgress'
}

export function canUploadPageDraft(role: UserRole, course: CourseRecord) {
  return ['pageDesigner', 'admin'].includes(role) && course.status === 'pageInProgress'
}

export function canCreateCourse(role: UserRole) {
  return createCourseRoles.includes(role)
}

export function canCreateTicket(role: UserRole, type: ServiceType, course: CourseRecord) {
  return course.status === 'archived' && serviceTicketRoles[type].includes(role)
}

export function canCloseServiceFlow(role: UserRole, course: CourseRecord) {
  return canAdvanceCourse(role, course)
}

export function getRoleActionSummary(role: UserRole, courses: CourseRecord[]): RoleActionSummary {
  const actionableStatuses = Object.entries(advancePermissionMap)
    .filter(([, roles]) => roles?.includes(role))
    .map(([status]) => status as CourseStatus)

  const pendingCount = courses.filter((course) => actionableStatuses.includes(course.status)).length

  return {
    pendingCount,
    actionableStatuses,
    label:
      actionableStatuses.length === 0
        ? '当前角色没有可推进节点'
        : `可推进 ${actionableStatuses.map((status) => statusMeta[status].label).join('、')}`,
  }
}
