import { useEffect } from 'react'
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
} from 'antd'
import type {
  CreateMedicalTaskComplaintPayload,
  FieldOptionConfig,
} from '../../types'

type MedicalTaskComplaintFormValues = CreateMedicalTaskComplaintPayload

export function MedicalTaskComplaintModal({
  open,
  loading,
  stageOptions,
  responsibilityOptions,
  onCancel,
  onSubmit,
}: {
  open: boolean
  loading?: boolean
  stageOptions: FieldOptionConfig[]
  responsibilityOptions: FieldOptionConfig[]
  onCancel: () => void
  onSubmit: (payload: CreateMedicalTaskComplaintPayload) => Promise<void> | void
}) {
  const [form] = Form.useForm<MedicalTaskComplaintFormValues>()

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }

    form.setFieldsValue({
      description: '',
      processingMethod: '',
      refundAmount: undefined,
      responsibilityUserIds: undefined,
      workflowStageId: undefined,
    })
  }, [form, open])

  async function handleFinish(values: MedicalTaskComplaintFormValues) {
    await onSubmit(values)
  }

  return (
    <Modal
      title="客诉"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width={640}
    >
      <Form form={form} layout="vertical" onFinish={(values) => void handleFinish(values)}>
        <Form.Item
          label="发生阶段"
          name="workflowStageId"
          rules={[{ required: true, message: '请选择发生阶段' }]}
        >
          <Select
            showSearch
            placeholder="请选择发生阶段"
            optionFilterProp="label"
            options={stageOptions}
          />
        </Form.Item>
        <Form.Item
          label="问题描述"
          name="description"
          rules={[{ required: true, message: '请输入问题描述' }]}
        >
          <Input.TextArea rows={4} placeholder="请填写问题描述" showCount maxLength={500} />
        </Form.Item>
        <Form.Item label="责任方" name="responsibilityUserIds">
          <Select
            mode="multiple"
            showSearch
            placeholder="请选择责任方"
            optionFilterProp="label"
            options={responsibilityOptions}
          />
        </Form.Item>
        <Form.Item label="处理方式" name="processingMethod">
          <Input.TextArea rows={3} placeholder="请填写处理方式" showCount maxLength={300} />
        </Form.Item>
        <Form.Item label="退款金额" name="refundAmount">
          <InputNumber
            min={0}
            precision={2}
            placeholder="请输入退款金额"
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Space className="form-footer-actions">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            确认
          </Button>
        </Space>
      </Form>
    </Modal>
  )
}
