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
import { roleLabelMap, roleOptions } from '../constants/roles'
import { useAppState } from '../context/AppStateContext'
import type { AdminAccountRecord, SaveAdminAccountPayload } from '../types'

export function AccountManagementPage() {
  const { accounts, currentUser, saveAdminAccount, deleteAdminAccount } = useAppState()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [editingAccount, setEditingAccount] = useState<AdminAccountRecord | null>(null)
  const [form] = Form.useForm<SaveAdminAccountPayload>()

  const filteredAccounts = useMemo(
    () =>
      accounts.filter((account) =>
        [account.name, account.username, account.phone, roleLabelMap[account.role]]
          .join(' ')
          .toLowerCase()
          .includes(keyword.trim().toLowerCase()),
      ),
    [accounts, keyword],
  )

  const columns: ColumnsType<AdminAccountRecord> = [
    {
      title: '账号信息',
      dataIndex: 'username',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">
            {record.username} · {record.email}
          </Typography.Text>
        </Space>
      ),
    },
    { title: '角色', render: (_, record) => roleLabelMap[record.role] },
    { title: '手机号', dataIndex: 'phone' },
    { title: '创建时间', dataIndex: 'createdAt' },
    { title: '最近登录', dataIndex: 'lastLoginAt' },
    {
      title: '状态',
      render: (_, record) =>
        record.status === '启用' ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="default">停用</Tag>
        ),
    },
    {
      title: '操作',
      width: 240,
      render: (_, record) => (
        <Space size={8}>
          <Button
            size="small"
            onClick={() => {
              setEditingAccount(record)
              form.setFieldsValue({
                username: record.username,
                name: record.name,
                role: record.role,
                status: record.status,
                phone: record.phone,
                email: record.email,
                note: record.note,
              })
              setDrawerOpen(true)
            }}
          >
            编辑
          </Button>
          <Button
            size="small"
            onClick={() =>
              saveAdminAccount(
                {
                  username: record.username,
                  name: record.name,
                  role: record.role,
                  status: record.status === '启用' ? '停用' : '启用',
                  phone: record.phone,
                  email: record.email,
                  note: record.note,
                },
                record.id,
              )
            }
            disabled={currentUser?.id === record.id}
          >
            {record.status === '启用' ? '停用' : '启用'}
          </Button>
          <Popconfirm
            title="确认删除该账号吗？"
            onConfirm={() => deleteAdminAccount(record.id)}
            disabled={currentUser?.id === record.id}
          >
            <Button danger size="small" disabled={currentUser?.id === record.id}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  function openCreateDrawer() {
    setEditingAccount(null)
    form.resetFields()
    form.setFieldsValue({ role: 'planner', status: '启用' })
    setDrawerOpen(true)
  }

  function handleFinish(values: SaveAdminAccountPayload) {
    saveAdminAccount(values, editingAccount?.id)
    setDrawerOpen(false)
    form.resetFields()
  }

  return (
    <Card className="panel-card">
      <div className="workspace-header">
        <div className="workspace-header-main">
          <Typography.Title level={4} className="workspace-header-title">
            账号管理
          </Typography.Title>
        </div>
        <div className="workspace-header-side">
          <div className="workspace-kpi">
            <span className="workspace-kpi-value">{accounts.length}</span>
            <span className="workspace-kpi-label">账号总数</span>
          </div>
          <Button type="primary" onClick={openCreateDrawer}>
            新增账号
          </Button>
        </div>
      </div>

      <div className="workspace-filter-bar">
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索姓名 / 账号 / 手机号 / 角色"
          className="workspace-filter-input"
        />
      </div>

      <Table rowKey="id" columns={columns} dataSource={filteredAccounts} pagination={{ pageSize: 8 }} />

      <Drawer
        title={editingAccount ? '编辑账号' : '新增账号'}
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input placeholder="请输入登录账号" />
          </Form.Item>
          <Form.Item label="角色" name="role" rules={[{ required: true, message: '请选择角色' }]}>
            <Select options={roleOptions.map((item) => ({ label: item.label, value: item.key }))} />
          </Form.Item>
          <Form.Item label="手机号" name="phone" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
            <Select options={[{ label: '启用', value: '启用' }, { label: '停用', value: '停用' }]} />
          </Form.Item>
          <Form.Item label="备注" name="note">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>

          <Space className="form-footer-actions">
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit">
              保存账号
            </Button>
          </Space>
        </Form>
      </Drawer>
    </Card>
  )
}
