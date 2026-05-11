import { Button, Drawer, Empty, Input, Modal, Space, Spin, Typography, message } from 'antd'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { DynamicTaskFormPreview } from './DynamicTaskFormPreview'
import { parseFormConfigFile, validateFieldConfigJson } from '../../utils/formConfigImport'
import { adminService } from '../../services/adminService'
import type { FieldConfig, ProjectManagementRecord } from '../../types'

type ProjectFieldConfigDrawerProps = {
  open: boolean
  project: ProjectManagementRecord | null
  onClose: () => void
}

export function ProjectFieldConfigDrawer(props: ProjectFieldConfigDrawerProps) {
  const NEW_FIELD_EDITOR_KEY = '__new__'
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null)
  const [editingFieldJson, setEditingFieldJson] = useState('')

  useEffect(() => {
    if (!props.open || !props.project) {
      return
    }

    let active = true
    const projectId = props.project.id

    async function loadTaskFields(): Promise<void> {
      setLoading(true)

      try {
        const nextConfigs = await adminService.listTaskFields(projectId)
        if (active) {
          setFieldConfigs(nextConfigs)
        }
      } catch (error) {
        if (active) {
          setFieldConfigs([])
        }
        message.error(error instanceof Error ? error.message : '加载字段配置失败')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadTaskFields()

    return () => {
      active = false
    }
  }, [props.open, props.project])

  async function handleImportChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setImporting(true)

    try {
      const nextConfigs = await parseFormConfigFile(file)
      setFieldConfigs(nextConfigs)
      message.success(`成功解析 ${nextConfigs.length} 个字段`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '字段配置导入失败')
    } finally {
      setImporting(false)
    }
  }

  async function handleImportClick(): Promise<void> {
    if (!props.project) {
      return
    }

    if (!hasConfigs) {
      importInputRef.current?.click()
      return
    }

    setResetting(true)

    try {
      await adminService.saveTaskFields(props.project.id, [])
      setFieldConfigs([])
      message.success('已清空旧字段配置，请重新选择 Excel')
      importInputRef.current?.click()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '清空旧字段配置失败')
    } finally {
      setResetting(false)
    }
  }

  const hasConfigs = fieldConfigs.length > 0

  async function handleSave(): Promise<void> {
    if (!props.project || !hasConfigs) {
      return
    }

    setSaving(true)

    try {
      await adminService.saveTaskFields(props.project.id, fieldConfigs)
      message.success('字段配置已保存')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '字段配置保存失败')
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteField(fieldKey: string): void {
    const nextConfigs = fieldConfigs.filter((field) => field.field_key !== fieldKey)
    setFieldConfigs(nextConfigs)
    message.success('字段已删除')
  }

  function handleEditField(field: FieldConfig): void {
    setEditingFieldKey(field.field_key)
    setEditingFieldJson(JSON.stringify(field, null, 2))
  }

  function handleCreateField(): void {
    const nextSortValue =
      fieldConfigs.length === 0
        ? 10
        : Math.max(...fieldConfigs.map((field) => field.sort_value)) + 10

    const templateField: FieldConfig = {
      default_value: '',
      field_key: 'new_field_key',
      field_name: '新字段',
      field_type: 'text',
      placeholder: '请输入新字段',
      required: false,
      searchable: false,
      sort_value: nextSortValue,
      span: 12,
      status: 'enabled',
    }

    setEditingFieldKey(NEW_FIELD_EDITOR_KEY)
    setEditingFieldJson(JSON.stringify(templateField, null, 2))
  }

  function handleCloseEditor(): void {
    setEditingFieldKey(null)
    setEditingFieldJson('')
  }

  function handleApplyFieldJson(): void {
    try {
      const parsed = JSON.parse(editingFieldJson) as unknown
      const isCreatingField = editingFieldKey === NEW_FIELD_EDITOR_KEY
      const currentField = fieldConfigs.find((field) => field.field_key === editingFieldKey)
      const validated = validateFieldConfigJson(parsed, {
        currentFieldKey:
          !editingFieldKey || isCreatingField ? undefined : editingFieldKey,
        existingFieldKeys: fieldConfigs.map((field) => field.field_key),
      })
      const nextField =
        currentField?.id && !validated.id
          ? {
              ...validated,
              id: currentField.id,
            }
          : validated

      const nextConfigs = isCreatingField
        ? [...fieldConfigs, nextField].sort((left, right) => left.sort_value - right.sort_value)
        : fieldConfigs.map((field) =>
            field.field_key === editingFieldKey ? nextField : field,
          )

      setFieldConfigs(nextConfigs)
      message.success(isCreatingField ? '字段已新增' : '字段配置已更新')
      handleCloseEditor()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '字段配置解析失败')
    }
  }

  return (
    <>
      <Drawer
        title={props.project ? `${props.project.name} · 字段配置` : '字段配置'}
        placement="right"
        size={720}
        open={props.open}
        destroyOnClose={false}
        onClose={props.onClose}
        className="project-field-config-drawer"
      >
        <div className="project-field-config-shell">
          <div className="project-field-config-toolbar">
            <div>
              <Typography.Title level={5} style={{ margin: 0 }}>
                新建任务预览
              </Typography.Title>
              <Typography.Text type="secondary">
                导入字段配置 Excel 后，右侧会按当前项目实时生成表单预览。
              </Typography.Text>
            </div>
            <Space>
              <Button
                type={hasConfigs ? 'default' : 'primary'}
                loading={importing || resetting}
                disabled={loading || saving}
                onClick={() => void handleImportClick()}
              >
                {hasConfigs ? '重新导入 Excel' : '导入 Excel'}
              </Button>
              <Button
                disabled={loading || saving || importing || resetting}
                onClick={handleCreateField}
              >
                新增字段
              </Button>
              <Button
                type="primary"
                disabled={!hasConfigs || loading}
                loading={saving}
                onClick={() => void handleSave()}
              >
                保存
              </Button>
            </Space>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={(event) => void handleImportChange(event)}
          />

          {loading ? (
            <div className="project-field-config-loading">
              <Spin />
            </div>
          ) : hasConfigs ? (
            <div className="project-field-config-preview-card">
              <DynamicTaskFormPreview
                fieldConfigs={fieldConfigs}
                onEditField={handleEditField}
                onDeleteField={handleDeleteField}
              />
            </div>
          ) : (
            <div className="project-field-config-empty">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="当前项目还没有字段配置，请先导入 Excel"
              />
              <Button
                type="primary"
                loading={importing || resetting}
                onClick={() => void handleImportClick()}
              >
                导入 Excel
              </Button>
            </div>
          )}
        </div>
      </Drawer>

      <Modal
        title={editingFieldKey === NEW_FIELD_EDITOR_KEY ? '新增字段 JSON' : '编辑字段 JSON'}
        open={Boolean(editingFieldKey)}
        width={760}
        okText="应用"
        cancelText="取消"
        destroyOnClose
        onOk={handleApplyFieldJson}
        onCancel={handleCloseEditor}
      >
        <Typography.Paragraph type="secondary">
          {editingFieldKey === NEW_FIELD_EDITOR_KEY
            ? '填写单个字段的 JSON 配置。提交前会校验 JSON 语法和字段结构，校验通过后会直接新增到预览中。'
            : '直接修改当前字段的 JSON 配置。提交前会校验 JSON 语法和字段结构，避免预览异常。'}
        </Typography.Paragraph>
        <Input.TextArea
          value={editingFieldJson}
          rows={20}
          className="project-field-config-json-editor"
          onChange={(event) => setEditingFieldJson(event.target.value)}
        />
      </Modal>
    </>
  )
}
