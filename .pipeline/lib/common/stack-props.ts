import * as cdk from 'aws-cdk-lib'

export interface KeyValuePairs {
  [key: string]: string
}

export interface CommonStackProps extends cdk.StackProps {
  plainServiceEnv: KeyValuePairs
}
