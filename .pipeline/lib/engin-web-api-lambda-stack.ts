import { Stack, StackProps } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { CommonStackProps } from './common/stack-props';
import { getAppEnv, getConfig } from './config';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class EnginWebApiLambda extends Stack {
  constructor(scope: Construct, id: string, props: CommonStackProps) {
    super(scope, id, props);

    const appEnv = getAppEnv();
    const config = getConfig(scope, appEnv);

    // if you have created s3 bucket in the same account as your CDK app, you can use the following code:
    const lambdaArtifactBucket = Bucket.fromBucketName(this, 'LambdaArtifactBucket', `your_bucket_name`);

    // if you doesnt have s3 bucket in the same account as your CDK app, you can use the following code:
    const lambdaArtifactBucketNews3 = new Bucket(this, 'LambdaArtifactBucketNews3', {
      bucketName: 'your_bucket_name',
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });


    const lambdaTag = `${appEnv}-lambda-tag-deneme`;

    if (!lambdaTag) {
      throw new Error("Lambda tag is not defined");
    }

    const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
      vpcId: config.vpc.id
    });

    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'EnginWebApiLambdaSg', {
      vpc,
      securityGroupName: `engin-web-api-lambda-security-group-${appEnv}-sg`,
      description: `CSharp lambda ${appEnv} security group`,
      allowAllOutbound: true
    });

    const lambdaFunction = new lambda.Function(this, 'EnginWebApiLambda', {
      functionName: `engin-web-api-lambda-${appEnv}`,
      memorySize: config.lambda.memorySizeInMB,
      timeout: cdk.Duration.seconds(config.lambda.timeoutInSeconds),
      runtime: lambda.Runtime.DOTNET_6,
      architecture: lambda.Architecture.X86_64,
      handler: 'engin-web-api::engin_web_api.LambdaEntryPoint::FunctionHandlerAsync',
      code: lambda.Code.fromBucket(lambdaArtifactBucket, 'engin-web-api-lambda-test/artifacts/lambda.zip'),
      environment: {
        APPLICATION_NAME: 'engin-web-api',
        APP_ENV: appEnv,
        NETCORE_ENV: config.netCoreEnv
      },
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        onePerAz: true,
        availabilityZones: ['eu-central-1a', 'eu-central-1b']
      },
      securityGroups: [lambdaSecurityGroup]
    });

    const lambdaFunctionPolicy = new iam.ManagedPolicy(this, 'EnginWebApiPolicy', {
      managedPolicyName: `engin-web-api-lambda-policy-${appEnv}`,
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['ssm:GetParametersByPath'],
          resources: ['*']
        })
      ]
    });

    lambdaFunction.role?.addManagedPolicy(lambdaFunctionPolicy)


    const api = new apigateway.RestApi(this, 'EnginWebApiLambdaGateway', {
      restApiName: `engin-web-api-lambda-${appEnv}-gateway`,
      description: `Engin Web API ${appEnv} gateway`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*'],
        allowCredentials: false,

      },
      deployOptions: {
        dataTraceEnabled: true,
        tracingEnabled: true,
        cacheClusterEnabled: true
      },

      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL]
      }
    });

    var apiResource = api.root.addResource('{proxy+}');
    var apiEndpoint = api.root.addResource('api');
    const values = apiEndpoint.addResource('values');
    apiEndpoint.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunction));
    values.addMethod('GET', new apigateway.LambdaIntegration(lambdaFunction, { proxy: true }));
    apiResource.addMethod('ANY');
  }
}
