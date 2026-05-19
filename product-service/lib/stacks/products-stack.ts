import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  HttpApi,
  HttpMethod,
  CorsHttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as path from "node:path";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as sns from 'aws-cdk-lib/aws-sns'
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions'

export class ProductsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = dynamodb.Table.fromTableName(
      this,
      "ProductsTable",
      "products",
    );
    const stocksTable = dynamodb.Table.fromTableName(
      this,
      "StocksTable",
      "stocks",
    );

    const getProductsListLambda = new NodejsFunction(
      this,
      "GetProductsListLambda",
      {
        runtime: lambda.Runtime.NODEJS_LATEST,
        handler: "handler",
        entry: path.join(__dirname, "../../lambdas/get-products-list.ts"),
        environment: {
          PRODUCTS_TABLE_NAME: productsTable.tableName,
          STOCKS_TABLE_NAME: stocksTable.tableName,
        },
      },
    );

    const getProductsByIdLambda = new NodejsFunction(
      this,
      "GetProductByIdLambda",
      {
        runtime: lambda.Runtime.NODEJS_LATEST,
        handler: "handler",
        entry: path.join(__dirname, "../../lambdas/get-products-by-id.ts"),
        environment: {
          PRODUCTS_TABLE_NAME: productsTable.tableName,
          STOCKS_TABLE_NAME: stocksTable.tableName,
        },
      },
    );

    const createProductLambda = new NodejsFunction(
      this,
      "CreateProductLambda",
      {
        runtime: lambda.Runtime.NODEJS_LATEST,
        handler: "handler",
        entry: path.join(__dirname, "../../lambdas/create-product.ts"),
        environment: {
          PRODUCTS_TABLE_NAME: productsTable.tableName,
          STOCKS_TABLE_NAME: stocksTable.tableName,
        },
      },
    );

    /* SQS Queue functionality */
    const catalogBatchProcessLambda = new NodejsFunction(
      this,
      "CatalogBatchProcessLambda",
      {
        runtime: lambda.Runtime.NODEJS_LATEST,
        handler: "handler",
        entry: path.join(__dirname, "../../lambdas/catalog-batch-process.ts"),
        environment: {
          PRODUCTS_TABLE_NAME: productsTable.tableName,
          STOCKS_TABLE_NAME: stocksTable.tableName,
        },
      },
    );

    const catalogItemsQueue = new sqs.Queue(this, "CatalogItemsQueue", {
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(4),
    });

    new ssm.StringParameter(this, "CatalogQueueArnParameter", {
      parameterName: "/products-service/queues/catalog-items-arn",
      stringValue: catalogItemsQueue.queueArn,
    });

    catalogBatchProcessLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      }),
    );

    /* SNS topic */
    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      topicName: 'product-alerts',
      displayName: 'Create Product Alert Topic'
    })

    createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription('gogicha@gmail.com')
    )

    catalogBatchProcessLambda.addEnvironment('SNS_TOPIC_ARN', createProductTopic.topicArn)

    createProductTopic.grantPublish(catalogBatchProcessLambda)

    productsTable.grantReadData(getProductsListLambda);
    stocksTable.grantReadData(getProductsListLambda);
    productsTable.grantReadData(getProductsByIdLambda);
    stocksTable.grantReadData(getProductsByIdLambda);
    productsTable.grantWriteData(createProductLambda);
    stocksTable.grantWriteData(createProductLambda);
    productsTable.grantWriteData(catalogBatchProcessLambda);
    stocksTable.grantWriteData(catalogBatchProcessLambda)

    /* Product Service api */
    const api = new HttpApi(this, "ProductsApi", {
      apiName: "Products Service",
      corsPreflight: {
        allowOrigins: [
          "https://d2htpstdr8w7tm.cloudfront.net",
          "https://editor.swagger.io",
        ],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    api.addRoutes({
      path: "/products",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "GetProductsListIntegration",
        getProductsListLambda,
      ),
    });

    api.addRoutes({
      path: "/products/{productId}",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "GetProductsByIdIntegration",
        getProductsByIdLambda,
      ),
    });

    api.addRoutes({
      path: "/products",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "CreateProductIntegration",
        createProductLambda,
      ),
    });

    new cdk.CfnOutput(this, "ProductsApiUrl", {
      value: api.url!,
    });
  }
}
