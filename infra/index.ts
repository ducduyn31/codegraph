import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Configuration
const config = new pulumi.Config();
const projectName = config.get("projectName") || "deepseek-r1-7b";
const region = config.get("region") || "us-west-2"; // Ensure this region supports Bedrock and the Deepseek model
const tags = {
    Project: projectName,
    Environment: config.get("environment") || "dev",
    ManagedBy: "pulumi",
};

// Create an IAM role for Bedrock model invocation
const bedrockRole = new aws.iam.Role("bedrockRole", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "bedrock.amazonaws.com",
            },
        }],
    }),
    tags,
});

// Attach policies to the Bedrock role
const bedrockPolicyAttachment = new aws.iam.RolePolicyAttachment("bedrockPolicyAttachment", {
    role: bedrockRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonBedrockFullAccess",
});

// Create a custom policy for S3 access (for model artifacts)
const s3AccessPolicy = new aws.iam.Policy("s3AccessPolicy", {
    description: "Policy for Bedrock to access S3 for model artifacts",
    policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Action: [
                "s3:GetObject",
                "s3:PutObject",
                "s3:ListBucket",
            ],
            Resource: [
                "arn:aws:s3:::*",
            ],
        }],
    }),
    tags,
});

// Attach the S3 access policy to the Bedrock role
const s3PolicyAttachment = new aws.iam.RolePolicyAttachment("s3PolicyAttachment", {
    role: bedrockRole.name,
    policyArn: s3AccessPolicy.arn,
});

// Request access to the Deepseek R1 7B model
// Note: The model ID for Deepseek R1 7B may vary, check AWS documentation for the correct ID
const modelAccess = new aws.bedrock.ModelAccess("deepseekModelAccess", {
    modelId: "deepseek.r1-7b", // Replace with the actual model ID from AWS Bedrock
});

// Create a model invocation configuration
const modelInvocationConfig = new aws.bedrock.ModelInvocationConfiguration("deepseekInvocationConfig", {
    modelId: modelAccess.modelId,
    serviceRoleArn: bedrockRole.arn,
});

// Create a provisioned throughput for the model
const provisionedThroughput = new aws.bedrock.ProvisionedModelThroughput("deepseekThroughput", {
    modelId: modelAccess.modelId,
    provisionedModelName: `${projectName}-provisioned`,
    modelUnits: 1, // Adjust based on your throughput needs
    tags,
});

// Export the outputs
export const bedrockRoleArn = bedrockRole.arn;
export const modelId = modelAccess.modelId;
export const provisionedModelName = provisionedThroughput.provisionedModelName;
export const provisionedModelArn = provisionedThroughput.arn;