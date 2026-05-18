import * as cdk from 'aws-cdk-lib/core';
import { ImportServiceStack } from '../lib/import-service-stack';

const app = new cdk.App();
new ImportServiceStack(app, 'ImportServiceStack', {
  env: { account: '149614785775', region: 'eu-north-1' },
});
