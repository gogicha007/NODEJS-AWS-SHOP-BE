import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as path from "node:path"
import * as ssm from 'aws-cdk-lib/aws-ssm'
import 'dotenv/config'

export class AuthorizationServiceStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const basicAuthorizer = new NodejsFunction(this, "BasicAuthorizerLambda", {
      runtime: lambda.Runtime.NODEJS_LATEST,
      handler: 'handler',
      entry: path.join(__dirname, "../lambdas/basic-authorizer.ts"),
      environment: {
        gogicha007: process.env.gogicha007 || 'TEST_PASSWORD'
      }
    })

    basicAuthorizer.addPermission('AllowHttpApiGatewayInvokeAuthorizer', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:aws:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*/authorizers/*`,
    })

    new ssm.StringParameter(this, 'BasicAuthorizerArnParameter', {
      parameterName: '/api/import-service/basic-auth',
      stringValue: basicAuthorizer.functionArn,
      description: 'The ARN of the basic authorization lambda function'
    })
  }
}
