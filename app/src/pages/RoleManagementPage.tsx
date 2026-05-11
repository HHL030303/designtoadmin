import { useEffect, useMemo, useState } from 'react'
import { Card, Input, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { leafNavItems } from '../constants/navigation'
import { useAppState } from '../context/AppStateContext'
import { adminService } from '../services/adminService'
import type { SystemRoleRecord, ViewKey } from '../types'

const pageOptions = leafNavItems.map((item) => ({
  label: item.label,
  value: item.viewKey as ViewKey,
}))

export function RoleManagementPage() {
  const { currentProject } = useAppState()
  const [roles, setRoles] = useState<SystemRoleRecord[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentProject) {
      setRoles([])
      return
    }

    const loadRoles = async () => {
      setLoading(true)

      try {
        const nextRoles = await adminService.listRoles(currentProject.id)
        setRoles(nextRoles)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '加载角色列表失败')
      } finally {
        setLoading(false)
      }
    }

    void loadRoles()
  }, [currentProject])

  const filteredRoles = useMemo(
    () =>
      roles.filter((role) =>
        [role.name, role.code, role.description, role.scope]
          .join(' ')
          .toLowerCase()
          .includes(keyword.trim().toLowerCase()),
      ),
    [keyword, roles],
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
          {record.viewAccess
            .map((view) => pageOptions.find((item) => item.value === view)?.label ?? view)
            .join('、')}
        </Typography.Text>
      ),
    },
    { title: '成员数', dataIndex: 'memberCount' },
    {
      title: '范围',
      render: (_, record) => (
        <Tag color={record.scope === '全局' ? 'gold' : 'blue'}>{record.scope}</Tag>
      ),
    },
  ]

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
            <span className="workspace-kpi-value">{roles.length}</span>
            <span className="workspace-kpi-label">角色总数</span>
          </div>
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

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredRoles}
        loading={loading}
        pagination={{ pageSize: 8 }}
      />
    </Card>
  )
}
