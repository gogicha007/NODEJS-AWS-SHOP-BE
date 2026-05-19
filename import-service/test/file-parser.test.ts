import type { S3Event } from 'aws-lambda'
import { Readable } from 'node:stream'
import { GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { SendMessageCommand } from '@aws-sdk/client-sqs'

const mockS3Send = jest.fn()
const mockSqsSend = jest.fn()

jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(() => ({ send: mockS3Send })),
    GetObjectCommand: jest.fn(),
    CopyObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
}))

jest.mock('@aws-sdk/client-sqs', () => ({
    SQSClient: jest.fn(() => ({ send: mockSqsSend })),
    SendMessageCommand: jest.fn(),
}))

process.env.SQS_QUEUE_URL = 'https://sqs.test.local/queue/catalog-items'

import { handler } from '../lambdas/file-parser'

function makeS3Event(bucket: string, key: string): S3Event {
    return {
        Records: [
            {
                eventVersion: '2.1',
                eventSource: 'aws:s3',
                awsRegion: 'eu-north-1',
                eventTime: '2026-05-14T00:00:00.000Z',
                eventName: 'ObjectCreated:Put',
                userIdentity: { principalId: 'test' },
                requestParameters: { sourceIPAddress: '127.0.0.1' },
                responseElements: {
                    'x-amz-request-id': 'req-1',
                    'x-amz-id-2': 'id-2',
                },
                s3: {
                    s3SchemaVersion: '1.0',
                    configurationId: 'test-config',
                    bucket: {
                        name: bucket,
                        ownerIdentity: { principalId: 'owner' },
                        arn: `arn:aws:s3:::${bucket}`,
                    },
                    object: {
                        key,
                        size: 100,
                        eTag: 'etag123',
                        sequencer: '1',
                    },
                },
            },
        ],
    }
}

const CSV_CONTENT = 'title,price,description,count\nProduct 1,10,Description 1,5\nProduct 2,20,Description 2,3\n'
const CSV_WITH_MISSING_HEADER = 'title,price,count\nProduct 1,10,5\n'
const CSV_WITH_INVALID_ROW = 'title,description,price,count\nProduct 1,Description 1,abc,5\n'

describe('importFileParser handler', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('reads the uploaded file from S3 using bucket and key from the event', async () => {
        mockS3Send
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
        mockSqsSend.mockResolvedValue({})

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(GetObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            Key: 'uploaded/products.csv',
        })
    })

    it('copies the file from uploaded/ to parsed/', async () => {
        mockS3Send
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
        mockSqsSend.mockResolvedValue({})

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(CopyObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            CopySource: 'test-bucket/uploaded/products.csv',
            Key: 'parsed/products.csv',
        })
    })

    it('deletes the original file from uploaded/', async () => {
        mockS3Send
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
        mockSqsSend.mockResolvedValue({})

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(DeleteObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            Key: 'uploaded/products.csv',
        })
    })

    it('calls S3 send exactly three times: GetObject, CopyObject, DeleteObject', async () => {
        mockS3Send
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
        mockSqsSend.mockResolvedValue({})

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(mockS3Send).toHaveBeenCalledTimes(3)
    })

    it('copy happens before delete', async () => {
        const callOrder: string[] = []
        mockS3Send
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockImplementationOnce(() => { callOrder.push('copy'); return Promise.resolve({}) })
            .mockImplementationOnce(() => { callOrder.push('delete'); return Promise.resolve({}) })
        mockSqsSend.mockResolvedValue({})

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(callOrder).toEqual(['copy', 'delete'])
    })

    it('decodes URL-encoded plus signs in object key', async () => {
        mockS3Send
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
        mockSqsSend.mockResolvedValue({})

        const event = makeS3Event('test-bucket', 'uploaded/my+file.csv')

        await handler(event, {} as any, jest.fn())

        expect(GetObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            Key: 'uploaded/my file.csv',
        })
    })

    it('sends one SQS message per valid CSV row', async () => {
        mockS3Send
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
        mockSqsSend.mockResolvedValue({})

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(SendMessageCommand).toHaveBeenCalledTimes(2)
        expect(SendMessageCommand).toHaveBeenNthCalledWith(1, {
            QueueUrl: 'https://sqs.test.local/queue/catalog-items',
            MessageBody: JSON.stringify({
                title: 'Product 1',
                description: 'Description 1',
                price: 10,
                count: 5,
            }),
        })
    })

    it('fails fast when required headers are missing and does not move file', async () => {
        mockS3Send.mockResolvedValueOnce({ Body: Readable.from([CSV_WITH_MISSING_HEADER]) })

        await expect(
            handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())
        ).rejects.toThrow('CSV is missing required headers: description')

        expect(mockSqsSend).not.toHaveBeenCalled()
        expect(CopyObjectCommand).not.toHaveBeenCalled()
        expect(DeleteObjectCommand).not.toHaveBeenCalled()
    })

    it('fails when row data type is invalid and does not move file', async () => {
        mockS3Send.mockResolvedValueOnce({ Body: Readable.from([CSV_WITH_INVALID_ROW]) })

        await expect(
            handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())
        ).rejects.toThrow('Row has invalid price: abc')

        expect(mockSqsSend).not.toHaveBeenCalled()
        expect(CopyObjectCommand).not.toHaveBeenCalled()
        expect(DeleteObjectCommand).not.toHaveBeenCalled()
    })
})
