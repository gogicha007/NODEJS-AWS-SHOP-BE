import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Product, Stock } from "../models/Product";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const headers = {
  "Content-Type": "application/json",
};

type PathParameters = {
  productId?: string;
};

type Event = {
  pathParameters?: PathParameters;
};

export const getProductById = async (
  productsTableName: string,
  stocksTableName: string,
  productId: string) => {
  const [productResult, stockResult] = await Promise.all([
    docClient.send(
      new GetCommand({
        TableName: productsTableName,
        Key: { id: productId },
      }),
    ),
    docClient.send(
      new GetCommand({
        TableName: stocksTableName,
        Key: { product_id: productId },
      }),
    ),
  ]);

  const product = productResult.Item as Product | undefined;

  if (!product) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: "Product not found" }),
    };
  }

  const count = (stockResult.Item as Stock | undefined)?.count ?? 0;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ...product, count }),
  };
}

export const handler = async (event: Event) => {
  try {
    const productId = event?.pathParameters?.productId;
    const productsTableName = process.env.PRODUCTS_TABLE_NAME;
    const stocksTableName = process.env.STOCKS_TABLE_NAME;

    console.log("get-products-by-id request", {
      event,
      pathParameters: event?.pathParameters,
    });
    
    if (!productId || !productsTableName || !stocksTableName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Missing productId or table names" }),
      };
    }

    return getProductById(productsTableName, stocksTableName, productId)


  } catch (err) {
    console.error("get-products-by-id error", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
