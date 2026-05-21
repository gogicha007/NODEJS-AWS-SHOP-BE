import { handler } from '../lambdas/catalog-batch-process';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { createProductWithStock } from '../lambdas/services/product-service';
import { SQSEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

// @ts-ignore
jest.mock('../lambdas/services/product-service');
const snsMock = mockClient(SNSClient);

// @ts-ignore
describe('catalogBatchProcess handler', () => {
    const topicArn = 'arn:aws:sns:eu-north-1:123456789012:product-alerts';

    // @ts-ignore
    beforeEach(() => {
        // @ts-ignore
        jest.clearAllMocks();
        snsMock.reset();
        process.env.SNS_TOPIC_ARN = topicArn;
    });

    // @ts-ignore
    it('should process messages successfully and send SNS notification', async () => {
        const mockProduct = { id: '1', title: 'Product 1', description: 'Desc 1', price: 10, count: 5 };
        // @ts-ignore
        (createProductWithStock as any).mockResolvedValue(mockProduct);
        snsMock.on(PublishCommand).resolves({});

        const event = {
            Records: [
                {
                    messageId: 'msg-1',
                    body: JSON.stringify({ title: 'Product 1', description: 'Desc 1', price: '10', count: '5' })
                }
            ]
        } as SQSEvent;

        const result = await handler(event);

        // @ts-ignore
        expect(createProductWithStock).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(snsMock).toHaveReceivedCommandWith(PublishCommand, {
            TopicArn: topicArn,
            Subject: 'Products Batch Processed',
        });
        // @ts-ignore
        expect(result.batchItemFailures).toHaveLength(0);
    });

    // @ts-ignore
    it('should handle partial failures and return batchItemFailures', async () => {
        // @ts-ignore
        (createProductWithStock as any)
            .mockResolvedValueOnce({ id: '1' })
            .mockRejectedValueOnce(new Error('DynamoDB Error'));
        
        snsMock.on(PublishCommand).resolves({});

        const event = {
            Records: [
                {
                    messageId: 'success-id',
                    body: JSON.stringify({ title: 'P1', description: 'D1', price: 1, count: 1 })
                },
                {
                    messageId: 'fail-id',
                    body: JSON.stringify({ title: 'P2', description: 'D2', price: 2, count: 2 })
                }
            ]
        } as SQSEvent;

        const result = await handler(event);

        // @ts-ignore
        expect(createProductWithStock).toHaveBeenCalledTimes(2);
        // @ts-ignore
        expect(result.batchItemFailures).toEqual([{ itemIdentifier: 'fail-id' }]);
        
        // SNS should still be sent for the successful one
        // @ts-ignore
        expect(snsMock).toHaveReceivedCommand(PublishCommand);
    });

    // @ts-ignore
    it('should not send SNS if no products were created', async () => {
        // @ts-ignore
        (createProductWithStock as any).mockRejectedValue(new Error('Error'));

        const event = {
            Records: [
                {
                    messageId: 'fail-1',
                    body: JSON.stringify({})
                }
            ]
        } as SQSEvent;

        const result = await handler(event);

        // @ts-ignore
        expect(snsMock).not.toHaveReceivedCommand(PublishCommand);
        // @ts-ignore
        expect(result.batchItemFailures).toHaveLength(1);
    });
});
