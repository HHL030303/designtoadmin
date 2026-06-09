import { useEffect } from 'react'
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
} from 'antd'
import { MEDICAL_TASK_SUB_ITEM_TYPE_OPTIONS } from '../../constants/taskHardcodedRules'
import type { CreateMedicalTaskSubItemPayload } from '../../types'

type MedicalTaskSubItemFormValues = CreateMedicalTaskSubItemPayload

export function MedicalTaskSubItemModal({
  open,
  loading,
  onCancel,
  onSubmit,
}: {
  open: boolean
  loading?: boolean
  onCancel: () => void
  onSubmit: (payload: CreateMedicalTaskSubItemPayload) => Promise<void> | void
}) {
  const [form] = Form.useForm<MedicalTaskSubItemFormValues>()

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }

    form.setFieldsValue({
      subItemType: undefined,
    })
  }, [form, open])

  async function handleFinish(values: MedicalTaskSubItemFormValues) {
    await onSubmit(values)
  }

  return (
    <Modal
      title="增加子项"
      open={open}
      maskClosable={false}
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width={520}
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
        {/* <Form.Item label="是否涉及合同变更" name="hasContractChange">
          <Select
            allowClear
            placeholder="请选择是否涉及合同变更"
            options={MEDICAL_TASK_CONTRACT_CHANGE_OPTIONS}
          />
        </Form.Item>
        <Form.Item
          label="涉及金额"
          name="amount"
          // 金额是否必填只跟合同变更结果绑定，避免把业务校验散落到列表页。
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
        </Form.Item> */}
        <Form.Item
          label="备注"
          name="remark"
        >
          <Input
            placeholder="请输入备注"
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
