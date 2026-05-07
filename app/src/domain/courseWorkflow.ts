import { nextActionMap, stageIndexMap, today } from '../constants/workflow'
import type {
  ActivityLog,
  AttachmentFile,
  CourseRecord,
  CourseStatus,
  CreateTicketResult,
  CreateCoursePayload,
  CreateServiceTicketPayload,
  DispatchPayload,
  ServiceTicket,
  StageRecord,
  StageState,
  UploadPagePayload,
  UploadStylePayload,
  UpdateResearchPayload,
  SkipStageOption,
} from '../types'
import { createAttachment, mergeAttachments } from '../utils/attachments'
import {
  sanitizePageAssignments,
  summarizePageAssignments,
  validatePageDispatchPayload,
} from '../utils/pageAssignments'

function getNextCourseSequence(courses: CourseRecord[]) {
  const maxSequence = courses.reduce((maxValue, course) => {
    const match = course.id.match(/KC-2026-(\d+)/)
    const currentValue = match ? Number(match[1]) : 0
    return Math.max(maxValue, currentValue)
  }, 0)

  return maxSequence + 1
}

function formatCourseId(sequence: number) {
  return `KC-2026-${String(sequence).padStart(3, '0')}`
}

function buildDerivedCourseTitle(source: CourseRecord, type: CreateServiceTicketPayload['type']) {
  return type === '售后' ? `${source.title} 售后工单` : `${source.title} 迭代工单`
}

function getIterationSkipStages(course: CourseRecord) {
  if (course.orderType !== '迭代订单') {
    return [] as SkipStageOption[]
  }

  return course.tickets[0]?.skipStages ?? []
}

function resolveIterationStatus(skipStages: SkipStageOption[]): CourseStatus {
  if (skipStages.includes('教研') && skipStages.includes('风格稿') && skipStages.includes('内页')) {
    return 'pendingArchive'
  }

  if (skipStages.includes('教研') && skipStages.includes('风格稿')) {
    return 'pendingPageDispatch'
  }

  if (skipStages.includes('教研')) {
    return 'pendingStyleDispatch'
  }

  return 'research'
}

function resolveCourseOwner(course: CourseRecord, status: CourseStatus) {
  switch (status) {
    case 'research':
      return `教研老师 · ${course.researchOwner || '待认领'}`
    case 'pendingStyleDispatch':
      return `设计统筹 · ${course.coordinator}`
    case 'styleInProgress':
      return `风格稿设计师 · ${course.styleDesigners[0] ?? '待派单'}`
    case 'pendingPageDispatch':
      return `设计统筹 · ${course.coordinator}`
    case 'pageInProgress':
      return `内页主设计师 · ${course.pageLead}`
    case 'pendingArchive':
      return `设计统筹 · ${course.coordinator}`
    case 'packing':
      return '系统自动打包'
    case 'archived':
      return '已归档'
    case 'aftersales':
      return '计划员 · 当前用户'
    case 'iteration':
      return '计划员 · 当前用户'
    default:
      return course.currentOwner
  }
}

export function bumpMinorVersion(version: string) {
  const match = version.replace('v', '').split('.')
  const major = Number(match[0] ?? 1)
  const minor = Number(match[1] ?? 0)
  return `v${major}.${minor + 1}`
}

export function bumpMajorVersion(version: string) {
  const match = version.replace('v', '').split('.')
  const major = Number(match[0] ?? 1)
  return `v${major + 1}.0`
}

export function getNextStatus(status: CourseStatus, course?: CourseRecord): CourseStatus {
  switch (status) {
    case 'research':
      if (course && getIterationSkipStages(course).includes('风格稿')) {
        return 'pendingPageDispatch'
      }
      return 'pendingStyleDispatch'
    case 'pendingStyleDispatch':
      return 'styleInProgress'
    case 'styleInProgress':
      if (course && getIterationSkipStages(course).includes('内页')) {
        return 'pendingArchive'
      }
      return 'pendingPageDispatch'
    case 'pendingPageDispatch':
      return 'pageInProgress'
    case 'pageInProgress':
      return 'pendingArchive'
    case 'pendingArchive':
      return 'packing'
    case 'packing':
      return 'archived'
    case 'aftersales':
    case 'iteration':
      return 'archived'
    default:
      return status
  }
}

export function appendLog(
  course: CourseRecord,
  actor: string,
  action: string,
  detail: string,
): ActivityLog[] {
  return [
    {
      id: course.logs.length + 1,
      time: today,
      actor,
      action,
      detail,
    },
    ...course.logs,
  ]
}

export function syncStageState(status: CourseStatus, stages: StageRecord[]) {
  const activeIndex = stageIndexMap[status]

  return stages.map((stage, index) => {
    if (status === 'archived' || status === 'packing') {
      if (index < 3) {
        return { ...stage, state: 'done' as StageState }
      }
    }

    if (index < activeIndex) {
      return { ...stage, state: 'done' as StageState }
    }

    if (index === activeIndex) {
      return { ...stage, state: 'active' as StageState }
    }

    return { ...stage, state: 'pending' as StageState }
  })
}

export function advanceCourseWorkflow(course: CourseRecord): CourseRecord {
  const nextStatus = getNextStatus(course.status, course)
  const nextAction = nextActionMap[course.status]
  const nextStages = syncStageState(nextStatus, course.stages)

  let nextCourse: CourseRecord = {
    ...course,
    status: nextStatus,
    currentOwner: resolveCourseOwner(course, nextStatus),
    stages: nextStages,
    qualityCheck:
      nextStatus === 'pendingArchive'
        ? '校验通过'
        : nextStatus === 'archived'
          ? '打包成功'
          : course.qualityCheck,
    overdue:
      nextStatus === 'archived' || nextStatus === 'packing' ? false : course.overdue,
    logs: appendLog(
      course,
      `${nextAction?.actor ?? '系统'} · 自动记录`,
      nextAction?.label ?? '推进状态',
      nextAction?.detail ?? '状态已更新',
    ),
  }

  if (course.status === 'packing') {
    nextCourse = {
      ...nextCourse,
      archivedAt: today,
      attachments: mergeAttachments(course.attachments, [createAttachment('归档压缩包.zip')]),
    }
  }

  if (course.status === 'aftersales') {
    nextCourse = {
      ...nextCourse,
      tickets: course.tickets.map((ticket, index) =>
        index === 0 ? { ...ticket, status: '已关闭' } : ticket,
      ),
      archivedAt: today,
    }
  }

  if (course.status === 'iteration') {
    nextCourse = {
      ...nextCourse,
      tickets: course.tickets.map((ticket, index) =>
        index === 0 ? { ...ticket, status: '已关闭' } : ticket,
      ),
      archivedAt: today,
    }
  }

  return nextCourse
}

export function validateStyleFileNames(course: CourseRecord, files: AttachmentFile[]) {
  const expectedPrefix = `${course.title}_风格稿_`
  return files.every((file) => file.name.startsWith(expectedPrefix))
}

export function validatePageFileNames(course: CourseRecord, files: AttachmentFile[]) {
  const expectedPrefix = `${course.title}_内页成品_`
  return files.every((file) => file.name.startsWith(expectedPrefix))
}

export function uploadStyleDraft(
  course: CourseRecord,
  payload: UploadStylePayload,
): CourseRecord {
  const nextStatus = getNextStatus(course.status, course)
  const nextStages = syncStageState(nextStatus, course.stages)

  return {
    ...course,
    status: nextStatus,
    currentOwner: `设计统筹 · ${course.coordinator}`,
    styleAttachments: payload.files,
    styleNamingPassed: true,
    attachments: mergeAttachments(course.attachments, payload.files),
    stages: nextStages,
    logs: appendLog(
      course,
      `风格稿设计师 · ${course.styleDesigners[0] ?? '待派单'}`,
      '上传风格稿',
      `通过命名校验后上传 ${payload.files.length} 份风格稿成品，流转至待内页派单`,
    ),
  }
}

export function uploadPageDraft(
  course: CourseRecord,
  payload: UploadPagePayload,
): CourseRecord {
  const nextStatus = getNextStatus(course.status, course)
  const nextStages = syncStageState(nextStatus, course.stages)

  return {
    ...course,
    status: nextStatus,
    currentOwner: `设计统筹 · ${course.coordinator}`,
    pageAttachments: payload.files,
    pageNamingPassed: true,
    fileCountCheckPassed: true,
    namingCheckPassed: true,
    qualityCheck: '校验通过',
    attachments: mergeAttachments(course.attachments, payload.files),
    stages: nextStages,
    logs: appendLog(
      course,
      `内页设计师 · ${course.pageLead}`,
      '上传内页成品',
      `通过文件规范校验后上传 ${payload.files.length} 份内页成品，流转至待入库确认`,
    ),
  }
}

export function updateStyleDispatch(
  course: CourseRecord,
  payload: DispatchPayload,
): CourseRecord {
  const assignedDesigner = payload.designers[0] ?? '待派单'

  return {
    ...course,
    styleDesigners: payload.designers.slice(0, 1),
    styleDueDate: payload.dueDate,
    overallDueDate: course.overallDueDate,
    currentOwner: `风格稿设计师 · ${assignedDesigner}`,
    stages: course.stages.map((stage) =>
      stage.key === 'style'
        ? {
            ...stage,
            ownerRole: '风格稿设计师',
            owner: assignedDesigner,
            deliverable: '风格稿成品',
            dueDate: payload.dueDate,
          }
        : stage,
    ),
    logs: appendLog(
      course,
      `设计统筹 · ${course.coordinator}`,
      '完成风格稿派单',
      `指派 ${assignedDesigner}，截止 ${payload.dueDate}`,
    ),
  }
}

export function updatePageDispatch(
  course: CourseRecord,
  payload: DispatchPayload,
): CourseRecord {
  const validationError = validatePageDispatchPayload(payload, course.totalPageCount)
  if (validationError) {
    throw new Error(validationError)
  }

  const pageAssignments = sanitizePageAssignments(payload.pageAssignments)
  const pageDesigners = pageAssignments.map((assignment) => assignment.designer)
  const leadDesigner = payload.leadDesigner ?? pageDesigners[0] ?? '待派单'
  const assignmentSummary = summarizePageAssignments(pageAssignments, leadDesigner)

  return {
    ...course,
    pageDesigners,
    pageLead: leadDesigner,
    pageAssignments,
    pageDueDate: payload.dueDate,
    currentOwner: `内页主设计师 · ${leadDesigner}`,
    stages: course.stages.map((stage) =>
      stage.key === 'page'
        ? {
            ...stage,
            ownerRole: '内页设计师',
            owner: assignmentSummary,
            deliverable: '内页成品',
            dueDate: payload.dueDate,
          }
        : stage,
    ),
    logs: appendLog(
      course,
      `设计统筹 · ${course.coordinator}`,
      '完成内页派单',
      `指派 ${assignmentSummary}，主设计师 ${leadDesigner}，截止 ${payload.dueDate}`,
    ),
  }
}

export function updateResearchTask(
  course: CourseRecord,
  payload: UpdateResearchPayload,
): CourseRecord {
  const mergedResearchAttachments = mergeAttachments(
    payload.researchSourceFiles,
    payload.lessonPlanFiles,
    payload.scriptFiles,
    payload.guideFiles,
    payload.otherResearchFiles,
  )

  return {
    ...course,
    researchTeacher: payload.researchOwner,
    researchOwner: payload.researchOwner,
    totalPageCount: payload.totalPageCount,
    actualResearchSubmissionDate: payload.actualResearchSubmissionDate,
    researchSourceFiles: payload.researchSourceFiles,
    lessonPlanFiles: payload.lessonPlanFiles,
    scriptFiles: payload.scriptFiles,
    guideFiles: payload.guideFiles,
    otherResearchFiles: payload.otherResearchFiles,
    researchAttachments: mergedResearchAttachments,
    researchReviewStatus: payload.researchReviewStatus,
    attachments: mergeAttachments(mergedResearchAttachments, course.attachments),
    stages: course.stages.map((stage) =>
      stage.key === 'research'
        ? {
            ...stage,
            owner: payload.researchOwner,
            note: `审核状态：${payload.researchReviewStatus}`,
          }
        : stage,
    ),
    logs: appendLog(
      course,
      `教研老师 · ${payload.researchOwner}`,
      '更新教研任务',
      `已维护教研资料与进度，附件 ${mergedResearchAttachments.length} 份`,
    ),
  }
}

export function canCompleteResearch(course: CourseRecord) {
  return Boolean(
      course.researchOwner &&
      course.totalPageCount &&
      course.actualResearchSubmissionDate &&
      course.researchSourceFiles.length > 0 &&
      course.researchReviewStatus,
  )
}

export function createCourseRecord(
  payload: CreateCoursePayload,
  courses: CourseRecord[],
): CourseRecord {
  const newId = formatCourseId(getNextCourseSequence(courses))

  return {
    id: newId,
    title: payload.title,
    series: payload.series,
    subject: payload.subject,
    educationStage: payload.educationStage,
    grade: payload.grade,
    volume: payload.volume,
    textbook: payload.textbook,
    chapterName: payload.chapterName,
    orderType: payload.orderType,
    isBEnd: payload.isBEnd,
    hasLessonPlan: payload.hasLessonPlan,
    hasScript: payload.hasScript,
    artCopyright: payload.artCopyright,
    textCopyright: payload.textCopyright,
    version: 'v1.0',
    status: 'research',
    currentOwner: '教研老师 · 待认领',
    researchDueDate: payload.researchDueDate,
    finalDueDate: payload.finalDueDate,
    overallDueDate: payload.finalDueDate,
    overdue: false,
    researchTeacher: payload.researchOwner || '待分配',
    researchOwner: payload.researchOwner || '待分配',
    totalPageCount: undefined,
    actualResearchSubmissionDate: undefined,
    researchSourceFiles: [],
    lessonPlanFiles: [],
    scriptFiles: [],
    guideFiles: [],
    otherResearchFiles: [],
    researchAttachments: [],
    researchReviewStatus: '待审核',
    coordinator: '林薇',
    styleDesigners: [],
    styleDueDate: payload.finalDueDate,
    styleAttachments: [],
    styleNamingPassed: false,
    pageDesigners: [],
    pageLead: '待派单',
    pageAssignments: [],
    pageDueDate: payload.finalDueDate,
    pageAttachments: [],
    pageNamingPassed: false,
    qualityCheck: '待生成',
    fileCountCheckPassed: false,
    namingCheckPassed: false,
    attachments: [],
    tickets: [],
    logs: [
      {
        id: 1,
        time: today,
        actor: '计划员 · 当前用户',
        action: '创建任务工单',
        detail: '系统自动生成主流程节点',
      },
    ],
    stages: [
      {
        key: 'research',
        label: '教研任务',
        ownerRole: '教研老师',
        owner: '待认领',
        deliverable: '教研资料包',
        dueDate: payload.researchDueDate,
        state: 'active',
      },
      {
        key: 'style',
        label: '风格稿任务',
        ownerRole: '设计统筹',
        owner: '待派单',
        deliverable: '风格稿成品',
        dueDate: payload.finalDueDate,
        state: 'pending',
      },
      {
        key: 'page',
        label: '内页任务',
        ownerRole: '设计统筹',
        owner: '待派单',
        deliverable: '内页成品',
        dueDate: payload.finalDueDate,
        state: 'pending',
      },
      {
        key: 'archive',
        label: '入库任务',
        ownerRole: '设计统筹',
        owner: '待确认',
        deliverable: '归档压缩包',
        dueDate: payload.finalDueDate,
        state: 'pending',
      },
    ],
  }
}

export function updateCourseRecord(
  course: CourseRecord,
  payload: CreateCoursePayload,
): CourseRecord {
  const updatedResearchOwner = payload.researchOwner || '待分配'

  return {
    ...course,
    title: payload.title,
    series: payload.series,
    subject: payload.subject,
    educationStage: payload.educationStage,
    grade: payload.grade,
    volume: payload.volume,
    textbook: payload.textbook,
    chapterName: payload.chapterName,
    orderType: payload.orderType,
    isBEnd: payload.isBEnd,
    hasLessonPlan: payload.hasLessonPlan,
    hasScript: payload.hasScript,
    artCopyright: payload.artCopyright,
    textCopyright: payload.textCopyright,
    researchDueDate: payload.researchDueDate,
    finalDueDate: payload.finalDueDate,
    overallDueDate: payload.finalDueDate,
    currentOwner: `教研老师 · ${updatedResearchOwner}`,
    researchTeacher: updatedResearchOwner,
    researchOwner: updatedResearchOwner,
    styleDueDate: payload.finalDueDate,
    pageDueDate: payload.finalDueDate,
    stages: course.stages.map((stage) => {
      if (stage.key === 'research') {
        return {
          ...stage,
          owner: updatedResearchOwner,
          dueDate: payload.researchDueDate,
        }
      }

      if (stage.key === 'style' || stage.key === 'page' || stage.key === 'archive') {
        return {
          ...stage,
          dueDate: payload.finalDueDate,
        }
      }

      return stage
    }),
    logs: appendLog(
      course,
      '计划员 · 当前用户',
      '编辑任务工单',
      '更新了课件基础信息与交付时间',
    ),
  }
}

export function createServiceTicket(
  course: CourseRecord,
  payload: CreateServiceTicketPayload,
  requester: string,
): ServiceTicket {
  return {
    id: `${payload.type === '售后' ? 'SH' : 'DD'}-${course.tickets.length + 1}`,
    type: payload.type,
    responsibility: payload.responsibility,
    description: payload.description,
    linkedCourseId: course.id,
    requester,
    createdAt: today,
    skipStages: payload.type === '迭代' ? (payload.skipStages ?? []) : [],
    status: '处理中',
    linkedVersion: course.version,
    targetVersion:
      payload.type === '售后' ? bumpMinorVersion(course.version) : bumpMajorVersion(course.version),
  }
}

export function attachServiceTicket(
  course: CourseRecord,
  payload: CreateServiceTicketPayload,
  requester: string,
): CourseRecord {
  const ticket = createServiceTicket(course, payload, requester)

  return {
    ...course,
    tickets: [ticket, ...course.tickets],
    logs: appendLog(
      course,
      requester,
      `发起${payload.type}`,
      [
        `责任方：${payload.responsibility}`,
        `说明：${payload.description}`,
        `关联版本 ${course.version}，目标版本 ${ticket.targetVersion}`,
        payload.type === '迭代' && ticket.skipStages.length > 0
          ? `跳过环节：${ticket.skipStages.join('、')}`
          : '',
      ]
        .filter(Boolean)
        .join('；'),
    ),
  }
}

export function createDerivedServiceCourse(
  source: CourseRecord,
  payload: CreateServiceTicketPayload,
  requester: string,
  courses: CourseRecord[],
): CreateTicketResult {
  const ticket = createServiceTicket(source, payload, requester)
  const createdId = formatCourseId(getNextCourseSequence(courses))
  const isAftersales = payload.type === '售后'
  const iterationStatus = resolveIterationStatus(ticket.skipStages)
  const inheritedAttachments = mergeAttachments(
    source.researchAttachments,
    source.styleAttachments,
    source.pageAttachments,
    source.attachments,
  )

  const sourceWithTicket = {
    ...attachServiceTicket(source, payload, requester),
    currentOwner: source.currentOwner,
  }

  const created: CourseRecord = {
    ...source,
    id: createdId,
    title: buildDerivedCourseTitle(source, payload.type),
    orderType: isAftersales ? '售后订单' : '迭代订单',
    version: ticket.targetVersion,
    status: isAftersales ? 'aftersales' : iterationStatus,
    currentOwner: isAftersales
      ? '计划员 · 当前用户'
      : resolveCourseOwner(source, iterationStatus),
    archivedAt: undefined,
    overdue: false,
    qualityCheck: '待生成',
    fileCountCheckPassed: false,
    namingCheckPassed: false,
    attachments: inheritedAttachments,
    tickets: [ticket],
    logs: [
      {
        id: 1,
        time: today,
        actor: requester,
        action: `创建${payload.type}工单`,
        detail: [
          `由原工单 ${source.id} 派生，目标版本 ${ticket.targetVersion}`,
          payload.type === '迭代' && ticket.skipStages.length > 0
            ? `跳过环节：${ticket.skipStages.join('、')}`
            : '',
        ]
          .filter(Boolean)
          .join('；'),
      },
    ],
  }

  return {
    source: sourceWithTicket,
    created,
  }
}
