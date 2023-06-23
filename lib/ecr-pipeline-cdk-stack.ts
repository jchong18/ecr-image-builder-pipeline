import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ECRConstruct } from './constructs/ecr-construct';
import { PipelineConstruct } from './constructs/pipeline-construct';

export class EcrPipelineCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ecrConstruct = new ECRConstruct(this, 'Ecr');
    const pipelineConstruct = new PipelineConstruct(this, 'Pipeline', {
      ecrRepository: ecrConstruct.repository,
    });
  }
}
