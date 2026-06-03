import { Checkbox, Empty, Modal, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ROLE_PERMISSION_ACTION_OPTIONS,
  normalizeRolePermissionActions,
} from '../../constants/rolePermissions'
import type { RolePermissionAction, RolePermissionRecord } from '../../types'

type RolePermissionConfigModalProps = {
  loading?: boolean
  open: boolean
  permissions: RolePermissionRecord[]
  roleName?: string
  saving?: boolean
  onCancel: () => void
  onChange: (resourceCode: string, actions: RolePermissionAction[]) => void
  onSubmit: () => void
}

export function RolePermissionConfigModal({
  loading = false,
  open,
  permissions,
  roleName,
  saving = false,
  onCancel,
  onChange,
  onSubmit,
}: RolePermissionConfigModalProps) {
  const columns: ColumnsType<RolePermissionRecord> = [
    {
      dataIndex: 'resourceName',
      title: '菜单名称',
      width: 220,
    },
    {
      title: '操作权限',
      render: (_, record) => (
        <Checkbox.Group
          options={ROLE_PERMISSION_ACTION_OPTIONS}
          value={record.actions}
          onChange={(checkedValues) => {
            // “全部”是聚合选项，这里统一归一化，避免同时带着 all 和单项动作。
            onChange(
              record.resourceCode,
              normalizeRolePermissionActions(checkedValues as RolePermissionAction[]),
            )
          }}
        />
      ),
    },
  ]

  return (
    <Modal
      destroyOnClose
      centered
      maskClosable={false}
      open={open}
      width={980}
      title={roleName ? `${roleName} · 权限配置` : '权限配置'}
      okText="确定"
      cancelText="取消"
      confirmLoading={saving}
      onCancel={onCancel}
      onOk={onSubmit}
    >
      <Typography.Paragraph type="secondary">
        按菜单资源配置该角色可执行的操作权限，支持多选。
      </Typography.Paragraph>

      <Table
        rowKey="resourceCode"
        columns={columns}
        dataSource={permissions}
        loading={loading}
        pagination={false}
        locale={{
          emptyText: loading ? '权限加载中...' : <Empty description="暂无权限资源" />,
        }}
      />
    </Modal>
  )
}
