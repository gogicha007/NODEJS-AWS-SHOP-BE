import { SQSEvent, SQSRecord } from 'aws-lambda'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { createProductWithStock } from './services/product-service'
import type { CreateProduct } from '../models/Product'

const dbClient = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(dbClient)
const snsClient = new SNSClient({})

export const handler = async (event: SQSEvent) => {
    const batchItemFailures: { itemIdentifier: string }[] = []
    const productsCreated: CreateProduct[] = []

    for (const record of event.Records) {
        try {
            const productData = JSON.parse(record.body)

            const product = await createProductWithStock(docClient, {
                ...productData,
                price: Number(productData.price),
                count: Number(productData.count)
            })
            productsCreated.push(product)
        } catch (error) {
            console.error('Error processing: ', error)
            batchItemFailures.push({ itemIdentifier: record.messageId })
        }
    }

    if (productsCreated.length > 0) {
        await snsClient.send(new PublishCommand({
            TopicArn: process.env.SNS_TOPIC_ARN,
            Subject: 'Products Batch Processed',
            Message: `${productsCreated.length} products added`
        }))
    }
    return {
        batchItemFailures,
    }
}
