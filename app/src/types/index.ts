export type ViewKey =
  | 'dashboard'
  | 'allTickets'
  | 'research'
  | 'courses'
  | 'dispatch'
  | 'designers'
  | 'service'
  | 'settingsUsers'
  | 'settingsRoles'

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

export interface AttachmentFile {
  uid: string
  name: string
  size?: number
  type?: string
  uploadedAt?: string
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

export type AuthUser = Omit<MockUser, 'password'>

export interface ProjectOption {
  key: string
  name: string
  description: string
}

export type AccountStatus = '启用' | '停用'

export interface AdminAccountRecord {
  id: string
  username: string
  name: string
  role: UserRole
  status: AccountStatus
  phone: string
  email: string
  note?: string
  lastLoginAt?: string
  createdAt: string
}

export interface SaveAdminAccountPayload {
  username: string
  name: string
  role: UserRole
  status: AccountStatus
  phone: string
  email: string
  note?: string
}

export interface SystemRoleRecord {
  id: string
  code: string
  name: string
  description: string
  status: AccountStatus
  memberCount: number
  scope: string
  viewAccess: ViewKey[]
}

export interface SaveSystemRolePayload {
  code: string
  name: string
  description: string
  status: AccountStatus
  scope: string
  viewAccess: ViewKey[]
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
