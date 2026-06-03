import { useEffect, useState } from 'react'
import { Button, Modal, Popconfirm, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { MedicalTaskComplaintRecord } from '../../types'
import { taskService } from '../../services/taskService'

const PAGE_SIZE = 20

const STATUS_LABELS: Record<string, string> = {
  cancelled: '已取消',
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
}

const STATUS_COLORS: Record<string, string> = {
  cancelled: 'default',
  pending: 'gold',
  processing: 'processing',
  resolved: 'green',
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status ?? '未知状态'
}

function canResolve(status: string): boolean {
  return !['cancelled', 'resolved'].includes(status)
}

function canCancel(status: string): boolean {
  return !['cancelled', 'resolved'].includes(status)
}

export function MedicalTaskComplaintListModal({
  open,
  taskId,
  onCancel,
  onChanged,
}: {
  open: boolean
  taskId?: string
  onCancel: () => void
  onChanged?: () => Promise<void> | void
}) {
  const [items, setItems] = useState<MedicalTaskComplaintRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  })

  async function loadItems(page = 1, pageSize = pagination.pageSize): Promise<void> {
    if (!taskId) {
      setItems([])
      setPagination((current) => ({
        ...current,
        current: 1,
        total: 0,
      }))
      return
    }

    try {
      setLoading(true)
      const response = await taskService.listMedicalComplaints({
        page,
        pageSize,
        taskId,
      })
      setItems(response.items)
      setPagination({
        current: response.page,
        pageSize: response.pageSize,
        total: response.total,
      })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '客诉列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }

    void loadItems(1, PAGE_SIZE)
  }, [open, taskId])

  async function runAction(
    request: () => Promise<void>,
    successMessage: string,
    errorMessage: string,
  ): Promise<void> {
    try {
      setActionLoading(true)
      await request()
      message.success(successMessage)
      await loadItems(pagination.current, pagination.pageSize)
      await onChanged?.()
    } catch (error) {
      message.error(error instanceof Error ? error.message : errorMessage)
    } finally {
      setActionLoading(false)
    }
  }

  const columns: ColumnsType<MedicalTaskComplaintRecord> = [
    {
      dataIndex: 'complaintNo',
      key: 'complaintNo',
      title: '客诉编号',
      width: 120,
      render: (value?: string) => value || '-',
    },
    {
      dataIndex: 'workflowStageName',
      key: 'workflowStageName',
      title: '发生阶段',
      width: 140,
      render: (value?: string) => value || '-',
    },
    {
      dataIndex: 'description',
      key: 'description',
      title: '问题描述',
      width: 220,
      render: (value: string) => value || '-',
    },
    {
      dataIndex: 'responsibilityUserNames',
      key: 'responsibilityUserNames',
      title: '责任方',
      width: 180,
      render: (value: string[]) => (value.length > 0 ? value.join(' / ') : '-'),
    },
    {
      dataIndex: 'processingMethod',
      key: 'processingMethod',
      title: '处理方式',
      width: 180,
      render: (value?: string) => value || '-',
    },
    {
      dataIndex: 'refundAmount',
      key: 'refundAmount',
      title: '退款金额',
      width: 120,
      render: (value?: number) => (value === undefined ? '-' : value),
    },
    {
      dataIndex: 'status',
      key: 'status',
      title: '状态',
      width: 120,
      render: (value: string) => (
        <Tag color={STATUS_COLORS[value] ?? 'default'}>{getStatusLabel(value)}</Tag>
      ),
    },
    {
      dataIndex: 'createdAt',
      key: 'createdAt',
      title: '创建时间',
      width: 180,
      render: (value?: string) => value || '-',
    },
    {
      key: 'actions',
      title: '操作',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Popconfirm
            title="确认将当前客诉标记为已解决？"
            okText="确认"
            cancelText="取消"
            disabled={!canResolve(record.status)}
            onConfirm={() => runAction(
              () => taskService.resolveMedicalComplaint(record.id, {
                handling_method: record.processingMethod,
                refund_amount: record.refundAmount,
                remark: record.remark,
              }),
              '客诉已解决',
              '解决客诉失败',
            )}
          >
            <Button
              size="small"
              type="link"
              disabled={!canResolve(record.status) || actionLoading}
            >
              解决客诉
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认取消当前客诉？"
            okText="确认"
            cancelText="取消"
            disabled={!canCancel(record.status)}
            onConfirm={() => runAction(
              () => taskService.cancelMedicalComplaint(record.id),
              '客诉已取消',
              '取消客诉失败',
            )}
          >
            <Button
              size="small"
              type="link"
              danger
              disabled={!canCancel(record.status) || actionLoading}
            >
              取消客诉
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Modal
      title="客诉列表"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width={1200}
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading || actionLoading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showTotal: (value) => `共 ${value} 条`,
        }}
        onChange={(nextPagination) => {
          const nextPage = nextPagination.current ?? 1
          const nextPageSize = nextPagination.pageSize ?? PAGE_SIZE
          void loadItems(nextPage, nextPageSize)
        }}
      />
    </Modal>
  )
}
