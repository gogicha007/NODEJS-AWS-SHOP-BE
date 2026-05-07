import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Product, Stock } from "../models/Product";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const headers = {
	"Content-Type": "application/json",
	"Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
	"Access-Control-Allow-Headers": "Content-Type,Authorization",
	"Access-Control-Allow-Methods": "GET,OPTIONS",
};

export const getProductsList = async (productsTableName: string, stocksTableName: string) => {
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
}

type Event = {
    pathParameters?: Record<string, string | undefined>;
    queryStringParameters?: Record<string, string | undefined>;
};

export const handler = async (event: Event) => {
	try {
		const productsTableName = process.env.PRODUCTS_TABLE_NAME;
		const stocksTableName = process.env.STOCKS_TABLE_NAME;

		console.log("get-products-list request", {
			event,
			pathParameters: event?.pathParameters,
			queryStringParameters: event?.queryStringParameters,
		})
		
		if (!productsTableName || !stocksTableName) {
			return {
				statusCode: 500,
				headers,
				body: JSON.stringify({ message: "Missing table names" }),
			};
		}

		return await getProductsList(productsTableName, stocksTableName)
	} catch (err) {
		console.error("get-products-list error", err);
		return {
			statusCode: 500,
			headers,
			body: JSON.stringify({ message: "Internal server error" }),
		};
	}
};
