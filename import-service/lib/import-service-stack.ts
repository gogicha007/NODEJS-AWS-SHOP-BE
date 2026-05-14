import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as path from "node:path"
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';


export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /* retrieve S3 bucket to allow policies */
    const uploadBucket = s3.Bucket.fromBucketName(
      this,
      'ImportedBucket',
      'vlab-aws-shop-upload'
    )

    /* lambda for import products file */
    const importProductsFile = new NodejsFunction(this, "ImportProductsFileLambda", {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'handler',
      entry: path.join(__dirname, "../lambdas/import-products.ts"),
      environment: {
        BUCKET_NAME: uploadBucket.bucketName
      }
    })

    uploadBucket.grantPut(importProductsFile)

    /* lambda for import file parser */
    const importFileParser = new NodejsFunction(this, "ImportFileParserLambda", {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'handler',
      entry: path.join(__dirname, "../lambdas/file-parser.ts")
    })

    uploadBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: 'uploaded/', suffix: '.csv' }
    );

    const api = new HttpApi(this, "ImportApi", {
      apiName: "Import Service",
      corsPreflight: {
        allowOrigins: [
          "https://d2htpstdr8w7tm.cloudfront.net",
          "https://editor.swagger.io"
        ],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.OPTIONS],
        allowHeaders: ["Content-Type", "Authorization"]
      }
    })

    api.addRoutes({
      path: "/import",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration("ImportProductsFileIntegration", importProductsFile)
    })
  }
}
