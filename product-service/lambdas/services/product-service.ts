import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb"
import type { CreateProduct } from "../../models/Product"
import * as crypto from "node:crypto"

export const createProductWithStock = async (
    docClient: DynamoDBDocumentClient,
    data: CreateProduct
) => {
    const productsTableName = process.env.PRODUCTS_TABLE_NAME
    const stocksTableName = process.env.STOCKS_TABLE_NAME
    const id = crypto.randomUUID()

    await docClient.send(
        new TransactWriteCommand({
            TransactItems: [
                {
                    Put: {
                        TableName: productsTableName,
                        ConditionExpression: 'attribute_not_exists(id)',
                        Item: {
                            id,
                            title: data.title,
                            description: data.description,
                            price: data.price
                        }
                    }
                },
                {
                    Put: {
                        TableName: stocksTableName,
                        ConditionExpression: 'attribute_not_exists(product_id)',
                        Item: { product_id: id, count: data.count }
                    }
                }
            ]
        })
    )
    return { id, ...data }
}
