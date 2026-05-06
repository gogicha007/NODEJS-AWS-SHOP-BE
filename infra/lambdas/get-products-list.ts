import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
	handler as productsListMockHandler,
} from "../../services/products/lambdas/get-products-list";
import type { Product, Stock } from "../../services/products/models/Product";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const headers = {
	"Content-Type": "application/json",
	"Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
	"Access-Control-Allow-Headers": "Content-Type,Authorization",
	"Access-Control-Allow-Methods": "GET,OPTIONS",
};

export const handler = async () => {
	const productsTableName = process.env.PRODUCTS_TABLE_NAME;
	const stocksTableName = process.env.STOCKS_TABLE_NAME;

	if (!productsTableName || !stocksTableName) {
		return productsListMockHandler();
	}

	const [productsResult, stocksResult] = await Promise.all([
		docClient.send(
			new ScanCommand({
				TableName: productsTableName,
			}),
		),
		docClient.send(
			new ScanCommand({
				TableName: stocksTableName,
			}),
		),
	]);

	const products = (productsResult.Items ?? []) as Product[];
	const stocks = (stocksResult.Items ?? []) as Stock[];

	const stockByProductId = new Map(stocks.map((stock) => [stock.product_id, stock.count]));
	const joinedProducts = products.map((product) => ({
		...product,
		count: stockByProductId.get(product.id) ?? 0,
	}));

	return {
		statusCode: 200,
		headers,
		body: JSON.stringify(joinedProducts),
	};
};
