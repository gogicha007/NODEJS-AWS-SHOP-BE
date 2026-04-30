import { products } from "../products-data";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://d2htpstdr8w7tm.cloudfront.net",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};


export const handler = async () => {
	return {
		statusCode: 200,
		headers,
		body: JSON.stringify(products),
	};
};
