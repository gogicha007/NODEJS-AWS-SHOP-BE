import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class ProductsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const getProductsListLambda = new NodejsFunction(this, "GetProductsListLambda", {
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: "handler",
            entry: path.join(__dirname, "../../lambdas/get-products-list.ts"),
        });

        const getProductsByIdLambda = new NodejsFunction(this, "GetProductByIdLambda", {
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: "handler",
            entry: path.join(__dirname, "../../lambdas/get-products-by-id.ts"),
        });

        const api = new HttpApi(this, "ProductsApi", {
            apiName: "Products Service",
        });

        api.addRoutes({
            path: "/products",
            methods: [HttpMethod.GET],
            integration: new HttpLambdaIntegration("GetProductsListIntegration", getProductsListLambda),
        });

        api.addRoutes({
            path: "/products/{productId}",
            methods: [HttpMethod.GET],
            integration: new HttpLambdaIntegration("GetProductsByIdIntegration", getProductsByIdLambda),
        });

        new cdk.CfnOutput(this, "ProductsApiUrl", {
            value: api.url!,
        });
    }
}
