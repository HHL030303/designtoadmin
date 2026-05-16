import { useEffect } from 'react'
import {
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
} from 'antd'
import type {
  CreateServiceTicketPayload,
  FieldOptionConfig,
  ServiceType,
} from '../../types'

type ServiceTicketFormValues = CreateServiceTicketPayload & {
  linkedCourseId?: string
  requester?: string
  createdAt?: string
}

export function ServiceTicketDrawer({
  open,
  defaultType,
  courseId,
  requester,
  createdAt,
  assigneeOptions = [],
  linkedTaskOptions,
  loading,
  onClose,
  onLinkedTaskChange,
  onWorkflowTemplateChange,
  onSubmit,
  firstStageAssigneeLabel,
  firstStageAssigneeOptions = [],
  ownerOptions = [],
  showAssigneeField = false,
  showLinkedTaskField = false,
  showTypeField = false,
  workflowTemplateOptions,
}: {
  assigneeOptions?: FieldOptionConfig[]
  open: boolean
  defaultType: ServiceType
  courseId: string
  requester?: string
  createdAt?: string
  linkedTaskOptions?: FieldOptionConfig[]
  loading?: boolean
  onClose: () => void
  onLinkedTaskChange?: (taskId: string | undefined) => void
  onWorkflowTemplateChange?: (templateId: string | undefined) => void
  onSubmit: (payload: CreateServiceTicketPayload) => Promise<void> | void
  firstStageAssigneeLabel?: string
  firstStageAssigneeOptions?: FieldOptionConfig[]
  ownerOptions?: FieldOptionConfig[]
  showAssigneeField?: boolean
  showLinkedTaskField?: boolean
  showTypeField?: boolean
  workflowTemplateOptions?: FieldOptionConfig[]
}) {
  void requester
  void createdAt
  const [form] = Form.useForm<ServiceTicketFormValues>()
  const selectedType = Form.useWatch('type', form)
  const currentType = selectedType ?? defaultType
  const drawerTitle = currentType === '售后' ? '发起售后' : '发起迭代'

  useEffect(() => {
    if (!open) {
      return
    }

    form.setFieldsValue({
      assigneeUserIds: undefined,
      type: defaultType,
      description: '',
      firstStageAssigneeUserId: undefined,
      linkedTaskId: showLinkedTaskField ? undefined : courseId || undefined,
      ownerUserId: undefined,
      workflowTemplateId: undefined,
    })
  }, [courseId, defaultType, form, open, showLinkedTaskField])

  useEffect(() => {
    if (!open || !showLinkedTaskField) {
      return
    }

    onLinkedTaskChange?.(undefined)
    onWorkflowTemplateChange?.(undefined)
  }, [onLinkedTaskChange, onWorkflowTemplateChange, open, showLinkedTaskField])

  async function handleFinish(values: ServiceTicketFormValues) {
    await onSubmit({
      assigneeUserIds: values.assigneeUserIds,
      type: currentType,
      responsibility: '其他',
      description: values.description,
      firstStageAssigneeUserId: values.firstStageAssigneeUserId,
      linkedTaskId: values.linkedTaskId,
      ownerUserId: values.ownerUserId,
      workflowTemplateId: values.workflowTemplateId,
    })

    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={drawerTitle}
      open={open}
      onCancel={onClose}
      destroyOnHidden
      footer={null}
      width={640}
    >
      <Form form={form} layout="vertical" onFinish={(values) => void handleFinish(values)}>
        <Row gutter={12}>
          {showTypeField ? (
            <Col span={12}>
              <Form.Item
                label="子任务类型"
                name="type"
                rules={[{ required: true, message: '请选择子任务类型' }]}
              >
                <Select
                  options={[
                    { label: '售后', value: '售后' },
                    { label: '迭代', value: '迭代' },
                  ]}
                />
              </Form.Item>
            </Col>
          ) : null}
          {showLinkedTaskField ? (
            <Col span={showTypeField ? 12 : 24}>
              <Form.Item
                label="关联主任务"
                name="linkedTaskId"
                rules={[{ required: true, message: '请选择关联主任务' }]}
              >
                <Select
                  showSearch
                  placeholder="请选择关联主任务"
                  options={linkedTaskOptions}
                  optionFilterProp="label"
                  onChange={(value) => {
                    form.setFieldValue('assigneeUserIds', undefined)
                    onLinkedTaskChange?.(typeof value === 'string' ? value : undefined)
                  }}
                />
              </Form.Item>
            </Col>
          ) : null}
          <Col span={showAssigneeField ? 12 : 24}>
            <Form.Item
              label="关联流程"
              name="workflowTemplateId"
              rules={[{ required: true, message: '请选择关联流程' }]}
            >
              <Select
                placeholder="请选择关联流程"
                options={workflowTemplateOptions}
                onChange={(value) => {
                  form.setFieldValue('firstStageAssigneeUserId', undefined)
                  onWorkflowTemplateChange?.(typeof value === 'string' ? value : undefined)
                }}
              />
            </Form.Item>
          </Col>
          {firstStageAssigneeLabel ? (
            <Col span={24}>
              <Form.Item
                label={firstStageAssigneeLabel}
                name="firstStageAssigneeUserId"
                rules={[{ required: true, message: `请选择${firstStageAssigneeLabel}` }]}
              >
                <Select
                  showSearch
                  placeholder={`请选择${firstStageAssigneeLabel}`}
                  optionFilterProp="label"
                  options={firstStageAssigneeOptions}
                />
              </Form.Item>
            </Col>
          ) : null}
          <Col span={showAssigneeField ? 12 : 24}>
            <Form.Item
              label="任务负责人"
              name="ownerUserId"
              rules={[{ required: true, message: '请选择任务负责人' }]}
            >
              <Select
                showSearch
                placeholder="请选择任务负责人"
                options={ownerOptions}
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
          {showAssigneeField ? (
            <>
              <Col span={12}>
                <Form.Item
                  label="责任人"
                  name="assigneeUserIds"
                >
                  <Select
                    mode="multiple"
                    placeholder="请选择责任人"
                    options={assigneeOptions}
                  />
                </Form.Item>
              </Col>
            </>
          ) : null}
          <Col span={24}>
            <Form.Item
              label="描述"
              name="description"
              rules={[{ required: true, message: '请输入描述' }]}
            >
              <Input.TextArea rows={4} placeholder="请填写描述" showCount maxLength={300} />
            </Form.Item>
          </Col>
        </Row>

        <Space className="form-footer-actions">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            确认发起
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
