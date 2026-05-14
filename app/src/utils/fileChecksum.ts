import SparkMD5 from 'spark-md5'

export async function buildFileChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    return SparkMD5.ArrayBuffer.hash(buffer)
}
