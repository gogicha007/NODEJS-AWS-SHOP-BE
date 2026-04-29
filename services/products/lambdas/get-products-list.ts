import { products } from "../products-data";

const headers = {
	"Content-Type": "application/json",
};

export const handler = async () => {
	return {
		statusCode: 200,
		headers,
		body: JSON.stringify(products),
	};
};
