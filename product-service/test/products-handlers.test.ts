import { describe, expect, it } from "@jest/globals";


import { getProductById } from "../lambdas/get-products-by-id";
import { getProductsList } from "../lambdas/get-products-list";
import { products, stocks } from "../../infra/scripts/product-data";

describe("products lambda handlers", () => {
	it("returns all products from getProductsList", async () => {
		const expectedProducts = products.map((product) => ({
			...product,
			count: stocks.find((stock) => stock.product_id === product.id)?.count ?? 0,
		}));

		const response = await getProductsList('products', 'stocks');

		expect(response.statusCode).toBe(200);
		expect(response.headers).toMatchObject({
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
		});
		expect(JSON.parse(response.body).length).toEqual(expectedProducts.length);
	});

	it("returns a product from getProductsById", async () => {
		const targetProduct = products[0];
		const response = await getProductById('products', 'stocks', targetProduct.id);

		expect(response.statusCode).toBe(200);
		expect(response.headers).toMatchObject({
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
		});
		expect(JSON.parse(response.body).id).toEqual(targetProduct.id);
	});

	it("returns 404 when getProductsById cannot find a product", async () => {
		const response = await getProductById('products', 'stocks', "missing-product-id" );

		expect(response.statusCode).toBe(404);
		expect(response.headers).toMatchObject({
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
		});
		expect(JSON.parse(response.body)).toEqual({ message: "Product not found" });
	});
});