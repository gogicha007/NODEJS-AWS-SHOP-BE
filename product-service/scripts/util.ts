import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    BatchWriteCommand,
    DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

const chunkArray = <T>(items: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

export const seeder = async <T extends Record<string, any>>(tablename: string, array: T[]) => {
    const chunks = chunkArray(array, 25)

    for (const chunk of chunks) {
        const putRequest = chunk.map((chunk: T) => ({
            PutRequest: {
                Item: chunk,
            }
        }))

        const command = new BatchWriteCommand({
            RequestItems: {
                [tablename]: putRequest,
            }
        })

        await docClient.send(command)
    }
}