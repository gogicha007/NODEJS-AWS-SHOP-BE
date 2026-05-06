import { describe, expect, it } from "@jest/globals";

import { handler as getProductsById } from "../../services/products/lambdas/get-products-by-id";
import { handler as getProductsList } from "../lambdas/get-products-list";
import { products, stocks } from "../../services/products/products-data";

describe("products lambda handlers", () => {
	it("returns all products from getProductsList", async () => {
		const expectedProducts = products.map((product) => ({
			...product,
			count: stocks.find((stock) => stock.product_id === product.id)?.count ?? 0,
		}));

		const response = await getProductsList();

		expect(response.statusCode).toBe(200);
		expect(response.headers).toMatchObject({
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
		});
		expect(JSON.parse(response.body)).toEqual(expectedProducts);
	});

	it("returns a product from getProductsById", async () => {
		const targetProduct = products[0];
		const response = await getProductsById({
			pathParameters: { productId: targetProduct.id },
		});

		expect(response.statusCode).toBe(200);
		expect(response.headers).toMatchObject({
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
		});
		expect(JSON.parse(response.body)).toEqual(targetProduct);
	});

	it("returns 404 when getProductsById cannot find a product", async () => {
		const response = await getProductsById({
			pathParameters: { productId: "missing-product-id" },
		});

		expect(response.statusCode).toBe(404);
		expect(response.headers).toMatchObject({
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
		});
		expect(JSON.parse(response.body)).toEqual({ message: "Product not found" });
	});
});