import * as cdk from "aws-cdk-lib";
import { ProductsStack } from "../lib/stacks/products-stack";

const app = new cdk.App();
new ProductsStack(app, 'ProductsStack', {
  env: { account: '149614785775', region: 'eu-north-1' },
});
