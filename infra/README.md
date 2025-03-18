# AWS Bedrock Component Resource

This project provides a reusable component resource for AWS Bedrock with built-in observability metrics. The `BedrockModel` class simplifies the deployment and monitoring of AWS Bedrock models in your infrastructure.

## Features

- **Simplified Bedrock Model Management**: Create and manage AWS Bedrock models with a clean, reusable interface
- **Built-in Observability**: Automatically creates CloudWatch dashboards and alarms for your Bedrock models
- **Configurable Alarms**: Set custom thresholds for error rates and latency
- **Provisioned Throughput Support**: Optionally configure provisioned throughput for your models
- **IAM Role Management**: Automatically creates and configures necessary IAM roles and policies

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Node.js](https://nodejs.org/en/download/) (v14 or later)
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- AWS account with access to AWS Bedrock service
- Access to the desired AWS Bedrock models (may require requesting access in the AWS console)

## Setup

1. Install dependencies:

```bash
cd infra
pnpm install
```

2. Configure AWS credentials:

```bash
aws configure
```

3. Initialize Pulumi stack:

```bash
pulumi stack init dev
```

## Usage

### Basic Usage

```typescript
import { BedrockModel } from "./bedrock-resource";

// Create a Bedrock model with default settings
const claudeModel = new BedrockModel("claude-model", {
    name: "claude-v2",
    modelId: "anthropic.claude-v2",
    tags: {
        environment: "development",
        project: "my-project",
    },
});

// Export the CloudWatch dashboard URL
export const dashboardUrl = pulumi.interpolate`https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?region=${aws.config.region}#dashboards:name=${claudeModel.dashboard.dashboardName}`;
```

### Advanced Usage with Alarms

```typescript
import { BedrockModel } from "./bedrock-resource";

// Create an SNS topic for alarms
const alarmTopic = new aws.sns.Topic("bedrock-alarms", {
    displayName: "Bedrock Model Alarms",
});

// Create a Bedrock model with custom alarm settings
const claudeModel = new BedrockModel("claude-model", {
    name: "claude-v2",
    modelId: "anthropic.claude-v2",
    throughputCapacity: 1, // Optional: Provision dedicated throughput
    tags: {
        environment: "production",
        project: "my-project",
        service: "ai-assistant",
    },
    alarms: {
        errorRateThreshold: 3, // 3% error rate threshold
        latencyThreshold: 3000, // 3 seconds latency threshold
        evaluationPeriods: 3, // Evaluate over 3 periods
        alarmTopicArn: alarmTopic.arn, // Send notifications to SNS topic
    },
});
```

### Configuration Options

The `BedrockModel` class accepts the following configuration options:

```typescript
export interface BedrockModelConfig {
    // The name of the Bedrock model resource
    name: string;
    
    // The AWS Bedrock model ID to use (e.g., "anthropic.claude-v2")
    modelId: string;
    
    // Optional throughput capacity for the model (in provisioned throughput units)
    throughputCapacity?: number;
    
    // Optional tags to apply to all created resources
    tags?: { [key: string]: string };
    
    // Optional CloudWatch alarm configuration
    alarms?: {
        // Threshold for model invocation errors (percentage)
        errorRateThreshold?: number;
        
        // Threshold for model latency (milliseconds)
        latencyThreshold?: number;
        
        // Period for evaluating metrics (in seconds)
        evaluationPeriods?: number;
        
        // SNS topic ARN for alarm notifications
        alarmTopicArn?: pulumi.Input<string>;
    };
}
```

## Deployment

Deploy the infrastructure:

```bash
pulumi up
```

Review the proposed changes and confirm to proceed with the deployment.

## Accessing Bedrock Models

After deployment, you can use the AWS Bedrock API or SDK to interact with your models:

```bash
aws bedrock-runtime invoke-model \
  --model-id <model-id> \
  --body '{"prompt": "Explain quantum computing in simple terms", "max_tokens": 500}' \
  --cli-binary-format raw-in-base64-out \
  output.json
```

Replace `<model-id>` with the appropriate model ID (e.g., `anthropic.claude-v2`).

## Cleanup

To remove all resources created by this Pulumi stack:

```bash
pulumi destroy
```

## Notes

- AWS Bedrock pricing applies for model usage
- Provisioned throughput incurs costs even when not in use
- Ensure you have requested access to the desired models in the AWS Bedrock console
- The CloudWatch dashboard provides visibility into model performance and usage
- Alarms will trigger based on your configured thresholds