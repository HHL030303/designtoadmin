import { useEffect, useMemo, useState } from 'react'
import { Card, Input, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useAppState } from '../context/AppStateContext'
import { adminService } from '../services/adminService'
import type { ProjectMemberRecord } from '../types'

export function ProjectMembersPage() {
  const { currentProject } = useAppState()
  const [members, setMembers] = useState<ProjectMemberRecord[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentProject) {
      setMembers([])
      return
    }

    const loadMembers = async () => {
      setLoading(true)

      try {
        const nextMembers = await adminService.listProjectMembers({
          page: 1,
          pageSize: 100,
          projectId: currentProject.id,
        })
        setMembers(nextMembers.items)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '加载项目成员失败')
      } finally {
        setLoading(false)
      }
    }

    void loadMembers()
  }, [currentProject])

  const filteredMembers = useMemo(
    () =>
      members.filter((member) =>
        [member.userName, member.userEmail, member.projectName, member.roleNames.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(keyword.trim().toLowerCase()),
      ),
    [keyword, members],
  )

  const columns: ColumnsType<ProjectMemberRecord> = [
    {
      title: '成员信息',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.userName}</Typography.Text>
          <Typography.Text type="secondary">{record.userEmail}</Typography.Text>
        </Space>
      ),
    },
    { title: '所属项目', dataIndex: 'projectName' },
    {
      title: '项目角色',
      render: (_, record) => (
        <Space size={[8, 8]} wrap>
          {record.roleNames.map((roleName) => (
            <Tag key={`${record.id}-${roleName}`} color="blue">
              {roleName}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      render: (_, record) =>
        record.userStatus === '启用' ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="default">停用</Tag>
        ),
    },
  ]

  return (
    <Card className="panel-card">
      <div className="workspace-header">
        <div className="workspace-header-main">
          <Typography.Title level={4} className="workspace-header-title">
            项目成员
          </Typography.Title>
        </div>
        <div className="workspace-header-side">
          <div className="workspace-kpi">
            <span className="workspace-kpi-value">{members.length}</span>
            <span className="workspace-kpi-label">成员总数</span>
          </div>
        </div>
      </div>

      <div className="workspace-filter-bar">
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索姓名 / 邮箱 / 项目 / 角色"
          className="workspace-filter-input"
        />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredMembers}
        loading={loading}
        pagination={{ pageSize: 8 }}
      />
    </Card>
  )
}
