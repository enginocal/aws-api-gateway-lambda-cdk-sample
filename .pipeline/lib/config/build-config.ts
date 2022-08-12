import * as cdk from 'aws-cdk-lib'
import { debug } from 'console'
import { Construct } from 'constructs'

interface Vpc {
  id: string
}

interface LambdaConfig {
  memorySizeInMB: number
  timeoutInSeconds: number
}

interface Config {
  account: string
  region: string
  vpc: Vpc
  lambda: LambdaConfig,
  netCoreEnv: string
}

enum APP_ENV {
  SANDBOX = 'sandbox',
  TEST = 'test',
  STAGE = 'stage',
  LIVE = 'live'
}

export function getConfig(scope: cdk.App | Construct, appEnv: string) {
  const context = scope.node.tryGetContext(appEnv)

  const config: Config = {
    account: context.account,
    region: context.region,
    vpc: {
      id: context.vpc.id
    },
    lambda: context.lambda,
    netCoreEnv: context.netCoreEnv
  }

  return config
}

export function getAppEnv(): string {
  const appEnv = process.env.APP_ENV ?? ''

  console.log(`App env: ${appEnv}`);
  console.log(appEnv);

  if (Object.values(APP_ENV).includes(appEnv as APP_ENV)) {
    return appEnv
  } else {
    throw new Error(`
      APP_ENV is not set or is invalid.
    `)
  }
}
