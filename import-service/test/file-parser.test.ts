import type { S3Event } from 'aws-lambda'
import { Readable } from 'node:stream'
import { GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const mockSend = jest.fn()

jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn(() => ({ send: mockSend })),
    GetObjectCommand: jest.fn(),
    CopyObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
}))

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

describe('importFileParser handler', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('reads the uploaded file from S3 using bucket and key from the event', async () => {
        mockSend
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(GetObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            Key: 'uploaded/products.csv',
        })
    })

    it('copies the file from uploaded/ to parsed/', async () => {
        mockSend
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(CopyObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            CopySource: 'test-bucket/uploaded/products.csv',
            Key: 'parsed/products.csv',
        })
    })

    it('deletes the original file from uploaded/', async () => {
        mockSend
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(DeleteObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            Key: 'uploaded/products.csv',
        })
    })

    it('calls send exactly three times: GetObject, CopyObject, DeleteObject', async () => {
        mockSend
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(mockSend).toHaveBeenCalledTimes(3)
    })

    it('copy happens before delete', async () => {
        const callOrder: string[] = []
        mockSend
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockImplementationOnce(() => { callOrder.push('copy'); return Promise.resolve({}) })
            .mockImplementationOnce(() => { callOrder.push('delete'); return Promise.resolve({}) })

        await handler(makeS3Event('test-bucket', 'uploaded/products.csv'), {} as any, jest.fn())

        expect(callOrder).toEqual(['copy', 'delete'])
    })

    it('decodes URL-encoded plus signs in object key', async () => {
        mockSend
            .mockResolvedValueOnce({ Body: Readable.from([CSV_CONTENT]) })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})

        const event = makeS3Event('test-bucket', 'uploaded/my+file.csv')

        await handler(event, {} as any, jest.fn())

        expect(GetObjectCommand).toHaveBeenCalledWith({
            Bucket: 'test-bucket',
            Key: 'uploaded/my file.csv',
        })
    })
})
