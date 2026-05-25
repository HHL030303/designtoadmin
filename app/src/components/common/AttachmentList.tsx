import { Button, Collapse, Empty, Space, Typography } from 'antd'
import { DownloadOutlined, FolderOpenOutlined, PaperClipOutlined } from '@ant-design/icons'
import type { AttachmentFile } from '../../types'
import { makeDemoDownload } from '../../utils/attachments'

type FolderGroup = {
  files: AttachmentFile[]
  folderPath: string
  label: string
}

function getFolderGroup(file: AttachmentFile): FolderGroup | null {
  const originalPath = file.originalPath?.trim()

  if (!originalPath) {
    return null
  }

  return {
    files: [file],
    folderPath: originalPath,
    label: originalPath,
  }
}

function buildAttachmentGroups(files: AttachmentFile[]) {
  const directFiles: AttachmentFile[] = []
  const folderGroupsMap = new Map<string, FolderGroup>()

  files.forEach((file) => {
    const folderGroup = getFolderGroup(file)

    if (!folderGroup) {
      directFiles.push(file)
      return
    }

    const existingGroup = folderGroupsMap.get(folderGroup.folderPath)

    if (existingGroup) {
      existingGroup.files.push(file)
      return
    }

    folderGroupsMap.set(folderGroup.folderPath, folderGroup)
  })

  return {
    directFiles,
    folderGroups: Array.from(folderGroupsMap.values()),
  }
}

export function AttachmentList({
  files,
  emptyText = '暂无附件',
  compact = false,
  groupFolders = false,
}: {
  files: AttachmentFile[]
  emptyText?: string
  compact?: boolean
  groupFolders?: boolean
}) {
  if (files.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
  }

  const { directFiles, folderGroups } = groupFolders
    ? buildAttachmentGroups(files)
    : { directFiles: files, folderGroups: [] }

  if (compact) {
    return (
      <Space orientation="vertical" size={8} className="attachment-list-compact">
        {directFiles.map((file) => (
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
        {folderGroups.map((group) => (
          <Collapse
            key={group.folderPath}
            size="small"
            items={[
              {
                key: group.folderPath,
                label: (
                  <Space size={8}>
                    <FolderOpenOutlined />
                    <Typography.Text>{`${group.label} (${group.files.length})`}</Typography.Text>
                  </Space>
                ),
                children: (
                  <Space orientation="vertical" size={8} className="attachment-list-compact">
                    {group.files.map((file) => (
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
                ),
              },
            ]}
          />
        ))}
      </Space>
    )
  }

  return (
    <Space orientation="vertical" size={10} className="attachment-list">
      {directFiles.map((file) => (
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
      {folderGroups.map((group) => (
        <Collapse
          key={group.folderPath}
          items={[
            {
              key: group.folderPath,
              label: (
                <Space size={8}>
                  <FolderOpenOutlined />
                  <Typography.Text>{`${group.label} (${group.files.length})`}</Typography.Text>
                </Space>
              ),
              children: (
                <Space orientation="vertical" size={10} className="attachment-list">
                  {group.files.map((file) => (
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
              ),
            },
          ]}
        />
      ))}
    </Space>
  )
}
