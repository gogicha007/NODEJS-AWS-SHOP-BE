import { handler } from '../lambdas/import-products'
import { getUploadUrl } from '../lambdas/signer'

jest.mock('../lambdas/signer')

const mockGetUploadUrl = getUploadUrl as jest.MockedFunction<typeof getUploadUrl>

describe('importProductsFile handler', () => {
    const ORIGINAL_ENV = process.env

    beforeEach(() => {
        jest.clearAllMocks()
        process.env = { ...ORIGINAL_ENV, BUCKET_NAME: 'test-bucket' }
    })

    afterEach(() => {
        process.env = ORIGINAL_ENV
    })

    it('returns 400 when queryStringParameters is missing', async () => {
        const result = await handler({})

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({ message: expect.any(String) })
        expect(mockGetUploadUrl).not.toHaveBeenCalled()
    })

    it('returns 400 when name param is missing', async () => {
        const result = await handler({ queryStringParameters: {} })

        expect(result.statusCode).toBe(400)
        expect(mockGetUploadUrl).not.toHaveBeenCalled()
    })

    it('returns 400 when file is not a csv', async () => {
        const result = await handler({ queryStringParameters: { name: 'products.txt' } })

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toMatchObject({ message: expect.any(String) })
        expect(mockGetUploadUrl).not.toHaveBeenCalled()
    })

    it('returns 200 with signed url for valid csv name', async () => {
        const fakeUrl = 'https://s3.amazonaws.com/test-bucket/uploaded/products.csv?signed=1'
        mockGetUploadUrl.mockResolvedValue(fakeUrl)

        const result = await handler({ queryStringParameters: { name: 'products.csv' } })

        expect(result.statusCode).toBe(200)
        expect(result.body).toBe(fakeUrl)
    })

    it('calls getUploadUrl with BUCKET_NAME env var and uploaded/ key prefix', async () => {
        mockGetUploadUrl.mockResolvedValue('https://signed-url')

        await handler({ queryStringParameters: { name: 'data.csv' } })

        expect(mockGetUploadUrl).toHaveBeenCalledWith('test-bucket', 'uploaded/data.csv')
    })

    it('returns 200 with text/plain content type header', async () => {
        mockGetUploadUrl.mockResolvedValue('https://signed-url')

        const result = await handler({ queryStringParameters: { name: 'products.csv' } })

        expect(result.statusCode).toBe(200)
        expect(result.headers).toEqual({ 'Content-Type': 'text/plain' })
    })

    it('returns 500 when getUploadUrl throws', async () => {
        mockGetUploadUrl.mockRejectedValue(new Error('S3 connection error'))

        const result = await handler({ queryStringParameters: { name: 'products.csv' } })

        expect(result.statusCode).toBe(500)
        expect(JSON.parse(result.body)).toMatchObject({ message: expect.any(String) })
    })
})
