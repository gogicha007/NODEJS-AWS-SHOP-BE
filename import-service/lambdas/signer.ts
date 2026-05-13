import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({ region: 'eu-north-1' })

export const getUploadUrl = async (bucket: string, key: string) => {
    const command = new PutObjectCommand({ Bucket: bucket, Key: key })
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    return url
}