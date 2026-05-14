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

export const fileService = {
    async createFileRecord(payload: CreateFileRecordPayload) {
        await apiRequest<null>('/api/files', {
            body: payload,
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
