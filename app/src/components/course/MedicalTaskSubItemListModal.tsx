import { useEffect, useState } from 'react'
import { Button, Modal, Popconfirm, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useAppState } from '../../context/AppStateContext'
import { taskService } from '../../services/taskService'
import type { MedicalTaskSubItemRecord, UpdateMedicalTaskSubItemPayload } from '../../types'
import { MedicalTaskSubItemConfirmModal } from './MedicalTaskSubItemConfirmModal'

const PAGE_SIZE = 20

const STATUS_LABELS: Record<string, string> = {
  confirmed: '已完成并确认',
  cancelled: '已取消',
  completed: '已确认待完成',
  pending: '待处理',
  processing: '处理中',
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'green',
  cancelled: 'default',
  completed: 'blue',
  pending: 'gold',
  processing: 'processing',
}

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status ?? '未知状态'
}

function canCancel(status: string): boolean {
  return status !== 'confirmed' && status !== 'cancelled'
}

function canComplete(status: string): boolean {
  return status !== 'confirmed' && status === 'processing'
}

function canConfirm(status: string): boolean {
  return status === 'completed' 
}

export function MedicalTaskSubItemListModal({
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
  const { currentUser, hasButtonPermissionAction } = useAppState()
  const [items, setItems] = useState<MedicalTaskSubItemRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MedicalTaskSubItemRecord | null>(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  })
  const canUpdateAdditionalWork = hasButtonPermissionAction('additional_work', 'update')

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
      const response = await taskService.listMedicalSubItems({
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
      message.error(error instanceof Error ? error.message : '子项列表加载失败')
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

  async function handleConfirmDemandSubmit(
    values: UpdateMedicalTaskSubItemPayload,
  ): Promise<void> {
    if (!editingItem) {
      return
    }

    try {
      setActionLoading(true)
      await taskService.updateMedicalSubItem(editingItem.id, {
        description: values.description,
        extra_fee_amount: values.amount,
        item_type: values.subItemType,
        owner_id: currentUser?.id ? Number(currentUser.id) : undefined,
        remark: values.remark,
        title: values.title,
      })
      await taskService.completeMedicalSubItem(editingItem.id, {
        remark: values.remark,
      })
      message.success('子项任务已确认')
      setConfirmModalOpen(false)
      setEditingItem(null)
      await loadItems(pagination.current, pagination.pageSize)
      await onChanged?.()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '子项任务操作失败')
    } finally {
      setActionLoading(false)
    }
  }

  const columns: ColumnsType<MedicalTaskSubItemRecord> = [
    {
      dataIndex: 'title',
      key: 'title',
      title: '标题',
      width: 220,
      render: (value?: string) => value || '-',
    },
    // {
    //   dataIndex: 'subItemType',
    //   key: 'subItemType',
    //   title: '子项类型',
    //   width: 180,
    // },
    // {
    //   dataIndex: 'description',
    //   key: 'description',
    //   title: '描述',
    //   width: 180,
    //   render: (value?: string) => value || '-',
    // },
    {
      dataIndex: 'amount',
      key: 'amount',
      title: '增项金额',
      width: 140,
      render: (value?: number) => (value === undefined ? '-' : value),
    },
    {
      dataIndex: 'remark',
      key: 'remark',
      title: '备注',
      width: 180,
      render: (value?: string) => value || '-',
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
    ...(canUpdateAdditionalWork
      ? [{
          key: 'actions',
          title: '操作',
          width: 120,
          render: (_: unknown, record: MedicalTaskSubItemRecord) => (
            <Space size="small">
              <Popconfirm
                title="确认完成子项任务？"
                okText="确认"
                cancelText="取消"
                disabled={!canConfirm(record.status)}
                onConfirm={() => runAction(
                  () => taskService.confirmMedicalSubItem(record.id, {
                    extra_fee_amount: record.amount,
                    remark: record.remark,
                  }),
                  '子项任务已完成',
                  '完成子项任务失败',
                )}
              >
                <Button
                  size="small"
                  type="link"
                  disabled={!canConfirm(record.status)}
                >
                  完成需求
                </Button>
              </Popconfirm>
              <Popconfirm
                title="确认取消当前子项任务？"
                okText="确认"
                cancelText="取消"
                disabled={!canCancel(record.status)}
                onConfirm={() => runAction(
                  () => taskService.cancelMedicalSubItem(record.id),
                  '子项任务已取消',
                  '取消子项任务失败',
                )}
              >
                <Button
                  size="small"
                  type="link"
                  danger
                  disabled={!canCancel(record.status)}
                >
                  取消需求
                </Button>
              </Popconfirm>
              <Button
                size="small"
                type="link"
                disabled={!canComplete(record.status)}
                onClick={() => {
                  setEditingItem(record)
                  setConfirmModalOpen(true)
                }}
              >
                确认需求
              </Button>
            </Space>
          ),
        }]
      : []),
  ]

  return (
    <Modal
      title="子项列表"
      open={open}
      maskClosable={false}
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width={1100}
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
      <MedicalTaskSubItemConfirmModal
        open={confirmModalOpen}
        loading={actionLoading}
        item={editingItem}
        onCancel={() => {
          setConfirmModalOpen(false)
          setEditingItem(null)
        }}
        onSubmit={handleConfirmDemandSubmit}
      />
    </Modal>
  )
}
