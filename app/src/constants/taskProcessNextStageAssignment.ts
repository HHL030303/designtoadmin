import type { ProjectOption, TaskWorkflowStageRecord } from '../types'

export type NextStageAssignmentMode =
  | 'default_single'
  | 'multi_with_page_count'
  | 'multi_without_page_count'

type NextStageAssignmentRule = {
  mode: Exclude<NextStageAssignmentMode, 'default_single' | 'multi_with_page_count'>
  nextStageName: string
  projectCodes?: string[]
  projectIds?: string[]
  projectKeys?: string[]
  projectNames?: string[]
}

// const nextStageAssignmentRules: NextStageAssignmentRule[] = [
//   {
//     mode: 'multi_without_page_count',
//     nextStageName: '设计中',
//     // TODO: 补充科研线项目真实 id/code/key 后，可移除 name 回退，进一步收窄影响范围。
//     projectNames: ['科研线项目', '科研线'],
//   },
// ]
const nextStageAssignmentRules: NextStageAssignmentRule[] = [
  {
    mode: 'multi_without_page_count',
    nextStageName: '设计中',
    // 推荐优先使用项目稳定标识，避免只靠项目名称命中。
    // 如果已经知道真实项目标识，优先填写 projectIds / projectCodes / projectKeys。
    // projectIds: ['123'],
    // projectCodes: ['keyan_project'],
    // projectKeys: ['123'],

    // 当前先保留项目名称兜底，后续拿到真实标识后可删除。
    projectNames: ['科研线项目', '科研线'],
  },

  // 模板 1：同一个下一节点，给另一个项目使用
  // {
  //   mode: 'multi_without_page_count',
  //   nextStageName: '设计中',
  //   projectCodes: ['another_project_code'],
  // },

  // 模板 2：同一个项目，不同下一节点使用
  // {
  //   mode: 'multi_without_page_count',
  //   nextStageName: '审核中',
  //   projectCodes: ['keyan_project'],
  // },

  // 模板 3：一个规则同时匹配多个项目
  // {
  //   mode: 'multi_without_page_count',
  //   nextStageName: '排版中',
  //   projectCodes: ['project_a', 'project_b'],
  // },

  // 模板 4：只知道项目名称时的临时写法
  // {
  //   mode: 'multi_without_page_count',
  //   nextStageName: '设计中',
  //   projectNames: ['某某项目'],
  // },
]

function normalizeText(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, '').trim().toLowerCase()
}

export function resolveNextStageAssignmentMode(
  project: Pick<ProjectOption, 'code' | 'id' | 'key' | 'name'> | null | undefined,
  nextStage: Pick<TaskWorkflowStageRecord, 'stageName'> | null | undefined,
  options?: {
    allowPageAssignment?: boolean
  },
): NextStageAssignmentMode {
  if (options?.allowPageAssignment) {
    return 'multi_with_page_count'
  }

  const normalizedNextStageName = normalizeText(nextStage?.stageName)
  const normalizedProjectIdentifiers = [
    normalizeText(project?.id),
    normalizeText(project?.code),
    normalizeText(project?.key),
  ].filter(Boolean)
  const normalizedProjectName = normalizeText(project?.name)

  const matchedRule = nextStageAssignmentRules.find((rule) => (
    normalizeText(rule.nextStageName) === normalizedNextStageName &&
    (
      rule.projectIds?.some((projectId) => (
        normalizedProjectIdentifiers.includes(normalizeText(projectId))
      )) ||
      rule.projectCodes?.some((projectCode) => (
        normalizedProjectIdentifiers.includes(normalizeText(projectCode))
      )) ||
      rule.projectKeys?.some((projectKey) => (
        normalizedProjectIdentifiers.includes(normalizeText(projectKey))
      )) ||
      rule.projectNames?.some((projectName) => normalizeText(projectName) === normalizedProjectName)
    )
  ))

  return matchedRule?.mode ?? 'default_single'
}
