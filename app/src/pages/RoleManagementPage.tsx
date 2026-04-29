import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { leafNavItems } from '../constants/navigation'
import { useAppState } from '../context/AppStateContext'
import type { SaveSystemRolePayload, SystemRoleRecord, UserRole, ViewKey } from '../types'

const pageOptions = leafNavItems.map((item) => ({
  label: item.label,
  value: item.viewKey as ViewKey,
}))

export function RoleManagementPage() {
  const { accounts, systemRoles, saveSystemRole, deleteSystemRole } = useAppState()
  const [keyword, setKeyword] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<SystemRoleRecord | null>(null)
  const [form] = Form.useForm<SaveSystemRolePayload>()

  const filteredRoles = useMemo(
    () =>
      systemRoles.filter((role) =>
        [role.name, role.code, role.description, role.scope]
          .join(' ')
          .toLowerCase()
          .includes(keyword.trim().toLowerCase()),
      ),
    [keyword, systemRoles],
  )

  const columns: ColumnsType<SystemRoleRecord> = [
    {
      title: '角色信息',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">
            {record.code} · {record.scope}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '权限页面',
      render: (_, record) => (
        <Typography.Text>
          {record.viewAccess.map((view) => pageOptions.find((item) => item.value === view)?.label ?? view).join('、')}
        </Typography.Text>
      ),
    },
    {
      title: '成员数',
      render: (_, record) => {
        const builtInCount = accounts.filter((account) => account.role === (record.code as UserRole)).length
        return builtInCount || record.memberCount
      },
    },
    {
      title: '状态',
      render: (_, record) =>
        record.status === '启用' ? <Tag color="success">启用</Tag> : <Tag color="default">停用</Tag>,
    },
    {
      title: '操作',
      width: 240,
      render: (_, record) => (
        <Space size={8}>
          <Button
            size="small"
            onClick={() => {
              setEditingRole(record)
              form.setFieldsValue({
                code: record.code,
                name: record.name,
                description: record.description,
                status: record.status,
                scope: record.scope,
                viewAccess: record.viewAccess,
              })
              setDrawerOpen(true)
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            onClick={() =>
              saveSystemRole(
                {
                  code: record.code,
                  name: record.name,
                  description: record.description,
                  status: record.status === '启用' ? '停用' : '启用',
                  scope: record.scope,
                  viewAccess: record.viewAccess,
                },
                record.id,
              )
            }
          >
            {record.status === '启用' ? '停用' : '启用'}
          </Button>
          <Popconfirm title="确认删除该角色吗？" onConfirm={() => deleteSystemRole(record.id)}>
            <Button danger size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  function openCreateDrawer() {
    setEditingRole(null)
    form.resetFields()
    form.setFieldsValue({ status: '启用', viewAccess: ['dashboard'], scope: '自定义角色' })
    setDrawerOpen(true)
  }

  function handleFinish(values: SaveSystemRolePayload) {
    saveSystemRole(values, editingRole?.id)
    setDrawerOpen(false)
    form.resetFields()
  }

  return (
    <Card className="panel-card">
      <div className="workspace-header">
        <div className="workspace-header-main">
          <Typography.Title level={4} className="workspace-header-title">
            角色管理
          </Typography.Title>
        </div>
        <div className="workspace-header-side">
          <div className="workspace-kpi">
            <span className="workspace-kpi-value">{systemRoles.length}</span>
            <span className="workspace-kpi-label">角色总数</span>
          </div>
          <Button type="primary" onClick={openCreateDrawer}>
            新增角色
          </Button>
        </div>
      </div>

      <div className="workspace-filter-bar">
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索角色名称 / 编码 / 描述"
          className="workspace-filter-input"
        />
      </div>

      <Table rowKey="id" columns={columns} dataSource={filteredRoles} pagination={{ pageSize: 8 }} />

      <Drawer
        title={editingRole ? '编辑角色' : '新增角色'}
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item label="角色名称" name="name" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="请输入角色名称" />
          </Form.Item>
          <Form.Item label="角色编码" name="code" rules={[{ required: true, message: '请输入角色编码' }]}>
            <Input placeholder="请输入角色编码" />
          </Form.Item>
          <Form.Item label="角色描述" name="description" rules={[{ required: true, message: '请输入角色描述' }]}>
            <Input.TextArea rows={3} placeholder="请输入角色描述" />
          </Form.Item>
          <Form.Item label="权限范围" name="viewAccess" rules={[{ required: true, message: '请选择权限页面' }]}>
            <Select mode="multiple" options={pageOptions} placeholder="请选择可访问页面" />
          </Form.Item>
          <Form.Item label="角色范围" name="scope" rules={[{ required: true, message: '请输入角色范围' }]}>
            <Input placeholder="如：系统内置角色 / 自定义角色" />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
            <Select options={[{ label: '启用', value: '启用' }, { label: '停用', value: '停用' }]} />
          </Form.Item>

          <Space className="form-footer-actions">
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit">
              保存角色
            </Button>
          </Space>
        </Form>
      </Drawer>
    </Card>
  )
}
