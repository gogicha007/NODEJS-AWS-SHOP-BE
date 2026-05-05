import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { chunkArray } from "@aws-doc-sdk-examples/lib/utils/util-array.js";
import { stocks } from "../../services/products/products-data";
import { Stock } from "../../services/products/models/Product";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "stocks";

export const main = async () => {
  const stockChunks = chunkArray(stocks, 25);

  for (const chunk of stockChunks) {
    const putRequest = chunk.map((stock: Stock) => ({
      PutRequest: {
        Item: stock,
      },
    }));

    const command = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: putRequest,
      },
    });

    await docClient.send(command);
  }
};

main().catch((error) => {
  console.error("Failed to seed stocks table:", error);
  process.exit(1);
});
