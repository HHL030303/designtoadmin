import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button, Empty, Space, Spin, Typography, message } from 'antd'
import { TaskHistoryDetailPanel } from '../components/course/TaskHistoryDetailPanel'
import { TaskProcessModal } from '../components/course/TaskProcessModal'
import { useAppState } from '../context/AppStateContext'
import { taskService } from '../services/taskService'
import type { TaskDetailRecord } from '../types'
import './CourseTaskDetailPage.css'

function canProcessCurrentTask(detail: TaskDetailRecord | null, currentUserId?: string): boolean {
  if (!detail?.currentStage || !currentUserId) {
    return false
  }

  return detail.currentStage.stageAssignees.some((assignee) => assignee.userId === currentUserId)
}

export function CourseTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentUser } = useAppState()
  const [detail, setDetail] = useState<TaskDetailRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [processingOpen, setProcessingOpen] = useState(false)
  const versionId = searchParams.get('versionId') ?? undefined

  const canProcessTask = useMemo(
    () => canProcessCurrentTask(detail, currentUser?.id),
    [currentUser?.id, detail],
  )

  async function loadDetail(): Promise<void> {
    if (!taskId) {
      setDetail(null)
      return
    }

    try {
      setLoading(true)
      const response = await taskService.getTaskDetail(taskId, { versionId })
      setDetail(response)
    } catch (error) {
      setDetail(null)
      message.error(error instanceof Error ? error.message : '任务详情加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [taskId, versionId])

  function handleSelectVersion(nextVersionId: string) {
    const nextParams = new URLSearchParams(searchParams)

    // 历史版本切换直接写回 URL，这样刷新、分享链接、返回上一页时都能保留当前查看版本。
    if (nextVersionId === detail?.currentVersion.id && !versionId) {
      nextParams.delete('versionId')
    } else {
      nextParams.set('versionId', nextVersionId)
    }

    setSearchParams(nextParams)
  }

  return (
    <div className="course-task-detail-page">
      <div className="course-task-detail-page__header">
        <div>
          <Typography.Title level={3} className="course-task-detail-page__title">
          {detail?.task?.title||'任务详情'} 
          </Typography.Title>
          <Typography.Paragraph
            type="secondary"
            className="course-task-detail-page__description"
          >
            查看任务当前流程、历史文件，并在需要时直接处理当前节点。1
          </Typography.Paragraph>
        </div>
        <Space>
          {canProcessTask ? (
            <Button danger type="primary" onClick={() => setProcessingOpen(true)}>
              处理
            </Button>
          ) : null}
          {/* <Button
            aria-label="关闭详情页"
            icon={<CloseOutlined />}
            onClick={handleClose}
          /> */}
        </Space>
      </div>

      {loading ? (
        <div className="table-expanded-panel">
          <Spin />
        </div>
      ) : detail ? (
        <TaskHistoryDetailPanel
          detail={detail}
          selectedVersionId={versionId}
          onSelectVersion={handleSelectVersion}
          onUpdated={async () => {
            await loadDetail()
          }}
        />
      ) : (
        <div className="table-expanded-panel">
          <Empty description="暂无任务详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </div>
      )}

      <TaskProcessModal
        open={processingOpen}
        taskId={taskId}
        onClose={() => {
          setProcessingOpen(false)
          void loadDetail()
        }}
        onProcessed={async () => {
          setProcessingOpen(false)
          await loadDetail()
        }}
      />
    </div>
  )
}
