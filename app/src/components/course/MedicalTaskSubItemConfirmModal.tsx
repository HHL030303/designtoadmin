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
import {
  MEDICAL_TASK_CONTRACT_CHANGE_OPTIONS,
  MEDICAL_TASK_SUB_ITEM_TYPE_OPTIONS,
} from '../../constants/taskHardcodedRules'
import type { MedicalTaskSubItemRecord, UpdateMedicalTaskSubItemPayload, YesNoOption } from '../../types'

type MedicalTaskSubItemConfirmFormValues = UpdateMedicalTaskSubItemPayload & {
  hasContractChange?: YesNoOption
}

export function MedicalTaskSubItemConfirmModal({
  open,
  loading,
  item,
  onCancel,
  onSubmit,
}: {
  open: boolean
  loading?: boolean
  item?: MedicalTaskSubItemRecord | null
  onCancel: () => void
  onSubmit: (payload: UpdateMedicalTaskSubItemPayload) => Promise<void> | void
}) {
  const [form] = Form.useForm<MedicalTaskSubItemConfirmFormValues>()
  const contractChange = Form.useWatch('hasContractChange', form) as YesNoOption | undefined

  useEffect(() => {
    if (!open || !item) {
      form.resetFields()
      return
    }

    // 确认需求前允许补齐业务字段，默认回填列表已有数据，避免重复录入。
    form.setFieldsValue({
      amount: item.amount,
      description: item.description ?? '',
      hasContractChange:
        typeof item.hasContractChange === 'boolean'
          ? (item.hasContractChange ? '是' : '否')
          : undefined,
      remark: item.remark ?? '',
      subItemType: item.subItemType,
      title: item.title ?? `增项：${item.subItemType}`,
    })
  }, [form, item, open])

  async function handleFinish(values: MedicalTaskSubItemConfirmFormValues) {
    await onSubmit({
      ...values,
      description: values.description?.trim(),
      remark: values.remark?.trim() || undefined,
      title: values.title?.trim(),
    })
  }

  return (
    <Modal
      title="确认子项需求"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width={560}
    >
      <Form form={form} layout="vertical" onFinish={(values) => void handleFinish(values)}>
        <Form.Item
          label="子项类型"
          name="subItemType"
          rules={[{ required: true, message: '请选择子项类型' }]}
        >
          <Select
            placeholder="请选择子项类型"
            options={MEDICAL_TASK_SUB_ITEM_TYPE_OPTIONS}
          />
        </Form.Item>
        {/* <Form.Item
          label="标题"
          name="title"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input placeholder="请输入标题" />
        </Form.Item>
        <Form.Item
          label="描述"
          name="description"
          rules={[{ required: true, message: '请输入描述' }]}
        >
          <Input.TextArea rows={4} placeholder="请输入描述" />
        </Form.Item> */}
        <Form.Item label="是否涉及合同变更" name="hasContractChange">
          <Select
            allowClear
            placeholder="请选择是否涉及合同变更"
            options={MEDICAL_TASK_CONTRACT_CHANGE_OPTIONS}
          />
        </Form.Item>
        <Form.Item
          label="涉及金额"
          name="amount"
          rules={[
            {
              validator: async (_, value: number | null | undefined) => {
                if (contractChange === '是' && (value === null || value === undefined)) {
                  throw new Error('请输入涉及金额')
                }
              },
            },
          ]}
        >
          <InputNumber
            min={0}
            precision={2}
            placeholder="请输入涉及金额"
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="备注" name="remark">
          <Input placeholder="请输入备注" />
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
