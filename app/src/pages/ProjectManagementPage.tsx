import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Key,
} from 'react'
import {
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  SearchOutlined
} from '@ant-design/icons'
import type { TablePaginationConfig } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ProjectFieldConfigDrawer } from '../components/project/ProjectFieldConfigDrawer'
import { adminService } from '../services/adminService'
import './ProjectManagementPage.css'
import type {
  AdminAccountRecord,
  ProjectManagementRecord,
  ProjectMemberRecord,
  SystemRoleRecord,
  WorkflowStageConfig,
  WorkflowStageFileRule,
  WorkflowTemplateRecord,
} from '../types'

type ProjectFormValues = {
  name: string
  status?: 'enabled' | 'disabled'
}

type MemberFormValues = {
  userIds?: string[]
  roleIds?: string[]
}

type RoleFormValues = {
  code: string
  name: string
}

type MemberStatusFilter = 'all' | '启用' | '停用'

const workflowStageMeta: Array<{
  label: string
  accent: string
}> = [
  { accent: '#3b82f6', label: '教研中' },
  { accent: '#8b5cf6', label: '风格稿制作中' },
  { accent: '#f59e0b', label: '内页制作中' },
  { accent: '#10b981', label: '打包归档' },
]

let workflowStageSeed = 0

function createDefaultWorkflowStages(): WorkflowStageConfig[] {
  return []
}

function cloneWorkflowStages(stages: WorkflowStageConfig[]) {
  return stages.map((stage) => ({
    ...stage,
    configJson: {
      ...(stage.configJson ?? {}),
    },
    fileRules: stage.fileRules.map((rule) => ({
      ...rule,
    })),
    nextStageIds: [...stage.nextStageIds],
  }))
}

function createWorkflowStage(index: number): WorkflowStageConfig {
  workflowStageSeed += 1
  const localId = `workflow-node-${workflowStageSeed}`

  return {
    allowPageAssignment: false,
    canAssign: index > 0,
    canSkip: false,
    collectTotalPageCount: false,
    configJson: {},
    defaultDueDays: 3,
    isMerged: false,
    localId,
    nextStageIds: [],
    fileRules: [],
    operatorRoleCode: undefined,
    requiresFileUpload: true,
    requiresValidation: false,
    sortValue: (index + 1) * 10,
    stageName: '',
    status: 'enabled',
    triggersPackage: false,
    allowCustomDueDays:false
  }
}

function renderWorkflowStageCard(
  stage: WorkflowStageConfig,
  selected: boolean,
  index: number,
) {
  const meta = workflowStageMeta[index % workflowStageMeta.length]
  const ownerLabel =
    stage.operatorRoleCode && stage.operatorRoleCode.trim()
      ? stage.operatorRoleCode
      : '未指定角色'

  return (
    <div
      className={`workflow-stage-node${selected ? ' workflow-stage-node--selected' : ''}`}
      style={{ '--workflow-accent': meta?.accent } as CSSProperties}
    >
      <div className="workflow-stage-node__header">
        <div>
          <div className="workflow-stage-node__eyebrow">
            <span>{`步骤 ${index + 1}`}</span>
            {selected ? <span className="workflow-stage-node__eyebrow-active">当前选中</span> : null}
          </div>
          <div className="workflow-stage-node__title">{stage.stageName || '未命名节点'}</div>
        </div>
        <Tag color={stage.status === 'enabled' ? 'success' : 'default'}>
          {stage.status === 'enabled' ? '启用' : '停用'}
        </Tag>
      </div>

      <div className="workflow-stage-node__meta">
        <div className="workflow-stage-node__meta-item">
          <span>负责人</span>
          <strong>{ownerLabel}</strong>
        </div>
        <div className="workflow-stage-node__meta-item">
          <span>完成时限</span>
          <strong>{stage.defaultDueDays ?? 0} 天</strong>
        </div>
        <div className="workflow-stage-node__meta-item">
          <span>排序值</span>
          <strong>{stage.sortValue}</strong>
        </div>
      </div>

      <div className="workflow-stage-node__flags">
        {stage.canAssign ? <Tag color="blue">可派单</Tag> : null}
        {stage.canSkip ? <Tag color="orange">可跳过</Tag> : null}
        {stage.allowPageAssignment ? <Tag color="geekblue">分配页数</Tag> : null}
        {stage.requiresFileUpload ? <Tag color="purple">需上传</Tag> : null}
        {stage.requiresValidation ? <Tag color="cyan">需校验</Tag> : null}
        {stage.triggersPackage ? <Tag color="green">需打包</Tag> : null}
        {stage.isMerged ? <Tag color="magenta">合并节点</Tag> : null}
      </div>
    </div>
  )
}

export function ProjectManagementPage() {
  const memberPageSize = 10
  const [projects, setProjects] = useState<ProjectManagementRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [fieldConfigDrawerOpen, setFieldConfigDrawerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectManagementRecord | null>(null)
  const [membersModalOpen, setMembersModalOpen] = useState(false)
  const [rolesModalOpen, setRolesModalOpen] = useState(false)
  const [workflowsModalOpen, setWorkflowsModalOpen] = useState(false)
  const [workflowEditorOpen, setWorkflowEditorOpen] = useState(false)
  const [memberDrawerOpen, setMemberDrawerOpen] = useState(false)
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)
  const [roleLoading, setRoleLoading] = useState(false)
  const [workflowLoading, setWorkflowLoading] = useState(false)
  const [memberSubmitting, setMemberSubmitting] = useState(false)
  const [roleSubmitting, setRoleSubmitting] = useState(false)
  const [workflowSubmitting, setWorkflowSubmitting] = useState(false)
  const [members, setMembers] = useState<ProjectMemberRecord[]>([])
  const [users, setUsers] = useState<AdminAccountRecord[]>([])
  const [roles, setRoles] = useState<SystemRoleRecord[]>([])
  const [workflows, setWorkflows] = useState<WorkflowTemplateRecord[]>([])
  const [workflowPagination, setWorkflowPagination] = useState({
    current: 1,
    pageSize: 5,
  })
  const [selectedProject, setSelectedProject] = useState<ProjectManagementRecord | null>(null)
  const [editingMember, setEditingMember] = useState<ProjectMemberRecord | null>(null)
  const [editingRole, setEditingRole] = useState<SystemRoleRecord | null>(null)
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplateRecord | null>(null)
  const [memberKeyword, setMemberKeyword] = useState('')
  const [roleKeyword, setRoleKeyword] = useState('')
  const [memberStatusFilter, setMemberStatusFilter] = useState<MemberStatusFilter>('all')
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>('all')
  const [selectedMemberKeys, setSelectedMemberKeys] = useState<string[]>([])
  const [batchRoleId, setBatchRoleId] = useState<string>()
  const [memberPagination, setMemberPagination] = useState({
    current: 1,
    total: 0,
  })
  const [workflowName, setWorkflowName] = useState('')
  const [workflowStatus, setWorkflowStatus] = useState<'enabled' | 'disabled'>('enabled')
  const [type,setType] = useState('new')
  const [workflowStages, setWorkflowStages] = useState<WorkflowStageConfig[]>(
    createDefaultWorkflowStages(),
  )
  const [selectedWorkflowStageKey, setSelectedWorkflowStageKey] = useState<string | null>(
    null,
  )
  const workflowInspectorRef = useRef<HTMLElement | null>(null)
  const [projectForm] = Form.useForm<ProjectFormValues>()
  const [memberForm] = Form.useForm<MemberFormValues>()
  const [roleForm] = Form.useForm<RoleFormValues>()

  async function loadProjects(searchKeyword = '') {
    setLoading(true)

    try {
      const nextProjects = await adminService.listProjects(searchKeyword)
      setProjects(nextProjects)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载项目列表失败')
    } finally {
      setLoading(false)
    }
  }

  async function loadMemberContext(project: ProjectManagementRecord, page = 1) {
    setMembersLoading(true)

    try {
      const [memberResponse, nextUsers, nextRoles] = await Promise.all([
        adminService.listProjectMembers({
          keyword: memberKeyword,
          page,
          pageSize: memberPageSize,
          projectId: project.id,
          roleId: memberRoleFilter === 'all' ? undefined : memberRoleFilter,
        }),
        adminService.listUsers(),
        adminService.listRoles(project.id),
      ])

      const nextMembers =
        memberStatusFilter === 'all'
          ? memberResponse.items
          : memberResponse.items.filter((member) => member.userStatus === memberStatusFilter)

      setMembers(nextMembers)
      setUsers(nextUsers)
      setRoles(nextRoles)
      setSelectedMemberKeys([])
      setMemberPagination({
        current: memberResponse.page,
        total: memberResponse.total,
      })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载项目成员数据失败')
    } finally {
      setMembersLoading(false)
    }
  }

  async function loadRoleContext(project: ProjectManagementRecord) {
    setRoleLoading(true)

    try {
      const nextRoles = await adminService.listRoles(project.id)
      setRoles(nextRoles)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载角色列表失败')
    } finally {
      setRoleLoading(false)
    }
  }

  async function loadWorkflowContext(project: ProjectManagementRecord) {
    setWorkflowLoading(true)

    try {
      const [nextRoles, nextWorkflows] = await Promise.all([
        adminService.listRoles(project.id),
        adminService.listWorkflowTemplates(project.id),
      ])
      setRoles(nextRoles)
      setWorkflows(nextWorkflows)
      setWorkflowPagination((current) => ({
        ...current,
        current: 1,
      }))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载工作流配置失败')
    } finally {
      setWorkflowLoading(false)
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [])

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        [project.name, project.code, project.status]
          .join(' ')
          .toLowerCase()
          .includes(keyword.trim().toLowerCase()),
      ),
    [keyword, projects],
  )

  const selectedMemberRecords = useMemo(
    () => members.filter((member) => selectedMemberKeys.includes(member.id)),
    [members, selectedMemberKeys],
  )

  const filteredRoles = useMemo(
    () =>
      roles.filter((role) =>
        [role.name, role.code, role.scope]
          .join(' ')
          .toLowerCase()
          .includes(roleKeyword.trim().toLowerCase()),
      ),
    [roleKeyword, roles],
  )

  const workflowRoleOptions = useMemo(
    () =>
      roles.map((role) => ({
        label: `${role.name} · ${role.code}`,
        value: role.code,
      })),
    [roles],
    
  )

  const handleReset = () =>{
    setKeyword('')
  }

  const selectedWorkflowStage = useMemo(
    () =>
      workflowStages.find((stage) => stage.localId === selectedWorkflowStageKey) ?? null,
    [selectedWorkflowStageKey, workflowStages],
  )

  useEffect(() => {
    if (!workflowEditorOpen || !selectedWorkflowStageKey || !workflowInspectorRef.current) {
      return
    }

    workflowInspectorRef.current.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [selectedWorkflowStageKey, workflowEditorOpen])

  const projectColumns: ColumnsType<ProjectManagementRecord> = [
    {
      title: '项目信息',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      render: (_, record) =>
        record.status === 'enabled' ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="default">停用</Tag>
        ),
    },
    { title: '创建时间', dataIndex: 'createdAt' },
    { title: '更新时间', dataIndex: 'updatedAt' },
    {
      title: '操作',
      width: 560,
      render: (_, record) => (
        <Space size={8} wrap>
          <Button
            size="small"
            color='green'
            variant='solid'
            onClick={() => {
              setEditingProject(record)
              projectForm.setFieldsValue({
                name: record.name,
                status: record.status,
              })
              setDrawerOpen(true)
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
              color='geekblue'
            variant='solid'
            onClick={() => {
              setSelectedProject(record)
              setMembersModalOpen(true)
              setEditingMember(null)
              memberForm.resetFields()
              void loadMemberContext(record, 1)
            }}
          >
            成员操作
          </Button>
          <Button
            size="small"
               color='blue'
            variant='solid'
            onClick={() => {
              setSelectedProject(record)
              setRolesModalOpen(true)
              setEditingRole(null)
              roleForm.resetFields()
              void loadRoleContext(record)
            }}
          >
            角色管理
          </Button>
          <Button
            size="small"
            variant='solid'
            color='geekblue'
            onClick={() => {
              setSelectedProject(record)
              setFieldConfigDrawerOpen(true)
            }}
          >
            字段配置
          </Button>
          <Button
            size="small"
            type="primary"
            variant='solid'
            onClick={() => {
              setSelectedProject(record)
              setWorkflowsModalOpen(true)
              void loadWorkflowContext(record)
            }}
          >
            配置工作流程
          </Button>
          <Popconfirm
            title="确认删除该项目吗？"
            onConfirm={() => void handleDeleteProject(record.id)}
          >
            <Button size="small" color='red' variant='solid'>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const memberColumns: ColumnsType<ProjectMemberRecord> = [
    {
      title: '成员信息',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.userName}</Typography.Text>
          <Typography.Text type="secondary">{record.userEmail}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '角色',
      render: (_, record) => (
        <Space size={[4, 8]} wrap>
          {record.roleNames.map((roleName) => (
            <Tag key={`${record.id}-${roleName}`} color="blue">
              {roleName}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '账号状态',
      render: (_, record) =>
        record.userStatus === '启用' ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="default">停用</Tag>
        ),
    },
    {
      title: '操作',
      width: 220,
      render: (_, record) => (
        <Space size={8}>
          <Button
            size="small"
            onClick={() => {
              setEditingMember(record)
              memberForm.setFieldsValue({
                roleIds: record.roleIds,
                userIds: undefined,
              })
              setMemberDrawerOpen(true)
            }}
          >
            修改权限
          </Button>
          <Popconfirm
            title="确认删除该项目成员吗？"
            onConfirm={() => void handleDeleteUserMembership(record)}
          >
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const roleColumns: ColumnsType<SystemRoleRecord> = [
    {
      title: '角色信息',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">{record.code}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '成员数',
      dataIndex: 'memberCount',
      width: 100,
    },
    {
      title: '范围',
      render: (_, record) => <Tag color="blue">{record.scope}</Tag>,
      width: 100,
    },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space size={8}>
          <Button
            size="small"
            onClick={() => {
              setEditingRole(record)
              roleForm.setFieldsValue({
                code: record.code,
                name: record.name,
              })
              setRoleDrawerOpen(true)
            }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该角色吗？"
            onConfirm={() => void handleDeleteRole(record.id)}
          >
            <Button size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  function handleWorkflowStageChange(
    stageLocalId: string,
    patch: Partial<WorkflowStageConfig>,
  ) {
    setWorkflowStages((current) =>
      current.map((stage) => (stage.localId === stageLocalId ? { ...stage, ...patch } : stage)),
    )
  }

  function buildWorkflowFilePattern(itemName: string, fileCategory: string) {
    const escapedName = itemName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const escapedCategory = fileCategory.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return `^.+-${escapedName}\\.${escapedCategory}$`
  }

  function handleAddWorkflowFileRule(stageLocalId: string) {
    setWorkflowStages((current) =>
      current.map((stage) => {
        if (stage.localId !== stageLocalId) {
          return stage
        }

        const nextIndex = stage.fileRules.length + 1
        const nextRule: WorkflowStageFileRule = {
          fileCategory: 'txt',
          filenamePattern: buildWorkflowFilePattern(`文件${nextIndex}`, 'txt'),
          itemName: `文件${nextIndex}`,
          required: true,
          requiredCount: 1,
        }

        return {
          ...stage,
          fileRules: [...stage.fileRules, nextRule],
        }
      }),
    )
  }

  function handleWorkflowFileRuleChange(
    stageLocalId: string,
    ruleIndex: number,
    patch: Partial<WorkflowStageFileRule>,
  ) {
    setWorkflowStages((current) =>
      current.map((stage) => {
        if (stage.localId !== stageLocalId) {
          return stage
        }

        const nextFileRules = stage.fileRules.map((rule, index) => {
          if (index !== ruleIndex) {
            return rule
          }

          const nextRule = {
            ...rule,
            ...patch,
          }

          const shouldRefreshPattern =
            patch.itemName !== undefined || patch.fileCategory !== undefined

          return shouldRefreshPattern
            ? {
                ...nextRule,
                filenamePattern: buildWorkflowFilePattern(
                  nextRule.itemName,
                  nextRule.fileCategory,
                ),
              }
            : nextRule
        })

        return {
          ...stage,
          fileRules: nextFileRules,
        }
      }),
    )
  }

  function handleRemoveWorkflowFileRule(stageLocalId: string, ruleIndex: number) {
    setWorkflowStages((current) =>
      current.map((stage) =>
        stage.localId === stageLocalId
          ? {
              ...stage,
              fileRules: stage.fileRules.filter((_, index) => index !== ruleIndex),
            }
          : stage,
      ),
    )
  }

  function handleAddWorkflowStage() {
    const nextStage = createWorkflowStage(workflowStages.length)
    setWorkflowStages((current) => [...current, nextStage])
    setSelectedWorkflowStageKey(nextStage.localId)
  }

  function handleRemoveWorkflowStage() {
    if (!selectedWorkflowStage) {
      return
    }

    const stageLocalId = selectedWorkflowStage.localId
    setWorkflowStages((current) => current.filter((stage) => stage.localId !== stageLocalId))
    setSelectedWorkflowStageKey(null)
  }

  function openCreateDrawer() {
    setEditingProject(null)
    projectForm.resetFields()
    projectForm.setFieldsValue({ status: 'enabled' })
    setDrawerOpen(true)
  }

  function openCreateMemberDrawer() {
    setEditingMember(null)
    memberForm.resetFields()
    setMemberDrawerOpen(true)
  }

  function openCreateRoleDrawer() {
    setEditingRole(null)
    roleForm.resetFields()
    setRoleDrawerOpen(true)
  }

  function openWorkflowEditor(template?: WorkflowTemplateRecord) {
    if (!selectedProject) {
      return
    }

    if (template) {
      const nextStages = template.stages.length > 0 ? cloneWorkflowStages(template.stages) : []
      console.error(nextStages,'nextStages')
      setEditingWorkflow(template)
      setWorkflowName(template.name)
      setWorkflowStatus(template.status)
      setWorkflowStages(nextStages)
      setSelectedWorkflowStageKey(nextStages[0]?.localId ?? null)
      setType(template.order_type)
    } else {
      setEditingWorkflow(null)
      // setWorkflowName(`${selectedProject.name}标准工作流`)
      setWorkflowName(``)
      setWorkflowStatus('enabled')
      setWorkflowStages(createDefaultWorkflowStages())
      setSelectedWorkflowStageKey(null)
    }

    setWorkflowEditorOpen(true)
  }

  function resetMemberModalState() {
    setMembersModalOpen(false)
    setSelectedProject(null)
    setMembers([])
    setMemberKeyword('')
    setMemberStatusFilter('all')
    setMemberRoleFilter('all')
    setSelectedMemberKeys([])
    setBatchRoleId(undefined)
    setMemberPagination({
      current: 1,
      total: 0,
    })
    setEditingMember(null)
    setMemberDrawerOpen(false)
    memberForm.resetFields()
  }

  function resetRoleModalState() {
    setRolesModalOpen(false)
    setSelectedProject(null)
    setRoles([])
    setRoleKeyword('')
    setEditingRole(null)
    setRoleDrawerOpen(false)
    roleForm.resetFields()
  }

  function resetWorkflowState() {
    setWorkflowsModalOpen(false)
    setWorkflowEditorOpen(false)
    setEditingWorkflow(null)
    setWorkflowName('')
    setWorkflowStatus('enabled')
    setWorkflowStages(createDefaultWorkflowStages())
    setSelectedWorkflowStageKey(null)
    setWorkflows([])
    setWorkflowPagination({
      current: 1,
      pageSize: 5,
    })
    setSelectedProject(null)
  }

  async function handleDeleteProject(projectId: string) {
    try {
      await adminService.deleteProject(projectId)
      message.success('项目删除成功')
      await loadProjects(keyword)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除项目失败')
    }
  }

  async function handleDeleteRole(roleId: string) {
    if (!selectedProject) {
      return
    }

    try {
      await adminService.deleteRole(selectedProject.id, roleId)
      message.success('角色删除成功')
      await loadRoleContext(selectedProject)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除角色失败')
    }
  }

  async function handleDeleteUserMembership(record: ProjectMemberRecord) {
    if (!selectedProject) {
      return
    }

    try {
      await Promise.all(
        record.memberIds.map((memberId) =>
          adminService.deleteProjectMember(memberId, selectedProject.id),
        ),
      )
      message.success('项目成员删除成功')
      await loadMemberContext(selectedProject, memberPagination.current)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除项目成员失败')
    }
  }

  async function handleProjectSubmit(values: ProjectFormValues) {
    setSubmitting(true)

    try {
      if (editingProject) {
        await adminService.updateProject(editingProject.id, {
          name: values.name.trim(),
          status: values.status,
        })
        message.success('项目更新成功')
      } else {
        await adminService.createProject({ name: values.name.trim() })
        message.success('项目创建成功')
      }

      setDrawerOpen(false)
      setEditingProject(null)
      projectForm.resetFields()
      await loadProjects(keyword)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存项目失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleMemberSubmit(values: MemberFormValues) {
    if (!selectedProject) {
      return
    }

    setMemberSubmitting(true)

    try {
      const nextRoleIds = values.roleIds ?? []

      if (editingMember) {
        const currentRoleIds = editingMember.roleIds
        const roleIdsToAdd = nextRoleIds.filter((roleId) => !currentRoleIds.includes(roleId))
        const roleIdsToDelete = currentRoleIds.filter((roleId) => !nextRoleIds.includes(roleId))

        await Promise.all([
          ...roleIdsToAdd.map((roleId) =>
            adminService.addProjectMember({
              members: [{ roleIds: [roleId], userId: editingMember.userId }],
              projectId: selectedProject.id,
            }),
          ),
          ...roleIdsToDelete.map((roleId) => {
            const memberId = editingMember.memberIdByRoleId[roleId]
            return adminService.deleteProjectMember(memberId, selectedProject.id)
          }),
        ])

        message.success('成员权限更新成功')
      } else {
        const userIds = values.userIds ?? []
        await adminService.addProjectMember({
          members: userIds.map((userId) => ({
            roleIds: nextRoleIds,
            userId,
          })),
          projectId: selectedProject.id,
        })
        message.success(`已为 ${userIds.length} 个账号分配 ${nextRoleIds.length} 个角色`)
      }

      setMemberDrawerOpen(false)
      setEditingMember(null)
      memberForm.resetFields()
      await loadMemberContext(selectedProject, memberPagination.current)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存成员权限失败')
    } finally {
      setMemberSubmitting(false)
    }
  }

  async function handleRoleSubmit(values: RoleFormValues) {
    if (!selectedProject) {
      return
    }

    setRoleSubmitting(true)

    try {
      if (editingRole) {
        await adminService.updateRole(selectedProject.id, editingRole.id, {
          name: values.name,
        })
        message.success('角色更新成功')
      } else {
        await adminService.createRole(selectedProject.id, {
          code: values.code,
          name: values.name,
        })
        message.success('角色创建成功')
      }

      setRoleDrawerOpen(false)
      setEditingRole(null)
      roleForm.resetFields()
      await loadRoleContext(selectedProject)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存角色失败')
    } finally {
      setRoleSubmitting(false)
    }
  }

  async function handleSaveWorkflow() {
    if (!selectedProject) {
      return
    }

    if (!workflowName.trim()) {
      message.warning('请输入工作流名称')
      return
    }

    if (workflowStages.length === 0) {
      message.warning('请先新增一个节点，再保存工作流')
      return
    }

    const invalidStage = workflowStages.find((stage) => !stage.stageName.trim())

    if (invalidStage) {
      message.warning(`请补全 ${invalidStage.stageName || '未命名节点'} 的节点名称`)
      return
    }

    const invalidFileRuleStage = workflowStages.find((stage) =>
      stage.requiresFileUpload
        ? stage.fileRules.some(
            (rule) =>
              !rule.itemName.trim() ||
              !rule.fileCategory.trim() ||
              !Number.isFinite(rule.requiredCount) ||
              rule.requiredCount <= 0,
          )
        : false,
    )

    if (invalidFileRuleStage) {
      message.warning(`请补全 ${invalidFileRuleStage.stageName} 的文件规则配置`)
      return
    }

    setWorkflowSubmitting(true)

    try {
      const sortedWorkflowStages = [...workflowStages].sort(
        (left, right) => left.sortValue - right.sortValue,
      )
      console.error(workflowStages)
      const stagesToSave = sortedWorkflowStages.map((stage, index) => ({
        ...stage,
        nextStageIds:
          index < sortedWorkflowStages.length - 1
            ? [sortedWorkflowStages[index + 1].localId]
            : [],
        configJson: {
          ...(stage.configJson ?? {}),
        },
      }))
      if (editingWorkflow) {
        await adminService.createWorkflowTemplate(selectedProject.id, {
          id: editingWorkflow.id,
          isDefault: editingWorkflow.isDefault,
          name: workflowName,
          stages: stagesToSave,
          status: workflowStatus,
          orderType:type
        })
        message.success('工作流节点配置已更新')
      } else {
        await adminService.createWorkflowTemplate(selectedProject.id, {
          isDefault: false,
          name: workflowName,
          stages: stagesToSave,
          status: workflowStatus,
          orderType:type
        })
        message.success('工作流创建成功')
      }

      setWorkflowEditorOpen(false)
      await loadWorkflowContext(selectedProject)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存工作流失败')
    } finally {
      setWorkflowSubmitting(false)
    }
  }

  async function handleDeleteWorkflowTemplate(templateId: string) {
    if (!selectedProject) {
      return
    }

    setWorkflowLoading(true)

    try {
      await adminService.deleteWorkflowTemplate(selectedProject.id, templateId)
      message.success('工作流已删除')
      setEditingWorkflow((current) => (current?.id === templateId ? null : current))
      await loadWorkflowContext(selectedProject)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除工作流失败')
    } finally {
      setWorkflowLoading(false)
    }
  }

  async function handleBatchAssignRole() {
    if (!selectedProject || !batchRoleId) {
      message.warning('请选择要批量分配的角色')
      return
    }

    if (selectedMemberRecords.length === 0) {
      message.warning('请先选择要处理的成员')
      return
    }

    const pendingMembers = selectedMemberRecords.filter(
      (member) => !member.roleIds.includes(batchRoleId),
    )

    if (pendingMembers.length === 0) {
      message.info('所选成员已拥有当前角色，无需重复分配')
      return
    }

    setMemberSubmitting(true)

    try {
      await adminService.addProjectMember({
        members: pendingMembers.map((member) => ({
          roleIds: [batchRoleId],
          userId: member.userId,
        })),
        projectId: selectedProject.id,
      })
      message.success(`已为 ${pendingMembers.length} 个成员分配角色`)
      setSelectedMemberKeys([])
      setBatchRoleId(undefined)
      await loadMemberContext(selectedProject, memberPagination.current)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '批量分配角色失败')
    } finally {
      setMemberSubmitting(false)
    }
  }

  const workflowColumns: ColumnsType<WorkflowTemplateRecord> = [
    {
      title: '工作流名称',
      dataIndex: 'name',
      render: (value: string) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{value}</Typography.Text>
          {/* <Typography.Text type="secondary">
            {record.isDefault ? '默认工作流' : '自定义工作流'}
          </Typography.Text> */}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: WorkflowTemplateRecord['status']) => (
        <Tag color={value === 'enabled' ? 'success' : 'default'}>
          {value === 'enabled' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '节点数',
      width: 120,
      render: (_, record) => record.stages.length,
    },
    {
      title: '可派单节点',
      width: 140,
      render: (_, record) => record.stages.filter((stage) => stage.canAssign).length,
    },
    {
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space size={8}>
          <Button type="link" onClick={() => openWorkflowEditor(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该工作流吗？"
            onConfirm={() => void handleDeleteWorkflowTemplate(record.id)}
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  async function handleMemberTableChange(pagination: TablePaginationConfig) {
    if (!selectedProject) {
      return
    }

    await loadMemberContext(selectedProject, pagination.current ?? 1)
  }

  async function handleApplyMemberFilters() {
    if (!selectedProject) {
      return
    }

    setSelectedMemberKeys([])
    await loadMemberContext(selectedProject, 1)
  }

  const memberRowSelection = {
    onChange: (nextSelectedRowKeys: Key[]) => {
      setSelectedMemberKeys(nextSelectedRowKeys.map(String))
    },
    selectedRowKeys: selectedMemberKeys,
  }

  const memberDrawerTitle = editingMember ? '修改成员权限' : '批量添加成员'

  return (
    <Card className="panel-card">
      <div className="workspace-filter-bar">
      <div className='workspace-search'> 
        <Input
          value={keyword}
          prefix={<SearchOutlined />}
          className="workspace-filter-input"
          allowClear
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索项目名称 / 编码 / 状态"
        />
         <Button type="primary" onClick={()=>{setKeyword(keyword)}}>
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
          </div>
          <div className="workspace-reset">
          <Button type="primary" onClick={openCreateDrawer}>
            新增项目
          </Button>
        </div>
      </div>

      <Table
        rowKey="id"
        columns={projectColumns}
        dataSource={filteredProjects}
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      <Drawer
        title={editingProject ? '编辑项目' : '新增项目'}
        size={520}
        open={drawerOpen}
        destroyOnClose
        onClose={() => {
          setDrawerOpen(false)
          setEditingProject(null)
        }}
      >
        <Form
          form={projectForm}
          layout="vertical"
          onFinish={(values) => void handleProjectSubmit(values)}
        >
          <Form.Item label="项目名称" name="name" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="enabled">
            <Select
              disabled={!editingProject}
              options={[
                { label: '启用', value: 'enabled' },
                { label: '停用', value: 'disabled' },
              ]}
            />
          </Form.Item>

          <Space className="form-footer-actions">
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingProject ? '保存修改' : '保存项目'}
            </Button>
          </Space>
        </Form>
      </Drawer>

      <Modal
        title={selectedProject ? `${selectedProject.name} · 项目成员` : '项目成员'}
        open={membersModalOpen}
        width={960}
        footer={null}
        onCancel={resetMemberModalState}
      >
        {/* <div className="workspace-header">
          <div className="workspace-header-main">
            <Typography.Text type="secondary">
              当前页成员数：{members.length}，成员总数：{memberPagination.total}
            </Typography.Text>
          </div>
          <div className="workspace-header-side">
         
          </div>
        </div> */}

        <div className="workspace-filter-bar">
          <Input
            value={memberKeyword}
            onChange={(event) => setMemberKeyword(event.target.value)}
            placeholder="搜索成员姓名 / 邮箱"
            className="workspace-filter-input"
          />
          <Select
            value={memberStatusFilter}
            onChange={setMemberStatusFilter}
            style={{ minWidth: 140 }}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '启用', value: '启用' },
              { label: '停用', value: '停用' },
            ]}
          />
          <Select
            value={memberRoleFilter}
            onChange={setMemberRoleFilter}
            style={{ minWidth: 180 }}
            options={[
              { label: '全部角色', value: 'all' },
              ...roles.map((role) => ({
                label: role.name,
                value: role.id,
              })),
            ]}
          />
          <Button onClick={() => void handleApplyMemberFilters()}>查询</Button>
          <Button
            onClick={() => {
              setMemberKeyword('')
              setMemberStatusFilter('all')
              setMemberRoleFilter('all')
              setSelectedMemberKeys([])
              if (selectedProject) {
                void loadMemberContext(selectedProject, 1)
              }
            }}
          >
            重置筛选
          </Button>
          <Button type="primary" className='addopen' onClick={openCreateMemberDrawer}>
              添加成员
            </Button>
        </div>

        <div className="workspace-headers">
          <div className="workspace-header-main">
            <Typography.Text type="secondary">
              已选成员：{selectedMemberRecords.length}
            </Typography.Text>
          </div>
          <div className="workspace-header-side">
            <Select
              value={batchRoleId}
              onChange={setBatchRoleId}
              placeholder="选择批量目标角色"
              style={{ minWidth: 200 }}
              options={roles.map((role) => ({
                label: role.name,
                value: role.id,
              }))}
            />
            <Button
              type="primary"
              disabled={selectedMemberRecords.length === 0}
              loading={memberSubmitting}
              onClick={() => void handleBatchAssignRole()}
            >
              批量分配角色
            </Button>
          </div>
        </div>

        <Table
          rowKey="id"
          columns={memberColumns}
          dataSource={members}
          loading={membersLoading}
          pagination={{
            current: memberPagination.current,
            pageSize: memberPageSize,
            total: memberPagination.total,
          }}
          rowSelection={memberRowSelection}
          onChange={(pagination) => void handleMemberTableChange(pagination)}
        />

        <Drawer
          title={memberDrawerTitle}
          size={480}
          open={memberDrawerOpen}
          destroyOnClose
          onClose={() => {
            setMemberDrawerOpen(false)
            setEditingMember(null)
          }}
        >
          <Form
            form={memberForm}
            layout="vertical"
            onFinish={(values) => void handleMemberSubmit(values)}
          >
            {!editingMember ? (
              <Form.Item
                label="成员账号"
                name="userIds"
                rules={[{ required: true, message: '请选择至少一个成员账号' }]}
              >
                <Select
                  mode="multiple"
                  options={users.map((user) => ({
                    label: `${user.name} · ${user.email}`,
                    value: user.id,
                  }))}
                  placeholder="请选择一个或多个成员账号"
                  showSearch
                />
              </Form.Item>
            ) : null}
            <Form.Item
              label="项目角色"
              name="roleIds"
              rules={[{ required: true, message: '请选择至少一个项目角色' }]}
            >
              <Select
                mode="multiple"
                options={roles.map((role) => ({
                  label: role.name,
                  value: role.id,
                }))}
                placeholder="请选择一个或多个项目角色"
              />
            </Form.Item>

            <Space className="form-footer-actions">
              <Button onClick={() => setMemberDrawerOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={memberSubmitting}>
                {editingMember ? '保存权限' : '添加成员'}
              </Button>
            </Space>
          </Form>
        </Drawer>
      </Modal>

      <Modal
        title={selectedProject ? `${selectedProject.name} · 角色管理` : '角色管理'}
        open={rolesModalOpen}
        width={860}
        footer={null}
        onCancel={resetRoleModalState}
      >
        {/* <div className="workspace-headers">
          <div className="workspace-header-main">
            <Typography.Text type="secondary">
              当前项目角色数：{roles.length}
            </Typography.Text>
          </div>
       
        </div> */}

        <div className="workspace-filter-bar">
          <Input
            value={roleKeyword}
            onChange={(event) => setRoleKeyword(event.target.value)}
            placeholder="搜索角色名称 / 编码"
            className="workspace-filter-input"
          />
             <div className="workspace-header-side">
            <Button type="primary" className='addopen' onClick={openCreateRoleDrawer}>
              新增角色
            </Button>
          </div>
        </div>

        <Table
          rowKey="id"
          columns={roleColumns}
          dataSource={filteredRoles}
          loading={roleLoading}
          pagination={{ pageSize: 8 }}
        />

        <Drawer
          title={editingRole ? '编辑角色' : '新增角色'}
          size={460}
          open={roleDrawerOpen}
          destroyOnClose
          onClose={() => {
            setRoleDrawerOpen(false)
            setEditingRole(null)
          }}
        >
          <Form
            form={roleForm}
            layout="vertical"
            onFinish={(values) => void handleRoleSubmit(values)}
          >
            <Form.Item
              label="角色编码"
              name="code"
              rules={[
                { required: true, message: '请输入角色编码' },
                {
                  pattern: /^[a-z][a-z0-9_]*$/,
                  message: '角色编码仅支持小写字母、数字和下划线',
                },
              ]}
            >
              <Input placeholder="例如：planner_assistant" disabled={Boolean(editingRole)} />
            </Form.Item>
            <Form.Item
              label="角色名称"
              name="name"
              rules={[{ required: true, message: '请输入角色名称' }]}
            >
              <Input placeholder="请输入角色名称" />
            </Form.Item>

            <Space className="form-footer-actions">
              <Button onClick={() => setRoleDrawerOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit" loading={roleSubmitting}>
                {editingRole ? '保存修改' : '保存角色'}
              </Button>
            </Space>
          </Form>
        </Drawer>
      </Modal>

      <Modal
        title={selectedProject ? `${selectedProject.name} · 工作流配置` : '工作流配置'}
        open={workflowsModalOpen}
        width={980}
        footer={null}
        onCancel={resetWorkflowState}
      >
        <div className="workspace-header">
          {/* <div className="workspace-header-main">
            <Typography.Text type="secondary">
              当前项目工作流数：{workflows.length}
            </Typography.Text>
          </div> */}
          <div className="workspace-header-side-pos">
            <Button type="primary" onClick={() => openWorkflowEditor()}>
              新建工作流
            </Button>
          </div>
        </div>

        {workflows.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当前项目还没有工作流，先创建一个吧"
          />
        ) : (
          <Table
            rowKey="id"
            size="small"
            className="workflow-config-table"
            loading={workflowLoading}
            columns={workflowColumns}
            dataSource={workflows}
            pagination={{
              current: workflowPagination.current,
              pageSize: workflowPagination.pageSize,
              pageSizeOptions: [5, 10, 20],
              position: ['bottomRight'],
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              total: workflows.length,
              onChange: (page, pageSize) => {
                setWorkflowPagination({
                  current: page,
                  pageSize: pageSize ?? workflowPagination.pageSize,
                })
              },
            }}
          />
        )}
      </Modal>

      <Modal
        open={workflowEditorOpen}
        title={editingWorkflow ? '配置工作流' : '新建工作流'}
        width={1120}
        footer={null}
        className="workflow-editor-modal"
        destroyOnClose
        onCancel={() => setWorkflowEditorOpen(false)}
        styles={{
          body: {
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 180px)',
            padding: 0,
          },
        }}
      >
        <div className="workflow-editor-shell">
          <div className="workflow-editor-toolbar">
            <div className="workflow-editor-toolbar__meta">
              <Input
                value={workflowName}
                disabled={Boolean(editingWorkflow)}
                placeholder="输入工作流名称"
                className="workflow-editor-toolbar__name"
                onChange={(event) => setWorkflowName(event.target.value)}
              />
              <div>
              <span>流程启用状态:</span>
              <Select
                value={workflowStatus}
                style={{ width: 140 }}
                options={[
                  { label: '启用', value: 'enabled' },
                  { label: '停用', value: 'disabled' },
                ]}
                onChange={setWorkflowStatus}
              />
              </div>
            
              <div>
                <span>流程类型:</span>
                <Select
                value={type}
                style={{ width: 140 }}
                placeholder='请选择工单类型'
                options={[
                  { label: '工单', value: 'new' },
                  { label: '售后', value: 'aftersales' },
                  { label: '迭代', value: 'iteration' },
                ]}
                onChange={setType}
              />
              </div>
            
          
            </div>
            <Space>
              <Button
                danger
                disabled={!selectedWorkflowStage}
                onClick={handleRemoveWorkflowStage}
              >
                删除当前节点
              </Button>
              <Button onClick={() => setWorkflowEditorOpen(false)}>取消</Button>
              <Button type="primary" loading={workflowSubmitting} onClick={() => void handleSaveWorkflow()}>
                保存工作流
              </Button>
            </Space>
          </div>

          <div className="workflow-editor-body workflow-editor-body--stacked">
            <aside className="workflow-editor-palette">
              <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                节点操作
              </Typography.Title>
              <Typography.Text type="secondary">
                节点按顺序串联展示，不再提供中间画布。新增后会自动出现在列表底部。
              </Typography.Text>
              <div className="workflow-editor-palette__creator">
                <Button type="primary" onClick={handleAddWorkflowStage}>
                  新增节点
                </Button>
              </div>
              <div className="workflow-stage-list">
                {workflowStages.length === 0 ? (
                  <div className="workflow-editor-palette__tips">
                    <Typography.Text type="secondary">
                      当前还没有节点，先新增一个节点开始配置。
                    </Typography.Text>
                  </div>
                ) : (
                  workflowStages
                    .sort((left, right) => left.sortValue - right.sortValue)
                    .map((stage, index, stages) => {
                      const selected = selectedWorkflowStageKey === stage.localId
                      const hasNext = index < stages.length - 1

                      return (
                        <div key={stage.localId} className="workflow-stage-list__item">
                          <button
                            type="button"
                            className="workflow-stage-list__button"
                            onClick={() => setSelectedWorkflowStageKey(stage.localId)}
                          >
                            {renderWorkflowStageCard(stage, selected, index)}
                          </button>
                          {hasNext ? <div className="workflow-stage-list__connector" /> : null}
                        </div>
                      )
                    })
                )}
              </div>
            </aside>

            <aside ref={workflowInspectorRef} className="workflow-editor-inspector">
              <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                节点配置
              </Typography.Title>
              {selectedWorkflowStage ? (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div className="workflow-editor-inspector__summary">
                    <div className="workflow-editor-inspector__summary-main">
                      <div className="workflow-editor-inspector__summary-badge">
                        {`步骤 ${workflowStages
                          .sort((left, right) => left.sortValue - right.sortValue)
                          .findIndex((stage) => stage.localId === selectedWorkflowStage.localId) + 1}`}
                      </div>
                      <div className="workflow-editor-inspector__summary-copy">
                        <Typography.Text strong>
                          {selectedWorkflowStage.stageName || '未命名节点'}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          当前正在编辑这个流程节点，左侧卡片与右侧表单实时联动。
                        </Typography.Text>
                      </div>
                    </div>
                    <Tag color="blue" bordered={false}>
                      当前配置中
                    </Tag>
                  </div>

                  <label className="workflow-stage-field">
                    <span>节点中文名</span>
                    <Input
                      value={selectedWorkflowStage.stageName}
                      onChange={(event) =>
                        handleWorkflowStageChange(selectedWorkflowStage.localId, {
                          stageName: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="workflow-stage-field">
                    <span>节点角色</span>
                    <Select
                      value={selectedWorkflowStage.operatorRoleCode}
                      options={workflowRoleOptions}
                      placeholder="选择负责人角色"
                      onChange={(value) =>
                        handleWorkflowStageChange(selectedWorkflowStage.localId, {
                          operatorRoleCode: value,
                        })
                      }
                    />
                  </label>

                  <div className="workflow-stage-field-grid">
                    <label className="workflow-stage-field">
                      <span>完成时间(天)</span>
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        value={selectedWorkflowStage.defaultDueDays}
                        onChange={(value) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            defaultDueDays: typeof value === 'number' ? value : undefined,
                          })
                        }
                      />
                    </label>
                    <label className="workflow-stage-field">
                      <span>排序值</span>
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        value={selectedWorkflowStage.sortValue}
                        onChange={(value) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            sortValue:
                              typeof value === 'number'
                                ? value
                                : selectedWorkflowStage.sortValue,
                          })
                        }
                      />
                    </label>
                  </div>

                  <label className="workflow-stage-field">
                    <span>启用状态</span>
                    <Select
                      value={selectedWorkflowStage.status}
                      options={[
                        { label: '启用', value: 'enabled' },
                        { label: '停用', value: 'disabled' },
                      ]}
                      onChange={(value) =>
                        handleWorkflowStageChange(selectedWorkflowStage.localId, { status: value })
                      }
                    />
                  </label>

                  <div className="workflow-stage-switch-list">
                    <div className="workflow-stage-switch">
                      <span>允许派单</span>
                      <Switch
                        checked={selectedWorkflowStage.canAssign}
                        onChange={(checked) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            canAssign: checked,
                          })
                        }
                      />
                    </div>
                    <div className="workflow-stage-switch">
                      <span>允许跳过</span>
                      <Switch
                        checked={selectedWorkflowStage.canSkip}
                        onChange={(checked) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            canSkip: checked,
                          })
                        }
                      />
                    </div>
                    <div className="workflow-stage-switch">
                      <span>是否分配页数</span>
                      <Switch
                        checked={selectedWorkflowStage.allowPageAssignment}
                        onChange={(checked) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            allowPageAssignment: checked,
                          })
                        }
                      />
                    </div>
                    <div className="workflow-stage-switch">
                      <span>是否允许为下一阶段分配天数</span>
                      <Switch
                        checked={selectedWorkflowStage.allowCustomDueDays}
                        onChange={(checked) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            allowCustomDueDays: checked,
                          })
                        }
                      />
                    </div>
                    <div className="workflow-stage-switch">
                      <span>是否需要填写总页数</span>
                      <Switch
                        checked={selectedWorkflowStage.collectTotalPageCount}
                        onChange={(checked) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            collectTotalPageCount: checked,
                          })
                        }
                      />
                    </div>
                    <div className="workflow-stage-switch">
                      <span>需要上传文件</span>
                      <Switch
                        checked={selectedWorkflowStage.requiresFileUpload}
                        onChange={(checked) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            fileRules: checked ? selectedWorkflowStage.fileRules : [],
                            requiresFileUpload: checked,
                          })
                        }
                      />
                    </div>
                    <div className="workflow-stage-switch">
                      <span>需要校验</span>
                      <Switch
                        checked={selectedWorkflowStage.requiresValidation}
                        onChange={(checked) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            requiresValidation: checked,
                          })
                        }
                      />
                    </div>
                    <div className="workflow-stage-switch">
                      <span>需要打包</span>
                      <Switch
                        checked={selectedWorkflowStage.triggersPackage}
                        onChange={(checked) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            triggersPackage: checked,
                          })
                        }
                      />
                    </div>
                    <div className="workflow-stage-switch">
                      <span>合并节点</span>
                      <Switch
                        checked={selectedWorkflowStage.isMerged}
                        onChange={(checked) =>
                          handleWorkflowStageChange(selectedWorkflowStage.localId, {
                            isMerged: checked,
                          })
                        }
                      />
                    </div>
                  </div>

                  {selectedWorkflowStage.requiresFileUpload ? (
                    <div className="workflow-stage-file-rules">
                      <div className="workflow-stage-file-rules__header">
                        <Typography.Text strong>文件规则</Typography.Text>
                        <Button
                          size="small"
                          type="dashed"
                          onClick={() => handleAddWorkflowFileRule(selectedWorkflowStage.localId)}
                        >
                          新增规则
                        </Button>
                      </div>

                      {selectedWorkflowStage.fileRules.length === 0 ? (
                        <div className="workflow-stage-file-rules__empty">
                          <Typography.Text type="secondary">
                            当前节点已开启上传文件，请至少新增一条文件规则。
                          </Typography.Text>
                        </div>
                      ) : (
                        <div className="workflow-stage-file-rule-list">
                          {selectedWorkflowStage.fileRules.map((rule, index) => (
                            <div
                              key={rule.id ?? `${selectedWorkflowStage.localId}-${index}`}
                              className="workflow-stage-file-rule-card"
                            >
                              <div className="workflow-stage-file-rule-card__header">
                                <Space size={12}>
                                  <Typography.Text strong>
                                    规则 {index + 1}
                                  </Typography.Text>
                                  <Space size={8}>
                                    <Typography.Text type="secondary">
                                      是否必填：
                                    </Typography.Text>
                                    <Switch
                                      size="small"
                                      checked={rule.required}
                                      onChange={(checked) =>
                                        handleWorkflowFileRuleChange(
                                          selectedWorkflowStage.localId,
                                          index,
                                          { required: checked },
                                        )}
                                    />
                                  </Space>
                                </Space>
                                <Button
                                  size="small"
                                  danger
                                  type="text"
                                  onClick={() =>
                                    handleRemoveWorkflowFileRule(
                                      selectedWorkflowStage.localId,
                                      index,
                                    )}
                                >
                                  删除
                                </Button>
                              </div>

                              <div className="workflow-stage-field-grid">
                                <label className="workflow-stage-field">
                                  <span>文件名称</span>
                                  <Input
                                    value={rule.itemName}
                                    placeholder="例如：教案文件"
                                    onChange={(event) =>
                                      handleWorkflowFileRuleChange(
                                        selectedWorkflowStage.localId,
                                        index,
                                        { itemName: event.target.value },
                                      )}
                                  />
                                </label>
                                <label className="workflow-stage-field">
                                  <span>文件类型</span>
                                  <Input
                                    value={rule.fileCategory}
                                    placeholder="例如：txt"
                                    onChange={(event) =>
                                      handleWorkflowFileRuleChange(
                                        selectedWorkflowStage.localId,
                                        index,
                                        { fileCategory: event.target.value },
                                      )}
                                  />
                                </label>
                              </div>

                              <div className="workflow-stage-field-grid">
                                <label className="workflow-stage-field">
                                  <span>文件数量</span>
                                  <InputNumber
                                    min={1}
                                    style={{ width: '100%' }}
                                    value={rule.requiredCount}
                                    onChange={(value) =>
                                      handleWorkflowFileRuleChange(
                                        selectedWorkflowStage.localId,
                                        index,
                                        {
                                          requiredCount:
                                            typeof value === 'number' ? value : 1,
                                        },
                                      )}
                                  />
                                </label>
                                <label className="workflow-stage-field">
                                  <span>文件名规则</span>
                                  <Input value={rule.filenamePattern} disabled />
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </Space>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="先点击新增节点，在画布里生成节点框，再点中它开始配置"
                />
              )}
            </aside>
          </div>
        </div>
      </Modal>

      <ProjectFieldConfigDrawer
        open={fieldConfigDrawerOpen}
        project={selectedProject}
        onClose={() => {
          setFieldConfigDrawerOpen(false)
          setSelectedProject(null)
        }}
      />
    </Card>
  )
}
