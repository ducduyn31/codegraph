import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { BedrockModel } from "./bedrock-resource";

// Create an SNS topic for Bedrock alarms
const alarmTopic = new aws.sns.Topic("bedrock-alarms", {
    displayName: "Bedrock Model Alarms",
});

// Create a Bedrock model with observability metrics
const deepseekModel = new BedrockModel("claude-model", {
    displayName: "My DeepSeek Model",
    modelId: "deepseek.r1-v1:0",
    tags: {
        environment: "development",
        project: "codegraph",
        service: "ai-assistant",
    },
    alarms: {
        errorRateThreshold: 5, // 5% error rate threshold
        latencyThreshold: 5000, // 5 seconds latency threshold
        evaluationPeriods: 3, // Evaluate over 3 periods
        alarmTopicArn: alarmTopic.arn,
    },
});

// Export resources
export const deepseekModelDashboardUrl = pulumi.interpolate`https://${aws.config.region}.console.aws.amazon.com/cloudwatch/home?region=${aws.config.region}#dashboards:name=${deepseekModel.dashboard.dashboardName}`;
export const alarmTopicArn = alarmTopic.arn;
