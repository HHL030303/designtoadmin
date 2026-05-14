import COS, { type onProgress } from 'cos-js-sdk-v5'
import { apiRequest } from './apiClient'

type UploadTokenResponse = {
    TmpSecretId: string
    TmpSecretKey: string
    Token: string
    startTime: number
    expiredTime: number
    Bucket: string
    Region: string
}

export type UploadedObjectFile = {
    fileName: string
    fileSize: number
    fileType: string
    key: string
    url: string
}

function getFileExtension(file: File) {
    const lastDotIndex = file.name.lastIndexOf('.')
    if (lastDotIndex < 0) {
        return ''
    }

    return file.name.slice(lastDotIndex)
}

function buildDateSegment() {
    const date = new Date()
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}${month}${day}`
}

function buildObjectKey(file: File, prefix?: string) {
    const extension = getFileExtension(file)
    const normalizedPrefix = (prefix || 'task-attachments').replace(/^\/+|\/+$/g, '')
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`
    return `${normalizedPrefix}/${buildDateSegment()}/${uniqueName}`
}

function buildUploadedFileUrl(bucket: string, region: string, key: string) {
    const customBaseUrl = import.meta.env.VITE_STORAGE_PUBLIC_BASE_URL?.trim()

    if (customBaseUrl) {
        return `${customBaseUrl.replace(/\/+$/g, '')}/${key}`
    }

    return `https://${bucket}.cos.${region}.myqcloud.com/${key}`
}

class ObjectStorageService {
    private cosClient: COS | null = null
    private cachedToken: UploadTokenResponse | null = null
    private tokenRequest: Promise<UploadTokenResponse> | null = null

    private async fetchUploadToken() {
        return apiRequest<UploadTokenResponse>(
            import.meta.env.VITE_STORAGE_STS_PUT_TOKEN_PATH ||
                '/cos/sts_put_token',
        )
    }

    private async getUploadToken() {
        const cachedToken = this.cachedToken

        if (
            cachedToken &&
            Date.now() < cachedToken.expiredTime * 1000 - 3 * 60 * 1000
        ) {
            return cachedToken
        }

        if (this.tokenRequest) {
            return this.tokenRequest
        }

        this.tokenRequest = this.fetchUploadToken()
            .then((token) => {
                this.cachedToken = token
                return token
            })
            .finally(() => {
                this.tokenRequest = null
            })

        return this.tokenRequest
    }

    private getClient() {
        if (this.cosClient) {
            return this.cosClient
        }

        this.cosClient = new COS({
            getAuthorization: async (_, callback) => {
                const token = await this.getUploadToken()
                callback({
                    ExpiredTime: token.expiredTime,
                    SecurityToken: token.Token,
                    StartTime: token.startTime,
                    TmpSecretId: token.TmpSecretId,
                    TmpSecretKey: token.TmpSecretKey,
                })
            },
        })

        return this.cosClient
    }

    async uploadFile(
        file: File,
        options?: {
            onProgress?: onProgress
            prefix?: string
        },
    ): Promise<UploadedObjectFile> {
        const client = this.getClient()
        const token = await this.getUploadToken()
        const key = buildObjectKey(file, options?.prefix)
        const uploadResult = await client.uploadFile({
            Body: file,
            Bucket: token.Bucket,
            Key: key,
            Region: token.Region,
            onProgress: options?.onProgress,
        })

        if (uploadResult.statusCode !== 200) {
            throw new Error('文件上传失败')
        }

        return {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            key,
            url: buildUploadedFileUrl(token.Bucket, token.Region, key),
        }
    }
}

export const objectStorageService = new ObjectStorageService()
