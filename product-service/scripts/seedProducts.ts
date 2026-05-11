import { products } from "../../services/products/products-data";
import { Product } from "../../services/products/models/Product";
import { seeder } from "./util";

seeder<Product>("products", products).catch((error) => {
    console.error("Failed to seed stocks table:", error);
    process.exit(1);
});
