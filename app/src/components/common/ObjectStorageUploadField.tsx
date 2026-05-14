import { useMemo, useState } from 'react'
import { Button, Progress, Space, Typography, Upload, message } from 'antd'
import { DeleteOutlined, InboxOutlined, LoadingOutlined, UploadOutlined } from '@ant-design/icons'
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface'
import type { AttachmentFile } from '../../types'
import { objectStorageService } from '../../services/objectStorageService'
import { buildFileChecksum } from '../../utils/fileChecksum'

type UploadingItem = {
    error?: string
    file: UploadFile
}

function toUploadedFileItem(file: AttachmentFile): UploadFile {
    return {
        name: file.name,
        percent: 100,
        size: file.size,
        status: 'done',
        type: file.type,
        uid: file.uid,
        url: file.url,
    }
}

function toAttachmentFile(
    file: RcFile,
    uploaded: Awaited<ReturnType<typeof objectStorageService.uploadFile>>,
    checksum: string,
) {
    const fileExt = uploaded.fileName.includes('.')
        ? uploaded.fileName.split('.').pop() ?? ''
        : ''

    return {
        checksum,
        fileExt,
        name: uploaded.fileName,
        size: uploaded.fileSize,
        storageKey: uploaded.key,
        type: uploaded.fileType || file.type,
        uid: `${uploaded.key}-${Math.random().toString(36).slice(2, 8)}`,
        uploadedAt: new Date().toISOString(),
        url: uploaded.url,
    } satisfies AttachmentFile
}

export function ObjectStorageUploadField({
    value = [],
    onChange,
    disabled,
    accept,
    helperText,
    compact = false,
    fileNamePattern,
    maxCount,
    maxFileSizeInMb = 200,
    multiple = true,
    uploadPrefix,
}: {
    value?: AttachmentFile[]
    onChange?: (files: AttachmentFile[]) => void
    disabled?: boolean
    accept?: string
    helperText?: string
    compact?: boolean
    fileNamePattern?: string
    maxCount?: number
    maxFileSizeInMb?: number
    multiple?: boolean
    uploadPrefix?: string
}) {
    const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([])
    const visibleFileList = useMemo(
        () => [...value.map(toUploadedFileItem), ...uploadingItems.map((item) => item.file)],
        [uploadingItems, value],
    )

    function updateUploadingFile(uid: string, patch: Partial<UploadFile>, error?: string) {
        setUploadingItems((current) =>
            current.map((item) =>
                item.file.uid === uid
                    ? {
                        ...item,
                        error,
                        file: {
                            ...item.file,
                            ...patch,
                        },
                    }
                    : item,
            ),
        )
    }

    function removeUploadingFile(uid: string) {
        setUploadingItems((current) => current.filter((item) => item.file.uid !== uid))
    }

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

    const uploadProps: UploadProps = {
        accept,
        customRequest: async ({ file, onError, onProgress, onSuccess }) => {
            if (!(file instanceof File)) {
                onError?.(new Error('无效文件'))
                return
            }

            const uploadFile = file as RcFile

            try {
                setUploadingItems((current) => [
                    ...current,
                    {
                        file: {
                            name: uploadFile.name,
                            percent: 0,
                            size: uploadFile.size,
                            status: 'uploading',
                            type: uploadFile.type,
                            uid: uploadFile.uid,
                        },
                    },
                ])

                const uploaded = await objectStorageService.uploadFile(uploadFile, {
                    onProgress: (progress) => {
                        const percent = typeof progress.percent === 'number' ? progress.percent : 0
                        updateUploadingFile(uploadFile.uid, {
                            percent,
                            status: 'uploading',
                        })
                        onProgress?.({ percent })
                    },
                    prefix: uploadPrefix,
                })
                const checksum = await buildFileChecksum(uploadFile)

                removeUploadingFile(uploadFile.uid)
                onChange?.([...value, toAttachmentFile(uploadFile, uploaded, checksum)])
                onSuccess?.(uploaded)
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '上传失败'
                updateUploadingFile(
                    uploadFile.uid,
                    {
                        percent: 0,
                        status: 'error',
                    },
                    errorMessage,
                )
                message.error(`${uploadFile.name} 上传失败`)
                onError?.(error instanceof Error ? error : new Error(errorMessage))
            }
        },
        beforeUpload: (file) => {
            if (!isFileNameMatched(file.name)) {
                message.warning(`文件“${file.name}”命名不符合当前规则`)
                return Upload.LIST_IGNORE
            }

            if (file.size / 1024 / 1024 > maxFileSizeInMb) {
                message.warning(`文件“${file.name}”超过 ${maxFileSizeInMb}MB 限制`)
                return Upload.LIST_IGNORE
            }

            if (maxCount && value.length + uploadingItems.length >= maxCount) {
                message.warning(`当前上传项最多只能上传 ${maxCount} 个文件`)
                return Upload.LIST_IGNORE
            }

            return true
        },
        disabled,
        fileList: visibleFileList,
        multiple,
        onRemove: (file) => {
            if (uploadingItems.some((item) => item.file.uid === file.uid)) {
                removeUploadingFile(file.uid)
                return true
            }

            onChange?.(value.filter((item) => item.uid !== file.uid))
            return true
        },
        showUploadList: false,
    }

    return (
        <Space
            direction="vertical"
            size={compact ? 8 : 12}
            className={`attachment-upload-stack${compact ? ' attachment-upload-stack-compact' : ''}`}
        >
            <Upload.Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到这里上传</p>
                <p className="ant-upload-hint">文件将直接上传到对象存储桶。</p>
            </Upload.Dragger>
            <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} disabled={disabled}>
                    继续选择文件
                </Button>
            </Upload>
            {helperText ? <Typography.Text className="card-helper-text">{helperText}</Typography.Text> : null}
            {visibleFileList.length > 0 ? (
                <Space direction="vertical" size={8} className="object-storage-upload-list">
                    {visibleFileList.map((file) => {
                        const uploadingItem = uploadingItems.find((item) => item.file.uid === file.uid)
                        const isUploading = file.status === 'uploading'
                        const isError = file.status === 'error'

                        return (
                            <div key={file.uid} className="object-storage-upload-list__item">
                                <div className="object-storage-upload-list__meta">
                                    <Space size={8}>
                                        {isUploading ? <LoadingOutlined /> : null}
                                        <Typography.Text>{file.name}</Typography.Text>
                                    </Space>
                                    <Button
                                        danger
                                        icon={<DeleteOutlined />}
                                        size="small"
                                        type="text"
                                        onClick={() => {
                                            if (isUploading || isError) {
                                                removeUploadingFile(file.uid)
                                                return
                                            }

                                            onChange?.(value.filter((item) => item.uid !== file.uid))
                                        }}
                                    />
                                </div>
                                {isUploading ? <Progress percent={Math.round(file.percent ?? 0)} size="small" /> : null}
                                {isError && uploadingItem?.error ? (
                                    <Typography.Text type="danger">{uploadingItem.error}</Typography.Text>
                                ) : null}
                                {/* {!isUploading && !isError ? (
                                    <Typography.Text type="secondary">
                                        {file.url || file.response?.url || '上传完成'}
                                    </Typography.Text>
                                ) : null} */}
                            </div>
                        )
                    })}
                </Space>
            ) : null}
        </Space>
    )
}
