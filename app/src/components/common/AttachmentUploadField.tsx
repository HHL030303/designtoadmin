import { Button, Space, Typography, Upload, message } from 'antd'
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
  maxCount,
  fileNamePattern,
  multiple = true,
  helperText,
  compact = false,
}: {
  value?: AttachmentFile[]
  onChange?: (files: AttachmentFile[]) => void
  disabled?: boolean
  accept?: string
  maxCount?: number
  fileNamePattern?: string
  multiple?: boolean
  helperText?: string
  compact?: boolean
}) {
  function isFileNameMatched(fileName: string) {
    if (!fileNamePattern) {
      return true
    }

    try {
      return new RegExp(fileNamePattern).test(fileName)
    } catch {
      return true
    }
  }

  function normalizeNextFiles(fileList: UploadFile[]) {
    const invalidNames = fileList
      .filter((file) => !isFileNameMatched(file.name))
      .map((file) => file.name)

    if (invalidNames.length > 0) {
      message.warning(`以下文件命名不符合当前规则，已自动忽略：${invalidNames.join('、')}`)
    }

    const validFiles = fileList.filter((file) => isFileNameMatched(file.name))

    if (maxCount && validFiles.length > maxCount) {
      message.warning(`当前上传项最多只能上传 ${maxCount} 个文件，超出部分已自动忽略`)
    }

    return maxCount ? validFiles.slice(0, maxCount) : validFiles
  }

  const uploadProps: UploadProps = {
    accept,
    multiple,
    disabled,
    fileList: value.map(toUploadFile),
    beforeUpload: (file) => {
      if (!isFileNameMatched(file.name)) {
        message.warning(`文件“${file.name}”命名不符合当前规则`)
        return Upload.LIST_IGNORE
      }

      if (maxCount && value.length >= maxCount) {
        message.warning(`当前上传项最多只能上传 ${maxCount} 个文件`)
        return Upload.LIST_IGNORE
      }

      return true
    },
    customRequest: ({ onSuccess }) => {
      window.setTimeout(() => onSuccess?.('ok'), 0)
    },
    onChange: ({ fileList }) => {
      const previousMap = new Map(value.map((file) => [file.uid, file]))
      const normalizedFiles = normalizeNextFiles(fileList)
      onChange?.(
        normalizedFiles.map((file) => toAttachmentFile(file, previousMap.get(file.uid))),
      )
    },
  }

  return (
    <Space
      orientation="vertical"
      size={compact ? 8 : 12}
      className={`attachment-upload-stack${compact ? ' attachment-upload-stack-compact' : ''}`}
    >
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
