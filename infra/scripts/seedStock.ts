import { stocks } from "../../services/products/products-data";
import { Stock } from "../../services/products/models/Product";
import { seeder } from "./util";

seeder<Stock>("stocks", stocks).catch((error) => {
    console.error("Failed to seed stocks table:", error);
    process.exit(1);
});
