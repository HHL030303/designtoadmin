import { Button, Drawer, Empty, Input, Modal, Space, Spin, Typography, message } from 'antd'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useAppState } from '../../context/AppStateContext'
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
  const { hasButtonPermissionAction } = useAppState()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([])
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null)
  const [editingFieldJson, setEditingFieldJson] = useState('')
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const canCreateField = hasButtonPermissionAction('field', 'create')
  const canUpdateField = hasButtonPermissionAction('field', 'update')
  const canDeleteField = hasButtonPermissionAction('field', 'delete')
  const canManageFieldConfig = canCreateField || canUpdateField || canDeleteField

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

    if ((hasConfigs && !canUpdateField) || (!hasConfigs && !canCreateField)) {
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

    if (!canManageFieldConfig) {
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
    if (!canDeleteField) {
      return
    }

    const nextConfigs = fieldConfigs.filter((field) => field.field_key !== fieldKey)
    setFieldConfigs(nextConfigs)
    message.success('字段已删除')
  }

  function handleEditField(field: FieldConfig): void {
    if (!canUpdateField) {
      return
    }

    setEditingFieldKey(field.field_key)
    setEditingFieldJson(JSON.stringify(field, null, 2))
  }

  function handleCreateField(): void {
    if (!canCreateField) {
      return
    }

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
      type:""
    }

    setEditingFieldKey(NEW_FIELD_EDITOR_KEY)
    setEditingFieldJson(JSON.stringify(templateField, null, 2))
  }

  function handleCloseEditor(): void {
    setEditingFieldKey(null)
    setEditingFieldJson('')
  }

  function handleOpenExportModal(): void {
    setExportModalOpen(true)
  }

  function handleCloseExportModal(): void {
    setExportModalOpen(false)
  }

  function handleApplyFieldJson(): void {
    try {
      const parsed = JSON.parse(editingFieldJson) as unknown
      const isCreatingField = editingFieldKey === NEW_FIELD_EDITOR_KEY
      const canApplyFieldJson = isCreatingField ? canCreateField : canUpdateField

      if (!canApplyFieldJson) {
        return
      }

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
        maskClosable={false}
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
                disabled={
                  loading ||
                  saving ||
                  (hasConfigs ? !canUpdateField : !canCreateField)
                }
                onClick={() => void handleImportClick()}
              >
                {hasConfigs ? '重新导入 Excel' : '导入 Excel'}
              </Button>
              {canCreateField ? (
                <Button
                  disabled={loading || saving || importing || resetting}
                  onClick={handleCreateField}
                >
                  新增字段
                </Button>
              ) : null}
              <Button
                disabled={!hasConfigs || loading}
                onClick={handleOpenExportModal}
              >
                导出 JSON
              </Button>
              {canManageFieldConfig ? (
                <Button
                  type="primary"
                  disabled={!hasConfigs || loading}
                  loading={saving}
                  onClick={() => void handleSave()}
                >
                  保存
                </Button>
              ) : null}
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
                onEditField={canUpdateField ? handleEditField : undefined}
                onDeleteField={canDeleteField ? handleDeleteField : undefined}
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
                disabled={!canCreateField}
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
        maskClosable={false}
        okText="应用"
        cancelText="取消"
        destroyOnClose
        okButtonProps={{
          disabled: editingFieldKey === NEW_FIELD_EDITOR_KEY ? !canCreateField : !canUpdateField,
        }}
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
          disabled={editingFieldKey === NEW_FIELD_EDITOR_KEY ? !canCreateField : !canUpdateField}
          onChange={(event) => setEditingFieldJson(event.target.value)}
        />
      </Modal>

      <Modal
        title="字段配置 JSON"
        open={exportModalOpen}
        width={760}
        maskClosable={false}
        footer={null}
        destroyOnClose
        onCancel={handleCloseExportModal}
      >
        <Typography.Paragraph type="secondary">
          当前弹窗展示的是该项目已配置的全部字段 JSON 数据。
        </Typography.Paragraph>
        <Input.TextArea
          value={JSON.stringify(fieldConfigs, null, 2)}
          rows={20}
          readOnly
          className="project-field-config-json-editor"
        />
      </Modal>
    </>
  )
}
