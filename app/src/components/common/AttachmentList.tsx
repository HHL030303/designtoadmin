import { Button, Empty, Space, Typography } from 'antd'
import { DownloadOutlined, PaperClipOutlined } from '@ant-design/icons'
import type { AttachmentFile } from '../../types'
import { makeDemoDownload } from '../../utils/attachments'

export function AttachmentList({
  files,
  emptyText = '暂无附件',
  compact = false,
}: {
  files: AttachmentFile[]
  emptyText?: string
  compact?: boolean
}) {
  if (files.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
  }

  if (compact) {
    return (
      <Space orientation="vertical" size={8} className="attachment-list-compact">
        {files.map((file) => (
          <Space key={file.uid} className="attachment-list-row">
            <Space size={8}>
              <PaperClipOutlined />
              <Typography.Text>{file.name}</Typography.Text>
            </Space>
            <Button
              type="link"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => makeDemoDownload(file)}
            >
              下载
            </Button>
          </Space>
        ))}
      </Space>
    )
  }

  return (
    <Space orientation="vertical" size={10} className="attachment-list">
      {files.map((file) => (
        <div key={file.uid} className="attachment-list-item">
          <Space size={8}>
            <PaperClipOutlined />
            <Typography.Text>{file.name}</Typography.Text>
          </Space>
          <Button
            key="download"
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => makeDemoDownload(file)}
          >
            下载
          </Button>
        </div>
      ))}
    </Space>
  )
}
