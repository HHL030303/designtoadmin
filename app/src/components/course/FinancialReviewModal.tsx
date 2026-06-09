import { useEffect } from 'react'
import datePickerZhCN from 'antd/es/date-picker/locale/zh_CN'
import {
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
} from 'antd'
import type { Dayjs } from 'dayjs'
import type { FieldConfig } from '../../types'
import './FinancialReviewModal.css'

type FinancialReviewFormValue =
  | string
  | number
  | boolean
  | Dayjs
  | string[]
  | null
  | undefined

type FinancialReviewFormValues = Record<string, FinancialReviewFormValue>

type FinancialReviewModalProps = {
  fieldConfigs: FieldConfig[]
  initialValues: FinancialReviewFormValues
  loading: boolean
  open: boolean
  onCancel: () => void
  onSubmit: (values: FinancialReviewFormValues) => Promise<void>
}

const accountLocationOptions = [
  { label: '汇意企微', value: '汇意企微' },
  { label: '幻维企微', value: '幻维企微' },
]

const paymentCategoryOptions = [
  { label: '部分款-不减定金', value: '部分款-不减定金' },
  { label: '部分款-减定金', value: '部分款-减定金' },
  { label: '全款', value: '全款' },
  { label: '尾款', value: '尾款' },
  { label: '预存扣款', value: '预存扣款' },
]

const notBeforeTodayFieldKeys = new Set(['researchDueDate', 'finalDueDate'])

function isNotBeforeTodayField(field: FieldConfig): boolean {
  return notBeforeTodayFieldKeys.has(field.field_key)
}

function getDisabledPastDate(current: Dayjs): boolean {
  return current.endOf('day').isBefore(new Date())
}

function validateNotBeforeToday(
  _: unknown,
  value: Dayjs | null | undefined,
): Promise<void> {
  if (!value || !value.isBefore(new Date(), 'day')) {
    return Promise.resolve()
  }

  return Promise.reject(new Error('日期不能早于今天'))
}

function renderFieldControl(field: FieldConfig) {
  const textPlaceholder = field.placeholder || `请输入${field.field_name}`
  const selectPlaceholder = field.placeholder || `请选择${field.field_name}`

  if (field.field_type === 'textarea') {
    return <Input placeholder={textPlaceholder} />
  }

  if (field.field_type === 'text') {
    return <Input placeholder={textPlaceholder} />
  }

  if (field.field_type === 'select') {
    return (
      <Select
        placeholder={selectPlaceholder}
        options={(field.option_config ?? []).map((option) => ({
          label: option.label,
          value: option.value,
        }))}
      />
    )
  }

  if (field.field_type === 'multi_select') {
    return (
      <Select
        mode="multiple"
        placeholder={selectPlaceholder}
        options={(field.option_config ?? []).map((option) => ({
          label: option.label,
          value: option.value,
        }))}
      />
    )
  }

  if (field.field_type === 'boolean') {
    return (
      <Radio.Group
        options={[
          { label: '是', value: true },
          { label: '否', value: false },
        ]}
        optionType="button"
        buttonStyle="solid"
      />
    )
  }

  if (field.field_type === 'number') {
    return (
      <Input
        inputMode="decimal"
        placeholder={textPlaceholder}
        onChange={(event) => {
          const normalized = event.target.value
            .replace(/[^\d.]/g, '')
            .replace(/(\..*)\./g, '$1')
          if (normalized !== event.target.value) {
            event.target.value = normalized
          }
        }}
      />
    )
  }

  if (field.field_type === 'date') {
    return (
      <DatePicker
        locale={datePickerZhCN}
        className="control-full-width"
        picker={field.type === 'year' ? 'year' : 'date'}
        format={field.type === 'year' ? 'YYYY' : 'YYYY-MM-DD'}
        placeholder={field.type === 'year' ? `请选择${field.field_name}年份` : selectPlaceholder}
        disabledDate={isNotBeforeTodayField(field) ? getDisabledPastDate : undefined}
      />
    )
  }

  if (field.field_type === 'datetime') {
    return (
      <DatePicker
        locale={datePickerZhCN}
        className="control-full-width"
        showTime
        format="YYYY-MM-DD HH:mm:ss"
        placeholder={selectPlaceholder}
        disabledDate={isNotBeforeTodayField(field) ? getDisabledPastDate : undefined}
      />
    )
  }

  if (field.field_type === 'year') {
    return (
      <DatePicker
        locale={datePickerZhCN}
        className="control-full-width"
        picker="year"
        format="YYYY"
        placeholder={`请选择${field.field_name}年份`}
      />
    )
  }

  return <Input placeholder={textPlaceholder} />
}

function buildTaskFieldFormItem(field: FieldConfig) {
  return (
    <Form.Item
      label={field.field_name}
      name={field.field_key}
      rules={[
        ...(field.required
          ? [
              {
                required: true,
                message:
                  `${field.field_type === 'select' || field.field_type === 'multi_select'
                    ? '请选择'
                    : '请输入'}${field.field_name}`,
              },
            ]
          : []),
        ...(isNotBeforeTodayField(field)
          ? [{ validator: validateNotBeforeToday }]
          : []),
      ]}
    >
      {renderFieldControl(field)}
    </Form.Item>
  )
}

function getMatchedRelateShowFieldKey(
  field: FieldConfig,
  values: FinancialReviewFormValues | undefined,
): string | undefined {
  const selectedValue = values?.[field.field_key]

  if (selectedValue === undefined || selectedValue === null || selectedValue === '') {
    return undefined
  }

  const matchedOption = field.option_config?.find(
    (option) => option.value === String(selectedValue),
  )

  return typeof matchedOption?.relate_show_field_key === 'string'
    ? matchedOption.relate_show_field_key
    : undefined
}

function getRelatedTargetFieldKeys(fieldConfigs: FieldConfig[]): Set<string> {
  const fieldKeySet = new Set(fieldConfigs.map((field) => field.field_key))
  const targetFieldKeys = new Set<string>()

  fieldConfigs.forEach((field) => {
    field.option_config?.forEach((option) => {
      if (
        typeof option.relate_show_field_key === 'string' &&
        fieldKeySet.has(option.relate_show_field_key)
      ) {
        targetFieldKeys.add(option.relate_show_field_key)
      }
    })
  })

  return targetFieldKeys
}

function getActiveRelatedFieldKeys(
  fieldConfigs: FieldConfig[],
  values: FinancialReviewFormValues | undefined,
): Set<string> {
  const fieldKeySet = new Set(fieldConfigs.map((field) => field.field_key))
  const activeFieldKeys = new Set<string>()

  fieldConfigs.forEach((field) => {
    const relateShowFieldKey = getMatchedRelateShowFieldKey(field, values)

    if (relateShowFieldKey && fieldKeySet.has(relateShowFieldKey)) {
      activeFieldKeys.add(relateShowFieldKey)
    }
  })

  return activeFieldKeys
}

function buildClearableLabel(label: string) {
  return (
    <div className="financial-review-form__field-label">
      <span>{label}</span>
    </div>
  )
}

function sanitizeNumericInput(value: string): string {
  return value
    .replace(/[^\d.]/g, '')
    .replace(/(\..*)\./g, '$1')
}

function buildCheckStatusField(
  form: ReturnType<typeof Form.useForm<FinancialReviewFormValues>>[0],
  label: string,
  name: string,
) {
  return (
    <Form.Item label={buildClearableLabel(label)}>
      <Form.Item noStyle shouldUpdate>
        {() => (
          <Checkbox
            checked={form.getFieldValue(name) === '已核'}
            className="financial-review-form__status-checkbox"
            onChange={(event) => form.setFieldValue(name, event.target.checked ? '已核' : undefined)}
          >
            已核
          </Checkbox>
        )}
      </Form.Item>
    </Form.Item>
  )
}

export function FinancialReviewModal({
  fieldConfigs,
  initialValues,
  loading,
  open,
  onCancel,
  onSubmit,
}: FinancialReviewModalProps) {
  const [form] = Form.useForm<FinancialReviewFormValues>()
  const watchedValues = Form.useWatch([], form) as FinancialReviewFormValues | undefined

  useEffect(() => {
    if (!open) {
      form.resetFields()
      return
    }

    form.setFieldsValue(initialValues)
  }, [form, initialValues, open])

  const relatedTargetFieldKeys = getRelatedTargetFieldKeys(fieldConfigs)
  const activeRelatedFieldKeys = getActiveRelatedFieldKeys(fieldConfigs, watchedValues)

  useEffect(() => {
    fieldConfigs.forEach((field) => {
      if (
        relatedTargetFieldKeys.has(field.field_key) &&
        !activeRelatedFieldKeys.has(field.field_key)
      ) {
        form.setFieldValue(field.field_key, undefined)
      }
    })
  }, [activeRelatedFieldKeys, fieldConfigs, form, relatedTargetFieldKeys])

  return (
    <Modal
      title="财务审核"
      open={open}
      width={920}
      maskClosable={false}
      className="financial-review-modal"
      destroyOnClose={false}
      okText="确认"
      cancelText="取消"
      confirmLoading={loading}
      styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}
      onCancel={onCancel}
      onOk={() => void form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        className="financial-review-form"
        onFinish={(values) => void onSubmit(values)}
      >
        <Collapse
          bordered={false}
          className="financial-review-form__collapse"
          defaultActiveKey={[]}
          items={[
            {
              key: 'task-base',
              label: (
                <div className="financial-review-form__collapse-title">
                  <div className="financial-review-form__section-title">基础信息</div>
                  {/* <div className="financial-review-form__section-copy">
                    用于确认本次财务审核对应的任务信息与业务字段。
                  </div> */}
                </div>
              ),
              children: (
                <section className="financial-review-form__section financial-review-form__section--plain">
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item
                        label="任务名称"
                        name="title"
                        rules={[{ required: true, message: '请填写任务名称' }]}
                      >
                        <Input />
                      </Form.Item>
                    </Col>
                    {fieldConfigs.flatMap((field) => {
                      if (relatedTargetFieldKeys.has(field.field_key)) {
                        return []
                      }

                      const items = [
                        (
                          <Col span={field.span === 24 ? 24 : 12} key={field.field_key}>
                            {buildTaskFieldFormItem(field)}
                          </Col>
                        ),
                      ]

                      const relateShowFieldKey = getMatchedRelateShowFieldKey(
                        field,
                        watchedValues,
                      )
                      const relatedField = fieldConfigs.find(
                        (config) => config.field_key === relateShowFieldKey,
                      )

                      if (relatedField) {
                        items.push(
                          <Col
                            span={relatedField.span === 24 ? 24 : 12}
                            key={relatedField.field_key}
                          >
                            {buildTaskFieldFormItem(relatedField)}
                          </Col>,
                        )
                      }

                      return items
                    })}
                  </Row>
                </section>
              ),
            },
          ]}
        />

        <section className="financial-review-form__section financial-review-form__section--accent">
          <div className="financial-review-form__section-head">
            <div className="financial-review-form__section-title">财务审核信息</div>
          </div>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label={buildClearableLabel('定金')}>
                <Form.Item name="financeDepositAmount" noStyle>
                  <Input
                    allowClear
                    inputMode="decimal"
                    placeholder="请输入定金"
                    onChange={(event) => {
                      const normalized = sanitizeNumericInput(event.target.value)
                      if (normalized !== event.target.value) {
                        form.setFieldValue('financeDepositAmount', normalized)
                      }
                    }}
                  />
                </Form.Item>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="时间" name="financeDepositDate">
                <DatePicker
                  allowClear
                  locale={datePickerZhCN}
                  className="control-full-width"
                  format="YYYY-MM-DD"
                  placeholder="请选择时间"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="付款人姓名" name="financePayerName">
                <Input  allowClear placeholder="请输入付款人姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="到账位置" name="financeDepositAccountLocation">
                <Select allowClear placeholder="请选择到账位置" options={accountLocationOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              {buildCheckStatusField(form, '定金核对进度', 'financeDepositCheckStatus')}
            </Col>
            <Col span={12}>
              <Form.Item label="定金核对时间" name="financeDepositCheckDate">
                <DatePicker
                  allowClear
                  locale={datePickerZhCN}
                  className="control-full-width"
                  format="YYYY-MM-DD"
                  placeholder="请选择定金核对时间"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={buildClearableLabel('核对金额')}>
                <Form.Item name="financeDepositCheckAmount" noStyle>
                  <Input
                    allowClear
                    inputMode="decimal"
                    placeholder="请输入核对金额"
                    onChange={(event) => {
                      const normalized = sanitizeNumericInput(event.target.value)
                      if (normalized !== event.target.value) {
                        form.setFieldValue('financeDepositCheckAmount', normalized)
                      }
                    }}
                  />
                </Form.Item>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={buildClearableLabel('到账金额')}>
                <Form.Item name="financeReceivedAmount" noStyle>
                  <Input
                    allowClear
                    inputMode="decimal"
                    placeholder="请输入到账金额"
                    onChange={(event) => {
                      const normalized = sanitizeNumericInput(event.target.value)
                      if (normalized !== event.target.value) {
                        form.setFieldValue('financeReceivedAmount', normalized)
                      }
                    }}
                  />
                </Form.Item>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="问题备注" name="financeDepositIssueRemark">
                <Input allowClear placeholder="请输入问题备注" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="到账类别" name="financeArrivalCategory">
                <Select allowClear placeholder="请选择到账类别" options={paymentCategoryOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="尾款/全款到账位置" name="financeFinalAccountLocation">
                <Select allowClear placeholder="请选择到账位置" options={accountLocationOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="到账时间" name="financeArrivalDate">
                <DatePicker
                  allowClear
                  locale={datePickerZhCN}
                  className="control-full-width"
                  format="YYYY-MM-DD"
                  placeholder="请选择到账时间"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="客户打款单位/人" name="financeCustomerPayer">
                <Input allowClear placeholder="请输入客户打款单位/人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={buildClearableLabel('尾款核对金额')}>
                <Form.Item name="financeFinalCheckAmount" noStyle>
                  <Input
                    allowClear
                    inputMode="decimal"
                    placeholder="请输入尾款核对金额"
                    onChange={(event) => {
                      const normalized = sanitizeNumericInput(event.target.value)
                      if (normalized !== event.target.value) {
                        form.setFieldValue('financeFinalCheckAmount', normalized)
                      }
                    }}
                  />
                </Form.Item>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="尾款财务核对时间" name="financeFinalCheckDate">
                <DatePicker
                  allowClear
                  locale={datePickerZhCN}
                  className="control-full-width"
                  format="YYYY-MM-DD"
                  placeholder="请选择尾款财务核对时间"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              {buildCheckStatusField(form, '尾款核对进度', 'financeFinalCheckStatus')}
            </Col>
            <Col span={24}>
              <Form.Item label="问题备注" name="financeFinalIssueRemark">
                <Input allowClear placeholder="请输入问题备注" />
              </Form.Item>
            </Col>
          </Row>
        </section>
      </Form>
    </Modal>
  )
}
