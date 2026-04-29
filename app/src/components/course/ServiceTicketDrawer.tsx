import { useEffect } from 'react'
import {
  Button,
  Checkbox,
  Col,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Space,
} from 'antd'
import type { CheckboxGroupProps } from 'antd/es/checkbox'
import type { CreateServiceTicketPayload, ServiceType } from '../../types'

type ServiceTicketFormValues = CreateServiceTicketPayload & {
  linkedCourseId: string
  requester: string
  createdAt: string
}

const responsibilityOptions = ['设计责任', '内容责任', '客户需求变更', '其他'].map((item) => ({
  label: item,
  value: item,
}))

const skipStageOptions: CheckboxGroupProps<string>['options'] = ['教研', '风格稿', '内页'].map(
  (item) => ({
    label: item,
    value: item,
  }),
)

export function ServiceTicketDrawer({
  open,
  defaultType,
  courseId,
  requester,
  createdAt,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean
  defaultType: ServiceType
  courseId: string
  requester: string
  createdAt: string
  loading?: boolean
  onClose: () => void
  onSubmit: (payload: CreateServiceTicketPayload) => Promise<void> | void
}) {
  const [form] = Form.useForm<ServiceTicketFormValues>()
  const selectedType = Form.useWatch('type', form)
  const drawerTitle = (selectedType ?? defaultType) === '售后' ? '发起售后' : '发起迭代'

  useEffect(() => {
    if (!open) {
      return
    }

    form.setFieldsValue({
      type: defaultType,
      responsibility: '设计责任',
      description: '',
      skipStages: [],
      linkedCourseId: courseId,
      requester,
      createdAt,
    })
  }, [courseId, createdAt, defaultType, form, open, requester])

  async function handleFinish(values: ServiceTicketFormValues) {
    await onSubmit({
      type: values.type,
      responsibility: values.responsibility,
      description: values.description,
      skipStages: values.type === '迭代' ? values.skipStages : [],
    })

    form.resetFields()
    onClose()
  }

  return (
    <Drawer
      title={drawerTitle}
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={(values) => void handleFinish(values)}>
        <Row gutter={12}>
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
          <Col span={12}>
            <Form.Item
              label="责任方"
              name="responsibility"
              rules={[{ required: true, message: '请选择责任方' }]}
            >
              <Select options={responsibilityOptions} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              label="问题 / 迭代描述"
              name="description"
              rules={[{ required: true, message: '请输入问题或迭代描述' }]}
            >
              <Input.TextArea rows={4} placeholder="请填写问题详情或迭代内容" showCount maxLength={300} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="关联课件ID" name="linkedCourseId">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="发起人" name="requester">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="发起时间" name="createdAt">
              <Input disabled />
            </Form.Item>
          </Col>
          {selectedType === '迭代' ? (
            <Col span={24}>
              <Form.Item label="跳过环节" name="skipStages">
                <Checkbox.Group options={skipStageOptions} />
              </Form.Item>
            </Col>
          ) : null}
        </Row>

        <Space className="form-footer-actions">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            确认发起
          </Button>
        </Space>
      </Form>
    </Drawer>
  )
}
