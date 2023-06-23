import { CfnOutput } from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';

interface PipelineConstructProps {
  ecrRepository: ecr.Repository;
}

export class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props: PipelineConstructProps) {
    super(scope, id);

    const { ecrRepository } = props;

    // This can be removed if using GitHub for source code
    const sourceRepo = new codecommit.Repository(this, 'SourceCode', {
      repositoryName: 'SourceCodeRepo',
      description: 'Repository for my application code',
    });

    const pipeline = new codepipeline.Pipeline(this, 'ImageBuilderPipeline', {
      pipelineName: 'ImageBuilderPipeline',
      crossAccountKeys: false,
    });

    const codeQualityBuild = new codebuild.PipelineProject(
      this,
      'ImageBuilderBuild',
      {
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
          privileged: true,
          computeType: codebuild.ComputeType.LARGE
        },
      }
    );

    new CfnOutput(this, 'SourceCodeCodeCommitRepositoryUrl', {
      value: sourceRepo.repositoryCloneUrlHttp,
    });

    const sourceOutput = new codepipeline.Artifact();

    pipeline.addStage({
      stageName: 'Source',
        actions: [
          new codepipeline_actions.CodeCommitSourceAction({
            actionName: 'CodeCommit',
            repository: sourceRepo,
            output: sourceOutput,
            branch: 'main',
          }),
        ],
    });

    
    const dockerBuildProject = new codebuild.PipelineProject(this, 'DockerBuildProject', {
      environmentVariables: {
        'IMAGE_TAG': { value: 'latest' },
        'IMAGE_REPO_URI': {value: ecrRepository.repositoryUri },
        'AWS_DEFAULT_REGION': {value: process.env.CDK_DEFAULT_REGION },
      },
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
        computeType: codebuild.ComputeType.LARGE
        },
    });

    const dockerBuildRolePolicy =  new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:GetRepositoryPolicy",
        "ecr:DescribeRepositories",
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ]
    });
    
    dockerBuildProject.addToRolePolicy(dockerBuildRolePolicy);

    const dockerBuildOutput = new codepipeline.Artifact();

    pipeline.addStage({
      stageName: 'Docker-Push-ECR',
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: 'docker-build',
          project: dockerBuildProject,
          input: sourceOutput,
          outputs: [dockerBuildOutput],
        }),
      ],
    });    
  }
};