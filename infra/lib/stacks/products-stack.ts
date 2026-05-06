import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as path from "node:path";

export class ProductsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const productsTable = dynamodb.Table.fromTableName(this, "ProductsTable", "products");
        const stocksTable = dynamodb.Table.fromTableName(this, "StocksTable", "stocks");

        const getProductsListLambda = new NodejsFunction(this, "GetProductsListLambda", {
            runtime: lambda.Runtime.NODEJS_LATEST,
            handler: "handler",
            entry: path.join(__dirname, "../../lambdas/get-products-list.ts"),
            environment: {
                PRODUCTS_TABLE_NAME: productsTable.tableName,
                STOCKS_TABLE_NAME: stocksTable.tableName,
            },
        });

        const getProductsByIdLambda = new NodejsFunction(this, "GetProductByIdLambda", {
            runtime: lambda.Runtime.NODEJS_LATEST,
            handler: "handler",
            entry: path.join(__dirname, "../../lambdas/get-products-by-id.ts"),
            environment: {
                PRODUCTS_TABLE_NAME: productsTable.tableName,
                STOCKS_TABLE_NAME: stocksTable.tableName,
            },
        });

        productsTable.grantReadData(getProductsListLambda);
        stocksTable.grantReadData(getProductsListLambda);
        productsTable.grantReadData(getProductsByIdLambda);
        stocksTable.grantReadData(getProductsByIdLambda);

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
