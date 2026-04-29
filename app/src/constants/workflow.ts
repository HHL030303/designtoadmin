import type { CourseRecord, CourseStatus } from '../types'

export const today = '2026-04-20 10:30'

export const statusMeta: Record<
  CourseStatus,
  { label: string; tone: string; ownerLabel: string }
> = {
  research: { label: '教研中', tone: 'blue', ownerLabel: '教研老师' },
  pendingStyleDispatch: {
    label: '待风格稿派单',
    tone: 'amber',
    ownerLabel: '设计统筹',
  },
  styleInProgress: {
    label: '风格稿制作中',
    tone: 'violet',
    ownerLabel: '风格稿设计师',
  },
  pendingPageDispatch: {
    label: '待内页派单',
    tone: 'amber',
    ownerLabel: '设计统筹',
  },
  pageInProgress: {
    label: '内页制作中',
    tone: 'teal',
    ownerLabel: '内页设计师',
  },
  pendingArchive: {
    label: '待入库确认',
    tone: 'coral',
    ownerLabel: '设计统筹',
  },
  packing: { label: '打包中', tone: 'slate', ownerLabel: '系统' },
  archived: { label: '已归档', tone: 'green', ownerLabel: '只读' },
  aftersales: { label: '售后处理中', tone: 'rose', ownerLabel: '计划员' },
  iteration: { label: '迭代中', tone: 'orange', ownerLabel: '流程节点' },
}

export const stageIndexMap: Record<CourseStatus, number> = {
  research: 0,
  pendingStyleDispatch: 1,
  styleInProgress: 2,
  pendingPageDispatch: 3,
  pageInProgress: 4,
  pendingArchive: 5,
  packing: 6,
  archived: 6,
  aftersales: 6,
  iteration: 0,
}

export const nextActionMap: Partial<
  Record<CourseStatus, { label: string; actor: string; detail: string }>
> = {
  research: {
    label: '确认教研完成',
    actor: '教研老师',
    detail: '上传资料后流转到待风格稿派单',
  },
  pendingStyleDispatch: {
    label: '完成风格稿派单',
    actor: '设计统筹',
    detail: '设置风格稿设计师与截止时间',
  },
  styleInProgress: {
    label: '上传风格稿',
    actor: '风格稿设计师',
    detail: '上传即视为线下确认通过',
  },
  pendingPageDispatch: {
    label: '完成内页派单',
    actor: '设计统筹',
    detail: '指派内页主设计师与协作人',
  },
  pageInProgress: {
    label: '上传内页成品',
    actor: '内页设计师',
    detail: '系统校验文件规范后进入待入库确认',
  },
  pendingArchive: {
    label: '确认入库',
    actor: '设计统筹',
    detail: '查看完整性报告并触发自动打包',
  },
  packing: {
    label: '完成自动打包',
    actor: '系统',
    detail: '压缩包写入成品库并自动归档',
  },
  aftersales: {
    label: '关闭售后并归档',
    actor: '计划员',
    detail: '生成新的小版本并关闭工单',
  },
  iteration: {
    label: '完成迭代并归档',
    actor: '系统',
    detail: '生成新的大版本并保留历史版本',
  },
}

export function formatDateLabel(value: string) {
  return value.replaceAll('-', '.')
}

export function getCourseFlowItems(course: CourseRecord) {
  const skipStages =
    course.orderType === '迭代订单' ? (course.tickets[0]?.skipStages ?? []) : []

  return [
    {
      title: '教研中',
      owner: course.researchOwner || '待认领',
      dueDate: course.researchDueDate,
      stateText: skipStages.includes('教研') ? '已跳过' : undefined,
    },
    {
      title: '待风格稿派单',
      owner: course.coordinator,
      dueDate: course.styleDueDate || course.finalDueDate,
    },
    {
      title: '风格稿制作中',
      owner: course.styleDesigners[0] || '待派单',
      dueDate: course.styleDueDate || course.finalDueDate,
      stateText: skipStages.includes('风格稿') ? '已跳过' : undefined,
    },
    {
      title: '待内页派单',
      owner: course.coordinator,
      dueDate: course.pageDueDate || course.finalDueDate,
    },
    {
      title: '内页制作中',
      owner: course.pageLead && course.pageLead !== '待派单' ? course.pageLead : '待派单',
      dueDate: course.pageDueDate || course.finalDueDate,
      stateText: skipStages.includes('内页') ? '已跳过' : undefined,
    },
    {
      title: '待入库确认',
      owner: course.coordinator,
      dueDate: course.overallDueDate,
    },
    {
      title: '打包归档',
      owner: '系统自动打包',
      dueDate: course.overallDueDate,
    },
  ]
}
