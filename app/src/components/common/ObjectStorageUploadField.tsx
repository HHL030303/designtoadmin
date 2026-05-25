import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Button, Collapse, Progress, Space, Typography, Upload, message } from 'antd'
import {
    DeleteOutlined,
    FolderOpenOutlined,
    InboxOutlined,
    LoadingOutlined,
    UploadOutlined,
} from '@ant-design/icons'
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload/interface'
import type { AttachmentFile } from '../../types'
import { objectStorageService } from '../../services/objectStorageService'
import { buildFileChecksum } from '../../utils/fileChecksum'

type UploadingItem = {
    error?: string
    file: UploadFile
}

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

    const relativePath = file.webkitRelativePath?.trim() ?? ''
    const originalPath = relativePath
        ? relativePath
            .replace(/^\/+|\/+$/g, '')
            .split('/')
            .map((segment) => segment.trim())
            .filter(Boolean)[0]
        : undefined

    return {
        checksum,
        fileExt,
        name: uploaded.fileName,
        originalPath,
        size: uploaded.fileSize,
        storageKey: uploaded.key,
        type: uploaded.fileType || file.type,
        uid: `${uploaded.key}-${Math.random().toString(36).slice(2, 8)}`,
        uploadedAt: new Date().toISOString(),
        url: uploaded.url,
    } satisfies AttachmentFile
}

function toRcFile(file: File): RcFile {
    const existingUid = (file as RcFile).uid

    if (existingUid) {
        return file as RcFile
    }

    const nextFile = file as RcFile
    nextFile.uid = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`
    return nextFile
}

export function ObjectStorageUploadField({
    value = [],
    onChange,
    onUploaded,
    onDelete,
    disabled,
    accept,
    compact = false,
    fileNamePattern,
    maxCount,
    maxFileSizeInMb = 1000,
    multiple = true,
    taskId,
    uploadPrefix,
}: {
    value?: AttachmentFile[]
    onChange?: (files: AttachmentFile[]) => void
    onUploaded?: (file: AttachmentFile) => Promise<AttachmentFile | void> | AttachmentFile | void
    onDelete?: (file: AttachmentFile) => Promise<void> | void
    disabled?: boolean
    accept?: string
    helperText?: string
    compact?: boolean
    fileNamePattern?: string
    maxCount?: number
    maxFileSizeInMb?: number
    multiple?: boolean
    taskId?: string
    uploadPrefix?: string
}) {
    const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([])
    const latestValueRef = useRef<AttachmentFile[]>(value)
    const folderInputRef = useRef<HTMLInputElement | null>(null)
    const allowDirectoryUpload = !accept

    useEffect(() => {
        latestValueRef.current = value
    }, [value])

    const visibleFileList = useMemo(
        () => [...value.map(toUploadedFileItem), ...uploadingItems.map((item) => item.file)],
        [uploadingItems, value],
    )
    const groupedUploadedFiles = useMemo(
        () => buildAttachmentGroups(value),
        [value],
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

    async function removeUploadedFile(file: AttachmentFile) {
        if (onDelete) {
            await onDelete(file)
        }

        onChange?.(value.filter((item) => item.uid !== file.uid))
    }

    function isFileNameMatched(fileName: string) {
        if (!fileNamePattern) {
            return true
        }

        try {
            return new RegExp(fileNamePattern, 'i').test(fileName)
        } catch {
            return true
        }
    }

    function canAcceptFile(file: File) {
        if (!isFileNameMatched(file.name)) {
            message.warning(`文件“${file.name}”命名不符合当前规则`)
            return false
        }

        if (file.size / 1024 / 1024 > maxFileSizeInMb) {
            message.warning(`文件“${file.name}”超过 ${maxFileSizeInMb}MB 限制`)
            return false
        }

        if (maxCount && latestValueRef.current.length + uploadingItems.length >= maxCount) {
            message.warning(`当前上传项最多只能上传 ${maxCount} 个文件`)
            return false
        }

        return true
    }

    async function uploadSelectedFile(
        uploadFile: RcFile,
        handlers?: {
            onError?: (error: Error) => void
            onProgress?: (progress: { percent: number }) => void
            onSuccess?: (payload: Awaited<ReturnType<typeof objectStorageService.uploadFile>>) => void
        },
    ) {
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
                    handlers?.onProgress?.({ percent })
                },
                taskId,
                prefix: uploadPrefix,
            })
            const checksum = await buildFileChecksum(uploadFile)

            const uploadedFile = toAttachmentFile(uploadFile, uploaded, checksum)

            const registeredFile = onUploaded
                ? (await onUploaded(uploadedFile)) ?? uploadedFile
                : uploadedFile

            removeUploadingFile(uploadFile.uid)
            const nextFiles = [...latestValueRef.current, registeredFile]
            latestValueRef.current = nextFiles
            onChange?.(nextFiles)
            handlers?.onSuccess?.(uploaded)
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
            handlers?.onError?.(error instanceof Error ? error : new Error(errorMessage))
        }
    }

    async function handleFolderSelection(event: ChangeEvent<HTMLInputElement>) {
        const selectedFiles = Array.from(event.target.files ?? [])

        for (const file of selectedFiles) {
            const uploadFile = toRcFile(file)

            if (!canAcceptFile(uploadFile)) {
                continue
            }

            void uploadSelectedFile(uploadFile)
        }

        event.target.value = ''
    }

    const uploadProps: UploadProps = {
        accept,
        customRequest: async ({ file, onError, onProgress, onSuccess }) => {
            if (!(file instanceof File)) {
                onError?.(new Error('无效文件'))
                return
            }

            const uploadFile = toRcFile(file)
            await uploadSelectedFile(uploadFile, {
                onError: (error) => onError?.(error),
                onProgress: (progress) => onProgress?.(progress),
                onSuccess: (uploaded) => onSuccess?.(uploaded),
            })
        },
        beforeUpload: (file) => (canAcceptFile(file) ? true : Upload.LIST_IGNORE),
        disabled,
        fileList: visibleFileList,
        multiple,
        onRemove: (file) => {
            if (uploadingItems.some((item) => item.file.uid === file.uid)) {
                removeUploadingFile(file.uid)
                return true
            }

            const matchedFile = value.find((item) => item.uid === file.uid)

            if (!matchedFile) {
                return true
            }

            return removeUploadedFile(matchedFile)
                .then(() => true)
                .catch((error) => {
                    message.error(error instanceof Error ? error.message : '文件删除失败')
                    return false
                })
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
                <p className="ant-upload-hint">
                    {allowDirectoryUpload
                        ? '支持选择整个文件夹上传，目录层级会保留到对象存储。'
                        : '文件将直接上传到对象存储桶。'}
                </p>
            </Upload.Dragger>
            <Space size={8} wrap>
                <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />} disabled={disabled}>
                        选择文件
                    </Button>
                </Upload>
                {allowDirectoryUpload ? (
                    <>
                        <input
                            ref={folderInputRef}
                            type="file"
                            multiple
                            onChange={(event) => void handleFolderSelection(event)}
                            style={{ display: 'none' }}
                            {...({
                                directory: '',
                                webkitdirectory: '',
                            } as unknown as Record<string, string>)}
                        />
                        <Button
                            icon={<FolderOpenOutlined />}
                            disabled={disabled}
                            onClick={() => folderInputRef.current?.click()}
                        >
                            选择文件夹
                        </Button>
                    </>
                ) : null}
            </Space>
            {allowDirectoryUpload && value.length > 0 ? (
                <Space direction="vertical" size={8} className="object-storage-upload-list">
                    {groupedUploadedFiles.directFiles.map((file) => (
                        <div key={file.uid} className="object-storage-upload-list__item">
                            <div className="object-storage-upload-list__meta">
                                <Space size={8}>
                                    <Typography.Text>{file.name}</Typography.Text>
                                </Space>
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    size="small"
                                    type="text"
                                    onClick={() => {
                                        void removeUploadedFile(file).catch((error) => {
                                            message.error(error instanceof Error ? error.message : '文件删除失败')
                                        })
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                    {groupedUploadedFiles.folderGroups.map((group) => (
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
                                        <Space direction="vertical" size={8} className="object-storage-upload-list">
                                            {group.files.map((file) => (
                                                <div key={file.uid} className="object-storage-upload-list__item">
                                                    <div className="object-storage-upload-list__meta">
                                                        <Space size={8}>
                                                            <Typography.Text>{file.name}</Typography.Text>
                                                        </Space>
                                                        <Button
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            size="small"
                                                            type="text"
                                                            onClick={() => {
                                                                void removeUploadedFile(file).catch((error) => {
                                                                    message.error(error instanceof Error ? error.message : '文件删除失败')
                                                                })
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </Space>
                                    ),
                                },
                            ]}
                        />
                    ))}
                </Space>
            ) : null}
            {uploadingItems.length > 0 || (!allowDirectoryUpload && visibleFileList.length > 0) ? (
                <Space direction="vertical" size={8} className="object-storage-upload-list">
                    {(allowDirectoryUpload ? uploadingItems.map((item) => item.file) : visibleFileList).map((file) => {
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

                                            const matchedFile = value.find((item) => item.uid === file.uid)

                                            if (!matchedFile) {
                                                return
                                            }

                                            void removeUploadedFile(matchedFile).catch((error) => {
                                                message.error(error instanceof Error ? error.message : '文件删除失败')
                                            })
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
