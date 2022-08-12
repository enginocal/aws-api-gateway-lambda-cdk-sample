#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EnginWebApiLambda } from '../lib/engin-web-api-lambda-stack';
import { getAppEnv, getConfig } from '../lib/config';
import { SSMService } from '../lib/aws/ssm';
import { KeyValuePairs } from '../lib/common/stack-props';


const app = new cdk.App();
const appEnv = getAppEnv();
const { account, region, ssmParameterPath } = getConfig(app, appEnv);

const env: cdk.Environment = { account, region }
let plainServiceEnv : KeyValuePairs = {};


async function main () {
  try {
    const ssmService = new SSMService(region)
    plainServiceEnv = await ssmService.getParametersByPath(ssmParameterPath)
  } catch (error) {
    console.error('Cannot get env paramaters', error)
  }

  cdk.Tags.of(app).add('environment', appEnv);
  cdk.Tags.of(app).add('application', `engin-web-api-lambda-${appEnv}`);

  new EnginWebApiLambda(app, `EnginWebApiLambda-${appEnv}`, { env, plainServiceEnv })
}

main()