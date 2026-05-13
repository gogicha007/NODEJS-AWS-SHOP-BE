import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { HttpApi, HttpMethod, CorsHttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as path from "node:path"
import * as s3 from 'aws-cdk-lib/aws-s3'


export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /* labmda for S3 bucket allowing policies */
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
