import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import type { FieldConfig } from '../../types'

type DynamicTaskFormPreviewProps = {
  fieldConfigs: FieldConfig[]
  onDeleteField?: (fieldKey: string) => void
  onEditField?: (field: FieldConfig) => void
}

function buildInitialValues(
  fieldConfigs: FieldConfig[],
): Record<string, dayjs.Dayjs | string | number | boolean | string[]> {
  return fieldConfigs.reduce<Record<string, dayjs.Dayjs | string | number | boolean | string[]>>(
    (accumulator, field) => {
    if (field.default_value === undefined || field.default_value === null || field.default_value === '') {
      return accumulator
    }

    if ((field.field_type === 'date' || field.field_type === 'year') && typeof field.default_value === 'string') {
      accumulator[field.field_key] = dayjs(field.default_value)
      return accumulator
    }

    accumulator[field.field_key] = field.default_value
    return accumulator
    },
    {},
  )
}

function renderFieldControl(field: FieldConfig) {
  const commonPlaceholder = field.placeholder || `请输入${field.field_name}`

  if (field.field_type === 'textarea') {
    // return <Input.TextArea placeholder={commonPlaceholder} rows={4} />
    return <Input placeholder={commonPlaceholder}  />
  }

  if (field.field_type === 'select') {
    return (
      <Select
        placeholder={field.placeholder || `请选择${field.field_name}`}
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
        placeholder={field.placeholder || `请选择${field.field_name}`}
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
        optionType="button"
        buttonStyle="solid"
        className="project-field-config-boolean-group"
        options={[
          { label: '是', value: true },
          { label: '否', value: false },
        ]}
      />
    )
  }

  if (field.field_type === 'number') {
    return (
      <InputNumber
        className="control-full-width"
        placeholder={commonPlaceholder}
      />
    )
  }

  if (field.field_type === 'date') {
    return <DatePicker className="control-full-width" placeholder={field.placeholder} />
  }

  if (field.field_type === 'year') {
    return (
      <DatePicker
        className="control-full-width"
        picker="year"
        placeholder={field.placeholder || `请选择${field.field_name}`}
      />
    )
  }

  return <Input placeholder={commonPlaceholder} />
}

export function DynamicTaskFormPreview(
  props: DynamicTaskFormPreviewProps,
) {
  const visibleFields = props.fieldConfigs
    .filter((field) => field.status === 'enabled')
    .sort((left, right) => left.sort_value - right.sort_value)

  return (
    <Form
      layout="vertical"
      initialValues={buildInitialValues(visibleFields)}
      className="project-field-config-preview"
    >
      <Row gutter={12}>
        {visibleFields.map((field) => (
          <Col span={field.span === 24 ? 24 : 12} key={field.field_key}>
            <Form.Item
              label={(
                <div className="project-field-config-label">
                  <Typography.Text strong>{field.field_name}</Typography.Text>
                  <Space size={4}>
                    <Tooltip title="编辑字段">
                      <Button
                        size="small"
                        type="text"
                        className="project-field-config-action"
                        icon={<EditOutlined />}
                        onClick={() => props.onEditField?.(field)}
                      />
                    </Tooltip>
                    <Popconfirm
                      title={`确认删除字段“${field.field_name}”吗？`}
                      onConfirm={() => props.onDeleteField?.(field.field_key)}
                    >
                      <Tooltip title="删除字段">
                        <Button
                          size="small"
                          type="text"
                          danger
                          className="project-field-config-action"
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </div>
              )}
              name={field.field_key}
              rules={
                field.required
                  ? [
                      {
                        required: true,
                        message:
                          `${field.field_type === 'select' || field.field_type === 'multi_select' || field.field_type === 'boolean'
                            ? '请选择'
                            : '请输入'}${field.field_name}`,
                      },
                    ]
                  : undefined
              }
            >
              {renderFieldControl(field)}
            </Form.Item>
          </Col>
        ))}
      </Row>
    </Form>
  )
}
