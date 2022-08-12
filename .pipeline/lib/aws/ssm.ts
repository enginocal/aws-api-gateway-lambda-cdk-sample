
import { SSMClient, GetParametersByPathCommand, Parameter } from '@aws-sdk/client-ssm'
import { KeyValuePairs } from '../common/stack-props'


export class SSMService {
    client: SSMClient
  
    constructor (region: string) {
      this.client = new SSMClient({ region })
    }
  
    async getParametersByMultiplePaths (pathPrefixes: string[]): Promise<KeyValuePairs> {
      const keyValuePairs: {
            [key: string]: string
        } = {}
  
      for (const path of pathPrefixes) {
        const newPairs = await this.getParametersByPath(path)
  
        if (newPairs) {
          Object.keys(newPairs).forEach(key => {
            keyValuePairs[key] = newPairs[key]
          })
        }
      }
  
      return keyValuePairs
    }
  
    async getParametersByPath (pathPrefix: string): Promise<KeyValuePairs> {
      const cmd = new GetParametersByPathCommand({
        Path: pathPrefix,
        Recursive: true
      })
  
      const data = await this.client.send(cmd)
  
      let keyValuePairs: {
            [key: string]: string
        } = {}
  
      if (data && data.Parameters && data.Parameters.length > 0) {
        keyValuePairs = this.getKeyValuePairsFromParameters(data.Parameters)
      }
  
      return keyValuePairs
    }
  
    getKeyValuePairsFromParameters (parameters: Parameter[]): KeyValuePairs {
      const keyValuePairs: {
            [key: string]: string
        } = {}
  
      parameters.forEach((param: Parameter) => {
        if (param.Name) {
          const splittedParamName = param.Name.split('/')
          const key = splittedParamName[splittedParamName.length - 1]
  
          if (param.Value) {
            keyValuePairs[key] = param.Value
          }
        }
      })
  
      return keyValuePairs
    }
  }
  