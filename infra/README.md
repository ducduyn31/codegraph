# AWS Bedrock Deepseek R1 7B Pulumi Project

This Pulumi project sets up AWS Bedrock to run the Deepseek R1 7B model.

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Node.js](https://nodejs.org/en/download/) (v14 or later)
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- AWS account with access to AWS Bedrock service
- Access to the Deepseek R1 7B model in AWS Bedrock (may require requesting access in the AWS console)

## Setup

1. Install dependencies:

```bash
cd infra
npm install
```

2. Configure AWS credentials:

```bash
aws configure
```

3. Initialize Pulumi stack:

```bash
pulumi stack init dev
```

## Configuration

The default configuration is in `Pulumi.dev.yaml`. You can modify it or create new stack configurations as needed.

Key configuration parameters:
- `aws:region`: AWS region where resources will be deployed (ensure it supports Bedrock and the Deepseek model)
- `projectName`: Name for the project resources
- `environment`: Deployment environment (dev, staging, prod, etc.)

## Deployment

Deploy the infrastructure:

```bash
pulumi up
```

Review the proposed changes and confirm to proceed with the deployment.

## Usage

After deployment, you can use the AWS Bedrock API or SDK to interact with the Deepseek R1 7B model. The model will be available through the AWS Bedrock service.

Example using AWS CLI:

```bash
aws bedrock-runtime invoke-model \
  --model-id <provisioned-model-arn> \
  --body '{"prompt": "Explain quantum computing in simple terms", "max_tokens": 500}' \
  --cli-binary-format raw-in-base64-out \
  output.json
```

Replace `<provisioned-model-arn>` with the ARN from the Pulumi output.

## Cleanup

To remove all resources created by this Pulumi stack:

```bash
pulumi destroy
```

## Notes

- AWS Bedrock pricing applies for model usage
- Provisioned throughput incurs costs even when not in use
- Ensure you have requested access to the Deepseek R1 7B model in the AWS Bedrock console