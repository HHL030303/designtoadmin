import { useEffect, useMemo, useState } from 'react'
import { Card, Descriptions, Empty, Space, Tag, Typography } from 'antd'
import { AttachmentUploadField } from '../common/AttachmentUploadField'
import type {
    AttachmentFile,
    FieldConfig,
    TaskDetailRecord,
    TaskWorkflowFileRuleRecord,
    TaskWorkflowStageRecord,
    UserRole,
} from '../../types'

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

const roleCodeMap: Record<UserRole, string[]> = {
    admin: ['project_admin', 'super_admin'],
    coordinator: ['design_coordinator'],
    pageDesigner: ['page_designer'],
    planner: ['planner'],
    researcher: ['researcher'],
    sales: ['presales'],
    styleDesigner: ['style_designer'],
}

const roleLabelMap: Record<UserRole, string> = {
    admin: '管理员',
    coordinator: '设计统筹',
    pageDesigner: '内页设计师',
    planner: '计划员',
    researcher: '教研老师',
    sales: '售前人员',
    styleDesigner: '风格稿设计师',
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

function buildStageActionSummary(stage: TaskWorkflowStageRecord) {
    const actionLabels: string[] = []

    if (stage.fileRules.length > 0) {
        actionLabels.push(`上传 ${stage.fileRules.map((rule) => rule.itemName).join('、')}`)
    }

    if (stage.canAssign) {
        actionLabels.push('指定下一节点人员')
    }

    if (stage.allowPageAssignment) {
        actionLabels.push('拆分页数')
    }

    if (stage.requiresValidation) {
        actionLabels.push('校验结果')
    }

    if (stage.triggersPackage) {
        actionLabels.push('触发打包')
    }

    return actionLabels.length > 0 ? actionLabels.join(' / ') : '本节点暂无额外动作'
}

function buildAssigneeText(stage: TaskWorkflowStageRecord) {
    if (stage.stageAssignees.length === 0) {
        return '未指派'
    }

    return stage.stageAssignees
        .map((assignee) => `${assignee.userName}${assignee.isPrimary ? '（主）' : ''}`)
        .join('、')
}

function isStageMatchedToRole(stage: TaskWorkflowStageRecord, role: UserRole) {
    const roleCodes = roleCodeMap[role]
    return roleCodes.includes(stage.operatorRoleCode ?? '') || roleCodes.includes(stage.ownerRoleCode ?? '')
}

function findCurrentRoleStage(stages: TaskWorkflowStageRecord[], role: UserRole) {
    const matchedStages = stages.filter((stage) => isStageMatchedToRole(stage, role))

    if (matchedStages.length === 0) {
        return null
    }

    const actionableStage = matchedStages.find((stage) =>
        ['assigned', 'in_progress', 'page_in_progress', 'pending', 'submitted'].includes(stage.status),
    )

    return actionableStage ?? matchedStages[0]
}

function renderWorkflowStage(
    stage: TaskWorkflowStageRecord,
    roleLabelsByCode: Record<string, string>,
) {
    return (
        <Card
            key={stage.id}
            type="inner"
            className="task-detail-stage-card"
            title={stage.stageName}
            extra={<Tag color={getStatusColor(stage.status)}>{getStatusLabel(stage.status)}</Tag>}
        >
            <Descriptions column={{ xs: 1, md: 2 }} size="small">
                <Descriptions.Item label="执行角色">
                    {getRoleLabelByCode(stage.operatorRoleCode || stage.ownerRoleCode, roleLabelsByCode)}
                </Descriptions.Item>
                <Descriptions.Item label="执行人">{buildAssigneeText(stage)}</Descriptions.Item>
                <Descriptions.Item label="截止时间">
                    {stage.dueDate || '未配置'}
                </Descriptions.Item>
                <Descriptions.Item label="阶段任务">
                    {buildStageActionSummary(stage)}
                </Descriptions.Item>
            </Descriptions>
        </Card>
    )
}

function DynamicFileRuleSection({
    fileRules,
}: {
    fileRules: TaskWorkflowFileRuleRecord[]
}) {
    const [filesByRuleId, setFilesByRuleId] = useState<Record<string, AttachmentFile[]>>({})

    useEffect(() => {
        setFilesByRuleId(
            fileRules.reduce<Record<string, AttachmentFile[]>>((accumulator, rule) => {
                accumulator[rule.id] = []
                return accumulator
            }, {}),
        )
    }, [fileRules])

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
                        <AttachmentUploadField
                            value={filesByRuleId[rule.id] ?? []}
                            onChange={(files) =>
                                setFilesByRuleId((current) => ({
                                    ...current,
                                    [rule.id]: files,
                                }))
                            }
                            helperText={`命名规则：${rule.filenamePattern}`}
                            compact
                        />
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
}: {
    detail: TaskDetailRecord
    role: UserRole
    roleLabelsByCode: Record<string, string>
}) {
    const currentStage = useMemo(
        () => findCurrentRoleStage(detail.workflowStages, role),
        [detail.workflowStages, role],
    )

    const currentStageIndex = currentStage
        ? detail.workflowStages.findIndex((stage) => stage.id === currentStage.id)
        : -1
    const nextStage =
        currentStageIndex >= 0 ? detail.workflowStages[currentStageIndex + 1] : undefined

    if (!currentStage) {
        return (
            <Card title={`${roleLabelMap[role]}详情`}>
                <Empty
                    description="当前角色在该任务中暂无独立节点配置"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </Card>
        )
    }

    return (
        <Card
            title={`${roleLabelMap[role]}阶段任务`}
            extra={<Tag color={getStatusColor(currentStage.status)}>{getStatusLabel(currentStage.status)}</Tag>}
        >
            <Descriptions column={{ xs: 1, md: 2 }} size="small" className="panel-descriptions">
                <Descriptions.Item label="当前节点">{currentStage.stageName}</Descriptions.Item>
                <Descriptions.Item label="执行人">{buildAssigneeText(currentStage)}</Descriptions.Item>
                <Descriptions.Item label="截止时间">
                    {currentStage.dueDate || '未配置'}
                </Descriptions.Item>
                <Descriptions.Item label="下一节点">
                    {nextStage
                        ? getRoleLabelByCode(
                            nextStage.operatorRoleCode || nextStage.ownerRoleCode,
                            roleLabelsByCode,
                        )
                        : '当前已是最后节点'}
                </Descriptions.Item>
            </Descriptions>

            <Space direction="vertical" size={16} className="panel-stack-full">
                {currentStage.fileRules.length > 0 ? (
                    <div className="task-detail-section">
                        <Typography.Text strong>按流程规则上传文件</Typography.Text>
                        <Typography.Text type="secondary">
                            当前节点的上传项来自流程配置中的 `file_rules`，后续新增规则后这里会自动展示。
                        </Typography.Text>
                        <DynamicFileRuleSection fileRules={currentStage.fileRules} />
                    </div>
                ) : null}

                {currentStage.canAssign ? (
                    <Card type="inner" className="task-detail-action-card">
                        <Space direction="vertical" size={8} className="panel-stack-full">
                            <Typography.Text strong>当前节点任务：指定下一节点人员</Typography.Text>
                            <Typography.Text type="secondary">
                                这个节点未配置上传规则，核心动作是给下游节点指派人员。
                            </Typography.Text>
                            <Descriptions column={1} size="small">
                                <Descriptions.Item label="下游角色">
                                    {nextStage
                                        ? getRoleLabelByCode(
                                            nextStage.operatorRoleCode || nextStage.ownerRoleCode,
                                            roleLabelsByCode,
                                        )
                                        : '未配置'}
                                </Descriptions.Item>
                                <Descriptions.Item label="当前已指派">
                                    {buildAssigneeText(currentStage)}
                                </Descriptions.Item>
                            </Descriptions>
                        </Space>
                    </Card>
                ) : null}

                {currentStage.fileRules.length === 0 && !currentStage.canAssign ? (
                    <Empty
                        description="当前节点暂未配置文件规则或指派动作"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : null}
            </Space>
        </Card>
    )
}

export function TaskDetailPanel({
    detail,
    fieldConfigs,
    role,
    roleLabelsByCode,
}: {
    detail: TaskDetailRecord
    fieldConfigs: FieldConfig[]
    role: UserRole
    roleLabelsByCode: Record<string, string>
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
                />
            ) : null}

            <Card title="流程信息">
                {detail.workflowStages.length === 0 ? (
                    <Empty description="暂无流程节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <Space direction="vertical" size={12} className="panel-stack-full">
                        {detail.workflowStages.map((stage) =>
                            renderWorkflowStage(stage, roleLabelsByCode),
                        )}
                    </Space>
                )}
            </Card>
        </Space>
    )
}
