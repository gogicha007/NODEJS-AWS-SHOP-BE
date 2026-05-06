// export { handler } from "../../services/products/lambdas/get-products-by-id";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Product, Stock } from "../../services/products/models/Product";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

type PathParameters = {
  productId?: string;
};

type Event = {
  pathParameters?: PathParameters;
};

export const handler = async (event: Event) => {
  const productId = event.pathParameters?.productId;
  const productsTableName = process.env.PRODUCTS_TABLE_NAME;
  const stocksTableName = process.env.STOCKS_TABLE_NAME;

  if (!productId || !productsTableName || !stocksTableName) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: "Missing productId or table env vars" }),
    };
  }

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
};
