
import * as ecr from 'aws-cdk-lib/aws-ecr';

import { Construct } from 'constructs';


export class ECRConstruct extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.repository = new ecr.Repository(this, 'MyApp');
  }
}