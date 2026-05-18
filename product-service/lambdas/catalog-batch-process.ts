import { SQSEvent, SQSRecord } from 'aws-lambda'


export const handler = async (event: SQSEvent) => {
    const batchItemFailures: { itemIdentifier: string }[] = []

    for (const record of event.Records) {
        try {
            await processMessage(record)
        } catch (error) {
            batchItemFailures.push({ itemIdentifier: record.messageId })
        }
    }

    return {
        batchItemFailures,
    }
}

const processMessage = async (record: SQSRecord) => {
    const messageBody = JSON.parse(record.body)
    console.log('Processing message: ', messageBody)
}