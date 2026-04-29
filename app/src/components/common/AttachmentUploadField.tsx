import { Button, Space, Typography, Upload } from 'antd'
import { InboxOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import type { AttachmentFile } from '../../types'

function toUploadFile(file: AttachmentFile): UploadFile {
  return {
    uid: file.uid,
    name: file.name,
    size: file.size,
    type: file.type,
    status: 'done',
  }
}

function toAttachmentFile(file: UploadFile, previous?: AttachmentFile): AttachmentFile {
  return {
    uid: file.uid,
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: previous?.uploadedAt ?? '2026-04-20 10:30',
  }
}

export function AttachmentUploadField({
  value = [],
  onChange,
  disabled,
  accept,
  multiple = true,
  helperText,
}: {
  value?: AttachmentFile[]
  onChange?: (files: AttachmentFile[]) => void
  disabled?: boolean
  accept?: string
  multiple?: boolean
  helperText?: string
}) {
  const uploadProps: UploadProps = {
    accept,
    multiple,
    disabled,
    fileList: value.map(toUploadFile),
    customRequest: ({ onSuccess }) => {
      window.setTimeout(() => onSuccess?.('ok'), 0)
    },
    onChange: ({ fileList }) => {
      const previousMap = new Map(value.map((file) => [file.uid, file]))
      onChange?.(fileList.map((file) => toAttachmentFile(file, previousMap.get(file.uid))))
    },
  }

  return (
    <Space direction="vertical" size={12} className="attachment-upload-stack">
      <Upload.Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到这里上传</p>
        <p className="ant-upload-hint">当前为前端演示上传，不会发起真实网络请求。</p>
      </Upload.Dragger>
      <Upload {...uploadProps} showUploadList={false}>
        <Button icon={<UploadOutlined />} disabled={disabled}>
          继续选择文件
        </Button>
      </Upload>
      {helperText ? <Typography.Text className="card-helper-text">{helperText}</Typography.Text> : null}
    </Space>
  )
}
