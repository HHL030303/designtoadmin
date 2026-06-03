import { useEffect, useMemo, useState } from 'react'
import {
    Button,
    Card,
    Descriptions,
    Empty,
    Form,
    InputNumber,
    Modal,
    Select,
    Space,
    Tag,
    Typography,
    message,
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useAppState } from '../../context/AppStateContext'
import { adminService } from '../../services/adminService'
import { fileService } from '../../services/fileService'
import { taskService } from '../../services/taskService'
import { AttachmentList } from '../common/AttachmentList'
import { ObjectStorageUploadField } from '../common/ObjectStorageUploadField'
import type {
    AttachmentFile,
    FieldConfig,
    ProjectMemberRecord,
    TaskDetailRecord,
    TaskWorkflowFileRuleRecord,
    TaskWorkflowStageRecord,
    UserRole,
} from '../../types'

type StageCompletionFormValues = {
    remark?: string
    nextStageDueDays?: number
    nextStageUserId?: string
}

type CurrentAssigneeFormValues = {
    dueDays?: number
    userId?: string
}

const taskStatusMeta: Record<string, { color: string; label: string }> = {
    archived: { color: 'green', label: '已归档' },
    assigned: { color: 'blue', label: '已指派' },
    completed: { color: 'green', label: '已完成' },
    in_progress: { color: 'processing', label: '进行中' },
    page_in_progress: { color: 'cyan', label: '内页制作中' },
    pending: { color: 'default', label: '待开始' },
    submitted: { color: 'orange', label: '待处理' },
    unpublished: { color: 'default', label: '未发布' },
}

const roleLabelMap: Record<UserRole, string> = {
    admin: '管理员',
    coordinator: '设计统筹',
    pageDesigner: '内页设计师',
    planner: '计划员',
    researcher: '教研老师',
    sales: '售前人员',
    styleDesigner: '风格稿设计师',
    designcooperation:"荆门商务（统筹）",
    design:"设计师",
    wuhan_design_cooperation:"武汉商务",
    customer_planner:"商务",
    presales:"售前",
    operation:"运营"
}

const preferredSummaryFieldKeys = [
    'series',
    'subject',
    'educationStage',
    'grade',
    'volume',
    'textbook',
    'chapterName',
    'orderType',
    'researchOwner',
    'researchDueDate',
    'finalDueDate',
]

function getStatusLabel(status: string) {
    return taskStatusMeta[status]?.label ?? status
}

function getStatusColor(status: string) {
    return taskStatusMeta[status]?.color ?? 'default'
}

function isActionableStageStatus(status: string) {
    return ['assigned', 'in_progress', 'page_in_progress', 'pending', 'submitted'].includes(status)
}

function formatDisplayValue(value: unknown, field?: FieldConfig): string {
    if (value === null || value === undefined || value === '') {
        return '未填写'
    }

    if (field?.field_type === 'boolean' && typeof value === 'boolean') {
        const matchedLabel = field.option_config?.find((option) => {
            const normalized = String(option.value).trim().toLowerCase()
            return (
                (normalized === 'true' || normalized === '是' || normalized === '有') === value
            )
        })?.label

        return matchedLabel ?? (value ? '是' : '否')
    }

    return String(value)
}

function buildFieldMap(fieldConfigs: FieldConfig[]) {
    return new Map(fieldConfigs.map((field) => [field.field_key, field]))
}

function buildSummaryRows(
    detail: TaskDetailRecord,
    fieldConfigs: FieldConfig[],
): Array<{ key: string; label: string; value: string }> {
    const fieldMap = buildFieldMap(fieldConfigs)
    const configuredRows = preferredSummaryFieldKeys
        .filter((fieldKey) => detail.fieldValues[fieldKey] !== undefined)
        .map((fieldKey) => {
            const field = fieldMap.get(fieldKey)
            return {
                key: fieldKey,
                label: field?.field_name ?? fieldKey,
                value: formatDisplayValue(detail.fieldValues[fieldKey], field),
            }
        })

    return [
        { key: 'taskId', label: '任务 ID', value: detail.task.id },
        { key: 'version', label: '当前版本', value: detail.currentVersion.versionNo },
        { key: 'taskStatus', label: '任务状态', value: getStatusLabel(detail.task.status) },
        { key: 'createdAt', label: '创建时间', value: detail.task.createdAt },
        {
            key: 'expectCompleteAt',
            label: '预计交付',
            value: detail.currentVersion.expectCompleteAt || '未填写',
        },
        ...configuredRows,
    ]
}

function getRoleLabelByCode(
    roleCode: string | undefined,
    roleLabelsByCode: Record<string, string>,
) {
    if (!roleCode) {
        return '未配置'
    }

    return roleLabelsByCode[roleCode] ?? roleCode
}

function buildAssigneeText(stage: TaskWorkflowStageRecord) {
    if (stage.stageAssignees.length === 0) {
        return '未指派'
    }

    return stage.stageAssignees
        .map((assignee) => `${assignee.userName}${assignee.isPrimary ? '（主）' : ''}`)
        .join('、')
}

function isStageMatchedToRole(stage: TaskWorkflowStageRecord, currentUserId?: string) {
    if (!currentUserId) {
        return false
    }

    return stage.stageAssignees.some((assignee) => assignee.userId === currentUserId)
}

function findRoleDisplayStage(
    stages: TaskWorkflowStageRecord[],
    files: AttachmentFile[],
    currentUserId: string | undefined,
    currentStageId?: string,
) {
    const matchedStages = stages.filter((stage) => isStageMatchedToRole(stage, currentUserId))

    if (matchedStages.length === 0) {
        return null
    }

    if (currentStageId) {
        const currentMatchedStage = matchedStages.find((stage) => stage.id === currentStageId)
        if (currentMatchedStage) {
            return currentMatchedStage
        }
    }

    const stageIdsWithFiles = new Set(
        files
            .map((file) => file.workflowStageId)
            .filter((workflowStageId): workflowStageId is string => Boolean(workflowStageId)),
    )
    const readonlyFilledStage = [...matchedStages]
        .reverse()
        .find((stage) => stageIdsWithFiles.has(stage.id))

    if (readonlyFilledStage) {
        return readonlyFilledStage
    }

    const completedStage = matchedStages.find(
        (stage) => stage.status === 'completed' || stage.status === 'archived',
    )

    return completedStage ?? matchedStages[0]
}

function findCurrentWorkflowStageIndex(stages: TaskWorkflowStageRecord[]) {
    const currentIndex = stages.findIndex((stage) => isActionableStageStatus(stage.status))

    if (currentIndex >= 0) {
        return currentIndex
    }

    const completedCount = stages.filter(
        (stage) => stage.status === 'completed' || stage.status === 'archived',
    ).length

    return completedCount > 0 ? completedCount - 1 : 0
}

function resolveCurrentWorkflowStage(detail: TaskDetailRecord) {
    const currentStageId = detail.currentStage?.id

    if (!currentStageId) {
        return detail.currentStage ?? null
    }

    return detail.workflowStages.find((stage) => stage.id === currentStageId) ?? detail.currentStage
}

function renderWorkflowSteps(
    stages: TaskWorkflowStageRecord[],
    roleLabelsByCode: Record<string, string>,
) {
    const currentStageIndex = findCurrentWorkflowStageIndex(stages)

    return (
        <div className="task-workflow-strip">
            {stages.map((stage, index) => {
                const stateClassName =
                    stage.status === 'completed' || stage.status === 'archived'
                        ? 'task-workflow-strip__item--done'
                        : index === currentStageIndex
                            ? 'task-workflow-strip__item--active'
                            : index < currentStageIndex
                                ? 'task-workflow-strip__item--done'
                                : 'task-workflow-strip__item--pending'

                return (
                    <div
                        key={stage.id}
                        className={`task-workflow-strip__item ${stateClassName}`}
                    >
                        <div className="task-workflow-strip__line" />
                        <div className="task-workflow-strip__head">
                            <span className="task-workflow-strip__index">{index + 1}</span>
                            <Typography.Text strong>{stage.stageName}</Typography.Text>
                        </div>
                        <Space direction="vertical" size={4} className="task-workflow-step__meta">
                            <Tag color={getStatusColor(stage.status)}>{getStatusLabel(stage.status)}</Tag>
                            <Typography.Text type="secondary">
                                执行人：{buildAssigneeText(stage)}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                                截止：{stage.dueDate || '未配置'}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                                角色：
                                {getRoleLabelByCode(
                                    stage.operatorRoleCode,
                                    roleLabelsByCode,
                                )}
                            </Typography.Text>
                        </Space>
                    </div>
                )
            })}
        </div>
    )
}

function buildEmptyFilesByRuleId(fileRules: TaskWorkflowFileRuleRecord[]) {
    return fileRules.reduce<Record<string, AttachmentFile[]>>((accumulator, rule) => {
        accumulator[rule.id] = []
        return accumulator
    }, {})
}

function isAttachmentMatchedToRule(
    file: AttachmentFile,
    rule: TaskWorkflowFileRuleRecord,
) {
    const fileName = file.name.trim()
    const fileExt = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : ''
    const fileType = file.type?.trim().toLowerCase() ?? ''
    const ruleCategories = rule.fileCategory
        .split(/[,|，、\s]+/)
        .map((category) => category.trim().toLowerCase())
        .filter(Boolean)

    const extensionMatched =
        ruleCategories.length === 0 ||
        ruleCategories.some((category) => {
            const normalizedCategory = category.startsWith('.') ? category.slice(1) : category

            if (normalizedCategory.includes('/')) {
                return (
                    fileType === normalizedCategory ||
                    fileExt === normalizedCategory.split('/').pop()
                )
            }

            return fileExt === normalizedCategory
        })

    if (!extensionMatched) {
        return false
    }

    if (!rule.filenamePattern) {
        return true
    }

    try {
        return new RegExp(rule.filenamePattern).test(fileName)
    } catch {
        return true
    }
}

function buildInitialFilesByRuleId(
    fileRules: TaskWorkflowFileRuleRecord[],
    files: AttachmentFile[],
    workflowStageId: string,
) {
    const currentStageFiles = files.filter((file) => file.workflowStageId === workflowStageId)
    const usedFileUids = new Set<string>()

    const filesByRuleId = fileRules.reduce<Record<string, AttachmentFile[]>>((accumulator, rule) => {
        const matchedFiles = currentStageFiles
            .filter((file) => !usedFileUids.has(file.uid) && isAttachmentMatchedToRule(file, rule))
            .slice(0, rule.requiredCount)

        matchedFiles.forEach((file) => usedFileUids.add(file.uid))
        accumulator[rule.id] = matchedFiles
        return accumulator
    }, {})

    const remainingFiles = currentStageFiles.filter((file) => !usedFileUids.has(file.uid))

    for (const file of remainingFiles) {
        const fallbackRule = fileRules.find((rule) => {
            const currentCount = filesByRuleId[rule.id]?.length ?? 0
            return currentCount < rule.requiredCount
        })

        if (!fallbackRule) {
            break
        }

        filesByRuleId[fallbackRule.id] = [...(filesByRuleId[fallbackRule.id] ?? []), file]
    }

    return filesByRuleId
}

function DynamicFileRuleSection({
    fileRules,
    filesByRuleId,
    beforeUpload,
    onFilesChange,
    onFileUploaded,
    onFileDeleted,
    taskId,
    disabled,
}: {
    fileRules: TaskWorkflowFileRuleRecord[]
    filesByRuleId: Record<string, AttachmentFile[]>
    beforeUpload: Parameters<typeof ObjectStorageUploadField>[0]['beforeUpload']
    onFilesChange: (ruleId: string, files: AttachmentFile[]) => void
    onFileUploaded: (file: AttachmentFile) => Promise<AttachmentFile>
    onFileDeleted: (file: AttachmentFile) => Promise<void>
    taskId?: string
    disabled?: boolean
}) {
    return (
        <Space direction="vertical" size={12} className="panel-stack-full">
            {fileRules.map((rule) => (
                <Card key={rule.id} type="inner" className="task-detail-action-card">
                    <Space direction="vertical" size={8} className="panel-stack-full">
                        <Space size={8} wrap>
                            <Typography.Text strong>{rule.itemName}</Typography.Text>
                            <Tag color={rule.required ? 'red' : 'default'}>
                                {rule.required ? '必传' : '选传'}
                            </Tag>
                            <Tag>{rule.fileCategory}</Tag>
                            <Tag>{`数量 ${rule.requiredCount}`}</Tag>
                        </Space>
                        {disabled ? (
                            <AttachmentList
                                files={filesByRuleId[rule.id] ?? []}
                                compact
                                emptyText="暂无阶段文件"
                                groupFolders
                            />
                        ) : (
                            <ObjectStorageUploadField
                                value={filesByRuleId[rule.id] ?? []}
                                beforeUpload={beforeUpload}
                                onChange={(files) => onFilesChange(rule.id, files)}
                                onUploaded={onFileUploaded}
                                onDelete={onFileDeleted}
                                taskId={taskId}
                                accept={`.${rule.fileCategory}`}
                                fileNamePattern={rule.filenamePattern}
                                maxCount={rule.requiredCount}
                                helperText={`命名规则：${rule.filenamePattern}；最多上传 ${rule.requiredCount} 个文件。`}
                                compact
                                disabled={disabled}
                            />
                        )}
                    </Space>
                </Card>
            ))}
        </Space>
    )
}

function RoleTaskCard({
    detail,
    role,
    roleLabelsByCode,
    onStageCompleted,
    taskOwnerId,
}: {
    detail: TaskDetailRecord
    role: UserRole
    roleLabelsByCode: Record<string, string>
    onStageCompleted: () => Promise<void>
    taskOwnerId?: string
}) {
    const { currentProject, currentUser } = useAppState()
    const [form] = Form.useForm<StageCompletionFormValues>()
    const [currentAssigneeForm] = Form.useForm<CurrentAssigneeFormValues>()
    const [submitting, setSubmitting] = useState(false)
    const [nextStageLoading, setNextStageLoading] = useState(false)
    const [nextStageMembers, setNextStageMembers] = useState<ProjectMemberRecord[]>([])
    const [currentAssigneeLoading, setCurrentAssigneeLoading] = useState(false)
    const [currentAssigneeSubmitting, setCurrentAssigneeSubmitting] = useState(false)
    const [currentAssigneeModalOpen, setCurrentAssigneeModalOpen] = useState(false)
    const [currentAssigneeMembers, setCurrentAssigneeMembers] = useState<ProjectMemberRecord[]>([])
    const [filesByRuleId, setFilesByRuleId] = useState<Record<string, AttachmentFile[]>>({})
    const currentStage = detail.currentStage ?? null
    const currentWorkflowStage = useMemo(() => resolveCurrentWorkflowStage(detail), [detail])
    const displayStage = useMemo(
        () =>
            findRoleDisplayStage(
                detail.workflowStages,
                detail.files,
                currentUser?.id,
                currentStage?.id,
            ),
        [currentStage?.id, currentUser?.id, detail.files, detail.workflowStages],
    )
    const currentStageBelongsToRole = Boolean(
        currentStage &&
        currentUser?.id &&
        currentStage.stageAssignees.some((assignee) => assignee.userId === currentUser.id),
    )
    const displayStageFiles = useMemo(
        () => detail.files.filter((file) => file.workflowStageId === displayStage?.id),
        [detail.files, displayStage?.id],
    )

    const nextStage = detail.nextState
        ? detail.workflowStages.find((stage) => stage.id === detail.nextState?.id)
        : undefined
    const canCompleteCurrentStage = Boolean(
        currentStage &&
        displayStage &&
        currentStage.id === displayStage.id &&
        currentStageBelongsToRole &&
        nextStage &&
        isActionableStageStatus(currentStage.status)
    )
    const isReadonlyStage = Boolean(displayStage && !canCompleteCurrentStage)
    const shouldSelectNextStageAssignee = Boolean(
        canCompleteCurrentStage &&
        displayStage?.canAssign &&
        nextStage,
    )

    useEffect(() => {
        if (!displayStage) {
            setFilesByRuleId({})
            return
        }

        setFilesByRuleId(
            displayStage.fileRules.length > 0
                ? buildInitialFilesByRuleId(
                    displayStage.fileRules,
                    detail.files,
                    displayStage.id,
                )
                : buildEmptyFilesByRuleId(displayStage.fileRules),
        )
        form.resetFields()
    }, [detail.files, displayStage, form])

    useEffect(() => {
        const projectId = currentProject?.id ?? ''
        const nextStage = detail.nextState
        ? detail.workflowStages.find((stage) => stage.id === detail.nextState?.id)
        : undefined
        const nextRoleCode = nextStage?.operatorRoleCode ?? ''

        if (!shouldSelectNextStageAssignee || !projectId || !nextRoleCode) {
            setNextStageMembers([])
            return
        }

        form.setFieldValue('nextStageUserId', undefined)

        async function loadNextStageMembers() {
            try {
                setNextStageLoading(true)
                const response = await adminService.listProjectRoleUsers({
                    page: 1,
                    pageSize: 100,
                    projectId,
                    roleCode: nextRoleCode,
                })
                setNextStageMembers(response.items)
            } catch (error) {
                message.error(error instanceof Error ? error.message : '下一节点成员加载失败')
                setNextStageMembers([])
            } finally {
                setNextStageLoading(false)
            }
        }

        void loadNextStageMembers()
    }, [currentProject?.id, form, nextStage?.operatorRoleCode, shouldSelectNextStageAssignee])

    if (!currentStage && !displayStage) {
        return (
            <Card title={`${roleLabelMap[role]}详情`}>
                <Empty
                    description="当前任务暂无 current_stage，无法展示当前阶段任务"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </Card>
        )
    }

    if (!displayStage) {
        return (
            <Card title={`${roleLabelMap[role]}详情`}>
                <Empty
                    description="当前角色在该任务中暂无独立节点配置"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </Card>
        )
    }

    const resolvedTaskOwnerId = detail.task.ownerId ?? taskOwnerId
    const currentRoleCode = currentWorkflowStage?.operatorRoleCode ?? ''
    const currentPrimaryAssignee = currentWorkflowStage?.stageAssignees.find((assignee) => assignee.isPrimary)
        ?? currentWorkflowStage?.stageAssignees[0]
    const canEditCurrentAssignee = Boolean(currentWorkflowStage?.id && currentRoleCode && currentProject?.id)
    const currentAssigneeOptions = (currentWorkflowStage?.stageAssignees ?? []).map((assignee) => ({
        label: `${assignee.userName}${assignee.isPrimary ? '（主）' : ''}`,
        value: assignee.userId,
    }))

    const handleBeforeFileUpload = async ({
        checksum,
        file,
        originalPath,
    }: {
        checksum: string
        file: File
        originalPath?: string
    }) => {
        if (!currentStage) {
            throw new Error('当前阶段信息缺失，暂时无法校验重复文件')
        }

        const duplicateResult = await fileService.checkFileDuplicate({
            checksum,
            original_name: file.name,
            original_path: originalPath,
            task_id: Number(detail.task.id),
            version_id: Number(detail.currentVersion.id),
        })

        if (duplicateResult.checksum_exists) {
            const existingFile = duplicateResult.checksum_file

            if (!existingFile?.file_path) {
                throw new Error('查重命中已上传文件，但接口未返回可复用的文件路径')
            }

            // 命中相同 checksum 时直接复用已上传文件，避免重复占用对象存储空间。
            message.info(`文件“${file.name}”已上传过，本次将直接登记，不再重复上传`)

            return {
                file: {
                    filePath: existingFile.file_path,
                    fileUrl: existingFile.file_url ?? existingFile.file_path,
                    storageKey: existingFile.file_path,
                },
                mode: 'register_only' as const,
            }
        }

        if (!duplicateResult.same_name_exists) {
            return { mode: 'upload' as const }
        }

        const shouldContinueUpload = await new Promise<boolean>((resolve) => {
            Modal.confirm({
                cancelText: '取消',
                content: `当前已存在重名文件“${file.name}”，继续上传将会覆盖，是否继续？`,
                okText: '继续上传',
                onCancel: () => resolve(false),
                onOk: () => resolve(true),
                title: '发现重名文件',
            })
        })

        return shouldContinueUpload
            ? {
                mode: 'upload' as const,
                replaceDisplay: {
                    fileRecordId:
                        duplicateResult.same_name_file?.id !== undefined &&
                        duplicateResult.same_name_file?.id !== null
                            ? String(duplicateResult.same_name_file.id)
                            : undefined,
                    name: duplicateResult.same_name_file?.original_name ?? file.name,
                    originalPath: duplicateResult.same_name_file?.original_path ?? originalPath,
                },
            }
            : { mode: 'abort' as const }
    }

    async function handleFileUploaded(file: AttachmentFile) {
        if (!currentStage || !file.checksum) {
            throw new Error(`文件 ${file.name} 缺少登记所需信息`)
        }

        const created = await fileService.createFileRecord({
            checksum: file.checksum,
            file_ext: file.fileExt || '',
            file_path: file.storageKey || file.url || '',
            original_name: file.name,
            original_path: file.originalPath,
            size_bytes: file.size ?? 0,
            task_id: Number(detail.task.id),
            version_id: Number(detail.currentVersion.id),
            workflow_stage_id: Number(currentStage.id),
        })

        return {
            ...file,
            fileRecordId:
                created?.file?.id !== undefined && created?.file?.id !== null
                    ? String(created.file.id)
                    : undefined,
            versionId: detail.currentVersion.id,
        }
    }

    async function handleFileDeleted(file: AttachmentFile) {
        if (!file.fileRecordId) {
            return
        }

        await fileService.deleteFileRecord(
            file.fileRecordId,
            Number(file.versionId ?? detail.currentVersion.id),
        )
    }

    async function handleOpenCurrentAssigneeModal() {
        if (!currentWorkflowStage?.id || !currentProject?.id || !currentRoleCode) {
            message.warning('当前阶段缺少角色配置，暂时无法编辑责任人')
            return
        }

        currentAssigneeForm.setFieldsValue({
            dueDays: currentWorkflowStage.dueDays,
            userId: currentPrimaryAssignee?.userId,
        })
        setCurrentAssigneeModalOpen(true)

        try {
            setCurrentAssigneeLoading(true)
            const response = await adminService.listProjectRoleUsers({
                page: 1,
                pageSize: 100,
                projectId: currentProject.id,
                roleCode: currentRoleCode,
            })
            setCurrentAssigneeMembers(response.items)
        } catch (error) {
            message.error(error instanceof Error ? error.message : '当前责任人候选人加载失败')
            setCurrentAssigneeMembers([])
        } finally {
            setCurrentAssigneeLoading(false)
        }
    }

    function handleCloseCurrentAssigneeModal() {
        setCurrentAssigneeModalOpen(false)
        currentAssigneeForm.resetFields()
    }

    async function handleSubmitCurrentAssignee(values: CurrentAssigneeFormValues) {
        if (!currentWorkflowStage?.id) {
            return
        }

        if (!values.userId) {
            message.warning('请选择当前责任人')
            return
        }

        try {
            setCurrentAssigneeSubmitting(true)
            await taskService.assignWorkflowStage(currentWorkflowStage.id, {
                due_days:
                    typeof values.dueDays === 'number'
                        ? values.dueDays
                        : undefined,
                assignees: [
                    {
                        user_id: Number(values.userId),
                        assignee_role: 'operator',
                        is_primary: true,
                    },
                ],
            })
            message.success('当前责任人已更新')
            handleCloseCurrentAssigneeModal()
            await onStageCompleted()
        } catch (error) {
            message.error(error instanceof Error ? error.message : '当前责任人更新失败')
        } finally {
            setCurrentAssigneeSubmitting(false)
        }
    }

    async function handleSubmit(values: StageCompletionFormValues) {
        if (!currentStage || !displayStage || !nextStage) {
            return
        }

        const invalidRule = displayStage.fileRules.find((rule) => {
            if (!rule.required) {
                return false
            }

            return (filesByRuleId[rule.id] ?? []).length < rule.requiredCount
        })

        if (invalidRule) {
            message.warning(`请先按要求上传 ${invalidRule.itemName}`)
            return
        }

        const nextStageUserId = displayStage.canAssign
            ? values.nextStageUserId
            : resolvedTaskOwnerId

        if (!nextStageUserId) {
            message.warning(
                displayStage.canAssign
                    ? '请选择下一节点人员'
                    : '当前任务未配置任务所有者，无法自动指定下一节点人员',
            )
            return
        }

        try {
            setSubmitting(true)

            await taskService.completeWorkflowStage(currentStage.id, {
                remark: values.remark?.trim() || undefined,
                next_stage_assignees: [
                    {
                        assignee_role: 'operator',
                        is_primary: true,
                        user_id: Number(nextStageUserId),
                    },
                ],
                due_days:
                    typeof values.nextStageDueDays === 'number'
                        ? values.nextStageDueDays
                        : undefined,
            })
            message.success('当前阶段已提交')
            await onStageCompleted()
        } catch (error) {
            message.error(error instanceof Error ? error.message : '阶段提交失败')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Card
            title={`${roleLabelMap[role]}阶段任务`}
            extra={<Tag color={getStatusColor(displayStage.status)}>{getStatusLabel(displayStage.status)}</Tag>}
        >
            <Descriptions column={{ xs: 1, md: 2 }} size="small" className="panel-descriptions">
                <Descriptions.Item label="当前节点">{displayStage.stageName}</Descriptions.Item>
                <Descriptions.Item label="当前责任人">
                    <Space size={8}>
                        <Select
                            className="task-detail-owner-select"
                            disabled
                            value={currentPrimaryAssignee?.userId}
                            options={currentAssigneeOptions}
                            placeholder="未指派当前责任人"
                        />
                        <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => void handleOpenCurrentAssigneeModal()}
                            disabled={!canEditCurrentAssignee}
                        />
                    </Space>
                </Descriptions.Item>
                <Descriptions.Item label="截止时间">
                    {displayStage.dueDate || '未配置'}
                </Descriptions.Item>
                <Descriptions.Item label="下一节点">
                    {nextStage
                        ? getRoleLabelByCode(
                            nextStage.operatorRoleCode,
                            roleLabelsByCode,
                        )
                        : '当前已是最后节点'}
                </Descriptions.Item>
            </Descriptions>

            <Space direction="vertical" size={16} className="panel-stack-full">
                {!currentStageBelongsToRole && currentStage ? (
                    <Typography.Text type="secondary">
                        当前任务正处于“{currentStage.stageName}”节点，你当前查看的是自己节点的只读回填内容。
                    </Typography.Text>
                ) : null}
                {displayStage.fileRules.length > 0 ? (
                    <div className="task-detail-section">
                        <Typography.Text strong>按流程规则上传文件</Typography.Text>
                        <Typography.Text type="secondary">
                            {isReadonlyStage
                                ? '该阶段已提交，当前内容按详情接口返回数据回填，只读展示。'
                                : '当前节点上传项来自工作流 `file_rules`，提交前会校验必传文件是否齐全。'}
                        </Typography.Text>
                        <DynamicFileRuleSection
                            beforeUpload={handleBeforeFileUpload}
                            fileRules={displayStage.fileRules}
                            filesByRuleId={filesByRuleId}
                            onFileUploaded={handleFileUploaded}
                            onFileDeleted={handleFileDeleted}
                            taskId={detail.currentVersion.id ? String(detail.currentVersion.id) : undefined}
                            onFilesChange={(ruleId, files) =>
                                setFilesByRuleId((current) => ({
                                    ...current,
                                    [ruleId]: files,
                                }))
                            }
                            disabled={isReadonlyStage || submitting}
                        />
                    </div>
                ) : displayStageFiles.length > 0 ? (
                    <div className="task-detail-section">
                        <Typography.Text strong>阶段已上传文件</Typography.Text>
                        <Typography.Text type="secondary">
                            当前阶段没有可匹配的 `file_rules`，已按接口原始文件列表只读展示。
                        </Typography.Text>
                        <AttachmentList
                            files={displayStageFiles}
                            compact
                            emptyText="暂无阶段文件"
                            groupFolders
                        />
                    </div>
                ) : null}

                <Card type="inner" className="task-detail-action-card">
                    <Space direction="vertical" size={8} className="panel-stack-full">
                        <Typography.Text strong>阶段提交流转</Typography.Text>
                        {isReadonlyStage ? (
                            <Typography.Text type="secondary">
                                当前任务在该阶段已提交，或当前账号不是 current_stage 对应处理角色，当前仅展示该节点的历史回填信息。
                            </Typography.Text>
                        ) : !nextStage ? (
                            <Typography.Text type="secondary">
                                当前节点已经是最后一个流程节点，暂无下一阶段可流转。
                            </Typography.Text>
                        ) : (
                            <>
                                <Typography.Text type="secondary">
                                    提交后会按当前节点配置，把任务流转到下一阶段并指定执行人。
                                </Typography.Text>
                                <Descriptions column={1} size="small">
                                    <Descriptions.Item label="下一节点角色">
                                        {getRoleLabelByCode(
                                            nextStage.operatorRoleCode,
                                            roleLabelsByCode,
                                        )}
                                </Descriptions.Item>
                                    <Descriptions.Item label="指派方式">
                                        {displayStage.canAssign
                                            ? '当前节点手动指定下一节点人员'
                                            : '自动指定为当前任务所有者'}
                                    </Descriptions.Item>
                                </Descriptions>
                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={(values) => void handleSubmit(values)}
                                >
                                    {displayStage.canAssign ? (
                                        <Form.Item
                                            label="下一阶段任务人员"
                                            name="nextStageUserId"
                                            rules={[{ required: true, message: '请选择下一阶段任务人员' }]}
                                        >
                                            <Select
                                                placeholder="请选择下一阶段任务人员"
                                                loading={nextStageLoading}
                                                options={nextStageMembers.map((member) => ({
                                                    label: `${member.userName} · ${member.userEmail}`,
                                                    value: member.userId,
                                                }))}
                                            />
                                        </Form.Item>
                                    ) : null}
                                    <Form.Item
                                        label={`预期完成天数`}
                                        name="nextStageDueDays"
                                        rules={[{ required: true, message: '请输入预期完成天数' }]}
                                    >
                                        <InputNumber
                                            className="full-width-control"
                                            min={1}
                                            precision={0}
                                            placeholder="请输入预期完成天数"
                                        />
                                    </Form.Item>
                                    {/* <Form.Item label="备注" name="remark">
                                        <Input.TextArea
                                            placeholder="可选填写阶段备注，如上一阶段已完成"
                                            rows={3}
                                        />
                                    </Form.Item> */}
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={submitting}
                                        disabled={!canCompleteCurrentStage}
                                    >
                                        提交到下一阶段
                                    </Button>
                                </Form>
                            </>
                        )}
                    </Space>
                </Card>
            </Space>
            <Modal
                title="编辑当前责任人"
                open={currentAssigneeModalOpen}
                onCancel={handleCloseCurrentAssigneeModal}
                onOk={() => void currentAssigneeForm.submit()}
                confirmLoading={currentAssigneeSubmitting}
                destroyOnClose
            >
                <Form
                    form={currentAssigneeForm}
                    layout="vertical"
                    onFinish={(values) => void handleSubmitCurrentAssignee(values)}
                >
                    <Form.Item
                        label="当前责任人"
                        name="userId"
                        rules={[{ required: true, message: '请选择当前责任人' }]}
                    >
                        <Select
                            placeholder="请选择当前责任人"
                            loading={currentAssigneeLoading}
                            options={currentAssigneeMembers.map((member) => ({
                                label: `${member.userName} · ${member.userEmail}`,
                                value: member.userId,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        label="预期完成天数"
                        name="dueDays"
                        rules={[
                            { required: true, message: '请输入预期完成天数' },
                        ]}
                    >
                        <InputNumber
                            className="full-width-control"
                            min={1}
                            precision={0}
                            placeholder="请输入预期完成天数"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    )
}

export function TaskDetailPanel({
    detail,
    fieldConfigs,
    role,
    roleLabelsByCode,
    onStageCompleted,
    taskOwnerId,
}: {
    detail: TaskDetailRecord
    fieldConfigs: FieldConfig[]
    role: UserRole
    roleLabelsByCode: Record<string, string>
    onStageCompleted: () => Promise<void>
    taskOwnerId?: string
}) {
    const summaryRows = useMemo(
        () => buildSummaryRows(detail, fieldConfigs),
        [detail, fieldConfigs],
    )
    const shouldShowRoleTaskCard = role !== 'planner'

    return (
        <Space direction="vertical" size={16} className="panel-stack-full">
            <Card
                title={detail.task.title}
                extra={<Tag color={getStatusColor(detail.task.status)}>{getStatusLabel(detail.task.status)}</Tag>}
            >
                <Descriptions column={{ xs: 1, md: 2, xl: 3 }} size="small">
                    {summaryRows.map((row) => (
                        <Descriptions.Item key={row.key} label={row.label}>
                            {row.value}
                        </Descriptions.Item>
                    ))}
                </Descriptions>
            </Card>

            {shouldShowRoleTaskCard ? (
                <RoleTaskCard
                    detail={detail}
                    role={role}
                    roleLabelsByCode={roleLabelsByCode}
                    onStageCompleted={onStageCompleted}
                    taskOwnerId={taskOwnerId}
                />
            ) : null}

            <Card title="流程信息">
                {detail.workflowStages.length === 0 ? (
                    <Empty description="暂无流程节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    renderWorkflowSteps(detail.workflowStages, roleLabelsByCode)
                )}
            </Card>
        </Space>
    )
}
