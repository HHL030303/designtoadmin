import { apiRequest } from './apiClient'

type CreateFileRecordPayload = {
    checksum: string
    file_ext: string
    file_path: string
    original_name: string
    size_bytes: number
    task_id: number
    version_id: number
    workflow_stage_id: number
}

type CreateFileRecordResponse = {
    id?: number | string
    file:ChecksumFileRecord
}

type ChecksumFileRecord = {
    checksum: string
    created_at: string
    file_ext: string
    file_path: string
    file_url?: string | null
    id: number | string
    mime_type?: string | null
    original_name: string
    project_id: number
    size_bytes: number
    status: string
    task_id: number
    updated_at: string
    uploaded_by: number
    version_id: number
    workflow_stage_id: number
    file_biz_type?: string | null
}

type ChecksumLookupResponse = {
    exists: boolean
    file: ChecksumFileRecord | null
}

export const fileService = {
    async checkFileChecksum(checksum: string) {
        return apiRequest<ChecksumLookupResponse>('/api/files/checksum', {
            query: {
                checksum,
            },
        })
    },

    async createFileRecord(payload: CreateFileRecordPayload) {
        return apiRequest<CreateFileRecordResponse>('/api/files', {
            body: payload,
            method: 'POST',
        })
    },

    async deleteFileRecord(fileId: string) {
        await apiRequest<null>(`/api/files/${fileId}/delete`, {
            method: 'POST',
        })
    },

    async checkFileCompleteness(payload: {
        taskId: number
        versionId: number
    }) {
        await apiRequest<null>('/api/files/completeness', {
            query: {
                task_id: payload.taskId,
                version_id: payload.versionId,
            },
        })
    },
}
