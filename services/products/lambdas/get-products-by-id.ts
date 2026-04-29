import { products } from "../products-data";

const headers = {
	"Content-Type": "application/json",
};

type PathParameters = {
	productId?: string;
};

type Event = {
	pathParameters?: PathParameters;
};

export const handler = async (event: Event) => {
	const productId = event.pathParameters?.productId;
	const product = products.find((item) => item.id === productId);

	if (!product) {
		return {
			statusCode: 404,
			headers,
			body: JSON.stringify({ message: "Product not found" }),
		};
	}

	return {
		statusCode: 200,
		headers,
		body: JSON.stringify(product),
	};
};
