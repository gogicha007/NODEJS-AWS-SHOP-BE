import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  BatchWriteCommandInput,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { products } from "../../services/products/products-data";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "products";
const DDB_BATCH_LIMIT = 25;

export const main = async () => {
  const chunks: (typeof products)[] = [];

  for (let i = 0; i < products.length; i += DDB_BATCH_LIMIT) {
    chunks.push(products.slice(i, i + DDB_BATCH_LIMIT));
  }

  for (const [index, chunk] of chunks.entries()) {
    const input: BatchWriteCommandInput = {
      RequestItems: {
        [TABLE_NAME]: chunk.map((product) => ({
          PutRequest: {
            Item: product,
          },
        })),
      },
    };

    const response = await docClient.send(new BatchWriteCommand(input));
    const unprocessed = response.UnprocessedItems?.[TABLE_NAME]?.length ?? 0;

    console.log(
      `Batch ${index + 1}/${chunks.length} written to ${TABLE_NAME}. Unprocessed: ${unprocessed}`,
    );
  }
};

main().catch((error) => {
  console.error("Failed to seed products table:", error);
  process.exit(1);
});
