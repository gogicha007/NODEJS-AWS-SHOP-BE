import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { CreateProduct } from "../models/Product";
import * as crypto from "node:crypto"

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client)

const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
};

type Event = {
    body?: string;
};

export const handler = async (event: Event) => {
    try {
        const productsTableName = process.env.PRODUCTS_TABLE_NAME;
        const stocksTableName = process.env.STOCKS_TABLE_NAME;
        
        console.log("create-product request", {
            event,
            body: event?.body,
            productsTableName,
            stocksTableName,
        });

        if (!productsTableName || !stocksTableName) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ message: "Missing table names" }),
            };
        }

        if (!event?.body) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "Request body is required" }),
            };
        }

        let payload: CreateProduct;

        try {
            payload = JSON.parse(event.body) as CreateProduct;
        } catch {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "Invalid JSON body" }),
            };
        }

        const { title, description, price, count } = payload;
        if (
            !title ||
            !description ||
            typeof price !== "number" ||
            typeof count !== "number" ||
            !Number.isFinite(price) ||
            !Number.isInteger(count) ||
            count < 0
        ) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "Invalid product payload" }),
            };
        }

        const id = crypto.randomUUID();

        await docClient.send(
            new TransactWriteCommand({
                TransactItems: [
                    {
                        Put: {
                            TableName: productsTableName,
                            ConditionExpression: "attribute_not_exists(id)",
                            Item: {
                                id,
                                title,
                                description,
                                price,
                            },
                        },
                    },
                    {
                        Put: {
                            TableName: stocksTableName,
                            ConditionExpression: "attribute_not_exists(product_id)",
                            Item: {
                                product_id: id,
                                count,
                            },
                        },
                    },
                ],
            }),
        );

        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ id, title, description, price, count }),
        }
    } catch (err) {
        console.error("create-product error", err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: "Could not create product" }),
        }
    }
}