import type {
  FieldOptionConfig,
  MedicalTaskSubItemType,
  ProjectOption,
  UserRole,
  YesNoOption,
} from '../types'

const MEDICAL_DESIGN_PROJECT_CODES = ['医护设计项目'] as const
const MEDICAL_SUB_ITEM_OPERATOR_ROLES: UserRole[] = ['wuhan_design_cooperation']

export const MEDICAL_TASK_SUB_ITEM_TYPE_OPTIONS: FieldOptionConfig[] = [
  { label: '客户增加页数', value: '客户增加页数' },
  { label: '客户推翻需求', value: '客户推翻需求' },
  { label: '增加制作类型', value: '增加制作类型' },
  { label: '要求加急', value: '要求加急' },
]

export const MEDICAL_TASK_CONTRACT_CHANGE_OPTIONS: Array<{
  label: YesNoOption
  value: YesNoOption
}> = [
  { label: '是', value: '是' },
  { label: '否', value: '否' },
]

export function isMedicalTaskSubItemType(
  value: string,
): value is MedicalTaskSubItemType {
  return MEDICAL_TASK_SUB_ITEM_TYPE_OPTIONS.some((option) => option.value === value)
}

export function isMedicalDesignProject(
  project: Pick<ProjectOption, 'name'> | null | undefined,
): boolean {
  if (!project?.name) {
    return false
  }

  return MEDICAL_DESIGN_PROJECT_CODES.includes(
    project.name as (typeof MEDICAL_DESIGN_PROJECT_CODES)[number],
  )
}

export function shouldEnableMedicalTaskSpecialActions(
  project: Pick<ProjectOption, 'name'> | null | undefined,
): boolean {
  return isMedicalDesignProject(project)
}

export function shouldShowMedicalSubItemActionColumn(role: UserRole): boolean {
  return MEDICAL_SUB_ITEM_OPERATOR_ROLES.includes(role)
}
