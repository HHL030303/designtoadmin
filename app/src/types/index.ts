export type ViewKey =
  | 'dashboard'
  | 'allTickets'
  | 'taskStatistics'
  | 'research'
  | 'myTasks'
  | 'courses'
  | 'dispatch'
  | 'designers'
  | 'service'
  | 'projectManagement'
  | 'settingsUsers'
  | 'settingsRoles'
  | 'settingsProjectMembers'

export type CourseStatus =
  | 'research'
  | 'pendingStyleDispatch'
  | 'styleInProgress'
  | 'pendingPageDispatch'
  | 'pageInProgress'
  | 'pendingArchive'
  | 'packing'
  | 'archived'
  | 'aftersales'
  | 'iteration'

export type OrderType = '全新订单' | '售后订单' | '迭代订单'
export type ServiceType = '售后' | '迭代'
export type MedicalTaskSubItemType =
  | '客户增加页数'
  | '客户推翻需求'
  | '增加制作类型'
  | '要求加急'
export type TicketStatus = '待接单' | '处理中' | '待归档' | '已关闭'
export type StageState = 'done' | 'active' | 'pending'
export type QualityCheckStatus = '待生成' | '校验通过' | '打包成功'
export type ServiceResponsibility = '设计责任' | '内容责任' | '客户需求变更' | '其他'
export type SkipStageOption = '教研' | '风格稿' | '内页'
export type EducationStage = '小学' | '初中' | '高中'
export type VolumeOption =
  | '上册'
  | '下册'
  | '全册'
  | '必修上'
  | '必修下'
  | '选择性必修上'
  | '选择性必修下'
export type YesNoOption = '是' | '否'
export type HasOption = '有' | '无'
export type ResearchReviewStatus = '免审' | '待审核' | '审核通过'
export type FormFieldType = 'text' | 'textarea' | 'select' | 'number' | 'date' | 'boolean'|'multi_select'|'year'|'datetime'
export type FieldConfigStatus = 'enabled' | 'disabled'

export interface FieldOptionConfig {
  label: string
  relate_show_field_key?: string|any
  value: string
  sort_value?: number
  status?: FieldConfigStatus
}

export interface FieldConfig {
  id?: string
  field_key: string
  field_name: string
  field_type: FormFieldType
  required: boolean
  searchable: boolean
  option_config?: FieldOptionConfig[]
  default_value?: string | number | boolean
  sort_value: number
  status: FieldConfigStatus
  placeholder?: string
  span?: 12 | 24
  type?:string|undefined
}

export interface TaskVersionRecord {
  id: string
  versionNo: string
  status: string
  publishStatus: string
  totalPageCount: number
  expectCompleteAt?: string
  completedAt?: string | null
  archivedAt?: string | null
  description?:string
  workflow_template?:{
    id:string
    name:string
    order_type?:string
  }
}

export interface TaskSubTaskRecord {
  id: string
  subTaskType: string
  status: string
  description: string
  targetVersion?: string | null
}

export interface MedicalTaskSubItemRecord {
  id: string
  amount?: number
  createdAt?: string
  description?: string
  hasContractChange?: boolean
  remark?: string
  status: string
  subItemNo?: string
  subItemType: string
  title?: string
}

export interface MedicalTaskComplaintRecord {
  createdAt?: string
  description: string
  id: string
  processingMethod?: string
  remark?: string
  refundAmount?: number
  responsibilityUserNames: string[]
  status: string
  complaintNo?: string
  workflowStageName?: string
}

export interface TaskPackageInfoRecord {
  errorMessage?: string | null
  completedAt?:string
  status?:string
  outputFile?: AttachmentFile | null
}

export interface TaskListRecord {
  id: string
  title: string
  status: string
  currentStage?: {
    assignees: Array<{
      userId: string
      userName: string
    }>
    id: string
    stageName: string
    status: string
  } | null
  readonly: boolean
  creatorUserId?: string
  ownerId?: string
  createdAt: string
  archivedAt?: string | null
  currentVersion: TaskVersionRecord
  activeSubTasks: TaskSubTaskRecord[]
  medicalComplaints: MedicalTaskComplaintRecord[]
  medicalComplaintCount: number
  medicalSubItems: MedicalTaskSubItemRecord[]
  medicalSubItemCount: number
  fieldValues: Record<string, unknown>
  packageInfo?: TaskPackageInfoRecord | null
}

export interface TaskWorkflowStageAssigneeRecord {
  id: string
  userId: string
  userName: string
  assigneeRole: string
  assigneeRoleName?: string
  isPrimary: boolean
  assignedAt?: string
  assignedPageCount: number
  completedAt?: string | null
}

export interface TaskWorkflowFileRuleRecord {
  id: string
  itemName: string
  fileCategory: string
  filenamePattern: string
  requiredCount: number
  required: boolean
  enabled: boolean
  
}

export interface TaskWorkflowStageRecord {
  id: string
  assignedBy:any
  templateStageId?: string
  roleId?: string
  stageName: string
  sortValue: number
  status: string
  ownerId?: string
  operatorRoleCode?: string
  canAssign: boolean
  canSkip: boolean
  collectTotalPageCount: boolean
  allowPageAssignment: boolean
  requiresFileUpload: boolean
  requiresValidation: boolean
  triggersPackage: boolean
  completedAt?: string | null
  dueDays?: number
  dueDate?: string
  overdueStatus?: string
  validationStatus?: string
  remark?: string | null
  fileRules: TaskWorkflowFileRuleRecord[]
  stageAssignees: TaskWorkflowStageAssigneeRecord[]
  totalPageCount?:number|undefined|null
  allowCustomDueDays?:boolean
  canUpdateFields?: boolean
}

export interface TaskDetailRecord {
  task: Pick<
    TaskListRecord,
    'id' | 'title' | 'status' | 'readonly' | 'createdAt' | 'archivedAt' | 'ownerId'
  > & {
    ownerName?: string
  }
  currentVersion: TaskVersionRecord
  versionHistory: TaskVersionRecord[]
  currentStage?: TaskWorkflowStageRecord | null
  nextState?: {
    id: string
  } | null
  fieldValues: Record<string, unknown>
  workflowStages: TaskWorkflowStageRecord[]
  files: AttachmentFile[]
  packageInfo?: TaskPackageInfoRecord | null
  subTasks: TaskSubTaskRecord[]
  assignedBy?:string
}

export interface AttachmentFile {
  uid: string
  fileRecordId?: string
  checksum?: string
  fileExt?: string
  name: string
  originalPath?: string
  size?: number
  type?: string
  uploadedAt?: string
  url?: string
  storageKey?: string
  versionId?: string
  workflowStageId?: string
}

export interface StageRecord {
  key: string
  label: string
  ownerRole: string
  owner: string
  deliverable: string
  dueDate: string
  state: StageState
  note?: string
}

export interface ActivityLog {
  id: number
  time: string
  actor: string
  action: string
  detail: string
}

export interface ServiceTicket {
  id: string
  type: ServiceType
  responsibility: ServiceResponsibility
  description: string
  linkedCourseId: string
  requester: string
  createdAt: string
  skipStages: SkipStageOption[]
  status: TicketStatus
  linkedVersion: string
  targetVersion: string
}

export interface CreateServiceTicketPayload {
  type: ServiceType
  responsibility: ServiceResponsibility
  description: string
  skipStages?: SkipStageOption[]
  linkedTaskId?: string
  workflowTemplateId?: string
  assigneeUserIds?: string[]
  ownerUserId?: string
  firstStageAssigneeUserId?: string
}

export interface CreateMedicalTaskSubItemPayload {
  remark?: string
  subItemType?: MedicalTaskSubItemType
  hasContractChange?: YesNoOption
  amount?: number
}

export interface UpdateMedicalTaskSubItemPayload {
  subItemType: string
  title: string
  description: string
  amount?: number
  remark?: string
}

export interface CreateMedicalTaskComplaintPayload {
  workflowStageId?: string
  description: string
  remark?: string
  responsibilityUserIds?: string[]
  processingMethod?: string
  refundAmount?: number
}

export interface CreateTicketResult {
  source: CourseRecord
  created: CourseRecord
}

export interface DesignerPageAssignment {
  designer: string
  pageCount: number
}

export interface DispatchPayload {
  designers: string[]
  leadDesigner?: string
  dueDate: string
  pageAssignments?: DesignerPageAssignment[]
}

export interface UploadStylePayload {
  files: AttachmentFile[]
}

export interface UploadPagePayload {
  files: AttachmentFile[]
}

export interface CourseRecord {
  id: string
  title: string
  series: string
  subject: string
  educationStage: EducationStage
  grade: string
  volume: VolumeOption
  textbook: string
  chapterName?: string
  orderType: OrderType
  isBEnd: YesNoOption
  hasLessonPlan: HasOption
  hasScript?: HasOption
  artCopyright: YesNoOption
  textCopyright: YesNoOption
  version: string
  status: CourseStatus
  currentOwner: string
  researchDueDate: string
  finalDueDate: string
  overallDueDate: string
  archivedAt?: string
  overdue: boolean
  researchTeacher: string
  researchOwner: string
  totalPageCount?: number
  actualResearchSubmissionDate?: string
  researchSourceFiles: AttachmentFile[]
  lessonPlanFiles: AttachmentFile[]
  scriptFiles: AttachmentFile[]
  guideFiles: AttachmentFile[]
  otherResearchFiles: AttachmentFile[]
  researchAttachments: AttachmentFile[]
  researchReviewStatus: ResearchReviewStatus
  coordinator: string
  styleDesigners: string[]
  styleDueDate?: string
  styleAttachments: AttachmentFile[]
  styleNamingPassed: boolean
  pageDesigners: string[]
  pageLead: string
  pageAssignments?: DesignerPageAssignment[]
  pageDueDate?: string
  pageAttachments: AttachmentFile[]
  pageNamingPassed: boolean
  qualityCheck: QualityCheckStatus
  fileCountCheckPassed: boolean
  namingCheckPassed: boolean
  attachments: AttachmentFile[]
  stages: StageRecord[]
  tickets: ServiceTicket[]
  logs: ActivityLog[]
}

export interface CreateCoursePayload {
  series: string
  subject: string
  educationStage: EducationStage
  grade: string
  volume: VolumeOption
  textbook: string
  chapterName?: string
  title: string
  orderType: OrderType
  isBEnd: YesNoOption
  hasLessonPlan: HasOption
  hasScript?: HasOption
  artCopyright: YesNoOption
  textCopyright: YesNoOption
  researchDueDate: string
  finalDueDate: string
  researchOwner?: string
}

export interface DashboardStats {
  total: number
  active: number
  overdue: number
  archived: number
}

export interface NavItem {
  key: string
  label: string
  hint: string
  path?: string
  viewKey?: ViewKey
  children?: NavItem[]
}

export type UserRole =
  | 'planner'
  | 'researcher'
  | 'coordinator'
  | 'styleDesigner'
  | 'pageDesigner'
  | 'sales'
  | 'admin'
  |'designcooperation'
  |'design'
  |'wuhan_design_cooperation'
  | 'customer_planner'
  |'presales'
  |'operation'

export interface RoleOption {
  key: UserRole
  label: string
  description: string
}

export interface MockUser {
  id: string
  username: string
  password: string
  name: string
  role: UserRole
}

export interface ProjectRole {
  id: number
  code: string
  name: string
}

export interface AvailableProjectRole {
  code: string
  name: string
  role: UserRole
}

export interface ProjectPermission {
  resource: string
  resourceName: string
  action: string
}

export type RolePermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'all'

export interface RolePermissionResourceRecord {
  resourceCode: string
  resourceName: string
}

export interface RolePermissionRecord extends RolePermissionResourceRecord {
  actions: RolePermissionAction[]
}

export interface ProjectOption {
  key: string
  id: string
  code: string
  name: string
  description: string
  status: 'enabled' | 'disabled'
  workwxBound: boolean
  roles: ProjectRole[]
  permissions: ProjectPermission[]
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  status: 'enabled' | 'disabled'
  projects: ProjectOption[]
}

export type AccountStatus = '启用' | '停用'

export interface AdminAccountRecord {
  id: string
  username: string
  name: string
  status: AccountStatus
  email: string
  createdAt: string
  updatedAt: string
}

export interface SaveAdminAccountPayload {
  name: string
  email: string
  password?: string
  status?: AccountStatus
}

export interface SystemRoleRecord {
  id: string
  code: string
  name: string
  description: string
  memberCount: number
  scope: string
  viewAccess: ViewKey[]
}

export interface SaveSystemRolePayload {
  code: string
  name: string
  description: string
  scope: string
  viewAccess: ViewKey[]
}

export interface ProjectMemberRecord {
  id: string
  memberIds: string[]
  memberIdByRoleId: Record<string, string>
  projectId: string
  projectName: string
  userId: string
  userName: string
  userEmail: string
  userStatus: AccountStatus
  roleIds: string[]
  roleNames: string[]
  roleCodes: string[]
}

export interface ProjectManagementRecord {
  id: string
  name: string
  code: string
  status: 'enabled' | 'disabled'
  createdAt: string
  updatedAt: string
}

export type WorkflowTemplateStatus = 'enabled' | 'disabled'

export interface WorkflowStageFileRule {
  id?: string
  itemName: string
  fileCategory: string
  filenamePattern: string
  requiredCount: number
  required: boolean
  excludeFromPackage?: boolean
}

export interface WorkflowStageConfig {
  id?: string
  localId: string
  stageName: string
  sortValue: number
  defaultDueDays?: number
  operatorRoleCode?: string
  operatorRoleName?: string
  canAssign: boolean
  canSkip: boolean
  collectTotalPageCount: boolean
  allowPageAssignment: boolean
  requiresFileUpload: boolean
  requiresValidation: boolean
  triggersPackage: boolean
  isMerged: boolean
  status: WorkflowTemplateStatus
  nextStageIds: string[]
  fileRules: WorkflowStageFileRule[]
  configJson?: Record<string, unknown>
  allowCustomDueDays?:boolean
  canUpdateFields?: boolean
}

export interface WorkflowTemplateRecord {
  id: string
  name: string
  isDefault: boolean
  status: WorkflowTemplateStatus
  stages: WorkflowStageConfig[]
  order_type:string
}

export interface RoleActionSummary {
  pendingCount: number
  actionableStatuses: CourseStatus[]
  label: string
}

export interface UpdateResearchPayload {
  researchOwner: string
  totalPageCount: number
  actualResearchSubmissionDate?: string
  researchSourceFiles: AttachmentFile[]
  lessonPlanFiles: AttachmentFile[]
  scriptFiles: AttachmentFile[]
  guideFiles: AttachmentFile[]
  otherResearchFiles: AttachmentFile[]
  researchAttachments: AttachmentFile[]
  researchReviewStatus: ResearchReviewStatus
}
