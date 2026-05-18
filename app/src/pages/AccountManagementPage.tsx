import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { adminService } from '../services/adminService'
import type { AdminAccountRecord, SaveAdminAccountPayload } from '../types'

type AccountFormValues = SaveAdminAccountPayload

export function AccountManagementPage() {
  const [accounts, setAccounts] = useState<AdminAccountRecord[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AdminAccountRecord | null>(null)
  const [keyword, setKeyword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm<AccountFormValues>()

  async function loadAccounts(searchKeyword = '') {
    setLoading(true)

    try {
      const nextAccounts = await adminService.listUsers(searchKeyword)
      setAccounts(nextAccounts)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载账号列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () =>{
    setKeyword('')
  }

  const handleQuery =()=>{
    setKeyword(keyword)
  }

  useEffect(() => {
    void loadAccounts()
  }, [])

  const filteredAccounts = useMemo(
    () =>
      accounts.filter((account) =>
        [account.name, account.email, account.status]
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
          <Typography.Text type="secondary">{record.email}</Typography.Text>
        </Space>
      ),
    },
    { title: '创建时间', dataIndex: 'createdAt' },
    { title: '更新时间', dataIndex: 'updatedAt' },
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
      width: 120,
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setEditingAccount(record)
            form.setFieldsValue({
              email: record.email,
              name: record.name,
              password: '',
              status: record.status,
            })
            setDrawerOpen(true)
          }}
        >
          编辑
        </Button>
      ),
    },
  ]

  function openCreateDrawer() {
    setEditingAccount(null)
    form.resetFields()
    form.setFieldsValue({ status: '启用' })
    setDrawerOpen(true)
  }

  async function handleFinish(values: AccountFormValues) {
    setSubmitting(true)

    try {
      if (editingAccount) {
        await adminService.updateUser(editingAccount.id, {
          name: values.name.trim(),
          status: values.status === '停用' ? 'disabled' : 'enabled',
        })

        if (values.password?.trim()) {
          await adminService.resetUserPassword(editingAccount.id, values.password.trim())
        }

        message.success('账号更新成功')
      } else {
        await adminService.createUser(values)
        message.success('账号创建成功')
      }

      setDrawerOpen(false)
      setEditingAccount(null)
      form.resetFields()
      await loadAccounts(keyword)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存账号失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="panel-card">
      <div className="workspace-header">
        {/* <div className="workspace-header-main">
          <Typography.Title level={4} className="workspace-header-title">
            账号管理
          </Typography.Title>
        </div> */}
        {/* <div className="workspace-header-side">
          <div className="workspace-kpi">
            <span className="workspace-kpi-value">{accounts.length}</span>
            <span className="workspace-kpi-label">账号总数</span>
          </div>
    
        </div> */}
      </div>

      <div className="workspace-filter-bar">
        <div className='workspace-search'> 
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索姓名 / 邮箱 / 状态"
          className="workspace-filter-input"
        />
          <Button type="primary"  onClick={handleQuery}>
              查询
            </Button>
            <Button onClick={handleReset}>重置</Button>
        </div>
        <div className='workspace-reset'>
          <Button type="primary" onClick={openCreateDrawer}>
            新增账号
          </Button>
        </div>
      
        
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredAccounts}
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      <Drawer
        title={editingAccount ? '编辑账号' : '新增账号'}
        size={520}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditingAccount(null)
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(values) => void handleFinish(values)}>
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input placeholder="请输入登录邮箱" disabled={Boolean(editingAccount)} />
          </Form.Item>
          <Form.Item
            label={editingAccount ? '新密码' : '初始密码'}
            name="password"
            rules={
              editingAccount
                ? []
                : [{ required: true, message: '请输入初始密码' }]
            }
          >
            <Input.Password
              placeholder={editingAccount ? '不修改密码可留空' : '请输入初始密码'}
            />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="启用">
            <Select
              options={[
                { label: '启用', value: '启用' },
                { label: '停用', value: '停用' },
              ]}
            />
          </Form.Item>

          <Space className="form-footer-actions">
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingAccount ? '保存修改' : '保存账号'}
            </Button>
          </Space>
        </Form>
      </Drawer>
    </Card>
  )
}
