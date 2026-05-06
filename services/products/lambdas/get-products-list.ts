import type { Product, ProductWithStock, Stock } from "../models/Product";
import { products as productsMock, stocks as stocksMock } from "../products-data";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

const joinProductsWithStocks = (products: Product[], stocks: Stock[]): ProductWithStock[] => {
	const stockByProductId = new Map(stocks.map((stock) => [stock.product_id, stock.count]));

	return products.map((product) => ({
		...product,
		count: stockByProductId.get(product.id) ?? 0,
	}));
};


export const handler = async () => {
	return {
		statusCode: 200,
		headers,
		body: JSON.stringify(joinProductsWithStocks(productsMock, stocksMock)),
	};
};
