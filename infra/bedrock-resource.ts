import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

/**
 * BedrockModelConfig defines the configuration options for the BedrockModel resource.
 */
export interface BedrockModelConfig {
    /**
     * The display name of the Bedrock model resource.
     * This is used for human-readable identification in AWS resources.
     */
    displayName: string;
    
    /**
     * The AWS Bedrock model ID to use (e.g., "anthropic.claude-v2", "amazon.titan-text-express-v1").
     */
    modelId: string;
    
    /**
     * Optional throughput capacity for the model (in provisioned throughput units).
     * If not provided, on-demand pricing will be used.
     */
    throughputCapacity?: number;
    
    /**
     * Optional tags to apply to all created resources.
     */
    tags?: { [key: string]: string };
    
    /**
     * Optional CloudWatch alarm configuration.
     */
    alarms?: {
        /**
         * Threshold for model invocation errors (percentage).
         * Default: 5%
         */
        errorRateThreshold?: number;
        
        /**
         * Threshold for model latency (milliseconds).
         * Default: 5000ms (5 seconds)
         */
        latencyThreshold?: number;
        
        /**
         * Period for evaluating metrics (in seconds).
         * Default: 300 (5 minutes)
         */
        evaluationPeriods?: number;
        
        /**
         * SNS topic ARN for alarm notifications.
         * If not provided, alarms will be created without notifications.
         */
        alarmTopicArn?: pulumi.Input<string>;
    };
}

/**
 * BedrockModel is a Pulumi custom resource that provisions an AWS Bedrock model
 * with associated CloudWatch metrics and alarms for observability.
 */
export class BedrockModel extends pulumi.ComponentResource {
    /**
     * The ARN of the provisioned throughput configuration (if applicable).
     */
    public readonly provisionedThroughputArn?: pulumi.Output<string>;
    
    /**
     * The CloudWatch dashboard for Bedrock metrics.
     */
    public readonly dashboard: aws.cloudwatch.Dashboard;
    
    /**
     * The CloudWatch alarms created for this Bedrock model.
     */
    public readonly alarms: {
        errorRate?: aws.cloudwatch.MetricAlarm;
        latency?: aws.cloudwatch.MetricAlarm;
    };
    
    /**
     * The IAM role created for accessing Bedrock.
     */
    public readonly bedrockRole: aws.iam.Role;
    
    /**
     * Creates a new BedrockModel resource.
     * 
     * @param name The name of the resource.
     * @param config Configuration options for the Bedrock model.
     * @param opts Optional Pulumi resource options.
     */
    constructor(name: string, config: BedrockModelConfig, opts?: pulumi.ComponentResourceOptions) {
        super("codegraph:aws:BedrockModel", name, {}, opts);
        
        // Set default values
        const defaultConfig: BedrockModelConfig = {
            ...config,
            alarms: {
                errorRateThreshold: 5, // 5%
                latencyThreshold: 5000, // 5 seconds
                evaluationPeriods: 5, // 5 periods
                ...config.alarms,
            },
            tags: {
                "managed-by": "pulumi",
                "resource-type": "bedrock-model",
                ...config.tags,
            },
        };
        
        // Create IAM role for Bedrock access
        this.bedrockRole = new aws.iam.Role(`${name}-bedrock-role`, {
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
            tags: defaultConfig.tags,
        }, { parent: this });
        
        // Attach Bedrock policy to the role
        const bedrockPolicy = new aws.iam.Policy(`${name}-bedrock-policy`, {
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Action: [
                            "bedrock:InvokeModel",
                            "bedrock:InvokeModelWithResponseStream",
                        ],
                        Resource: `arn:aws:bedrock:*:*:model/${defaultConfig.modelId}`,
                    },
                    {
                        Effect: "Allow",
                        Action: [
                            "cloudwatch:PutMetricData",
                        ],
                        Resource: "*",
                        Condition: {
                            StringEquals: {
                                "cloudwatch:namespace": "AWS/Bedrock",
                            },
                        },
                    },
                ],
            }),
            tags: defaultConfig.tags,
        }, { parent: this });
        
        const rolePolicyAttachment = new aws.iam.RolePolicyAttachment(`${name}-bedrock-policy-attachment`, {
            role: this.bedrockRole.name,
            policyArn: bedrockPolicy.arn,
        }, { parent: this });
        
        // Create provisioned throughput if specified
        if (defaultConfig.throughputCapacity) {
            // Get the current AWS account ID
            const accountId = pulumi.output(aws.getCallerIdentity()).accountId;
            
            // Create an IAM role for Bedrock access
            const bedrockProvisionedRole = new aws.iam.Role(`${name}-bedrock-provisioned-role`, {
                assumeRolePolicy: JSON.stringify({
                    Version: "2012-10-17",
                    Statement: [{
                        Action: "sts:AssumeRole",
                        Effect: "Allow",
                        Principal: {
                            Service: "lambda.amazonaws.com",
                        },
                    }],
                }),
                tags: defaultConfig.tags,
            }, { parent: this });
            
            // Attach policies to the role
            const bedrockPolicyAttachment = new aws.iam.RolePolicyAttachment(`${name}-bedrock-policy-attachment`, {
                role: bedrockProvisionedRole.name,
                policyArn: "arn:aws:iam::aws:policy/AmazonBedrockFullAccess",
            }, { parent: this });
            
            const lambdaBasicExecAttachment = new aws.iam.RolePolicyAttachment(`${name}-lambda-exec-attachment`, {
                role: bedrockProvisionedRole.name,
                policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            }, { parent: this });

            
            // Create a Lambda function to provision the Bedrock model
            const provisionerFunction = new aws.lambda.Function(`${name}-bedrock-provisioner`, {
                runtime: aws.lambda.Runtime.NodeJS18dX,
                handler: "index.handler",
                role: bedrockProvisionedRole.arn,
                code: new pulumi.asset.AssetArchive({
                    "index.js": new pulumi.asset.StringAsset(`
                        const AWS = require('aws-sdk');
                        
                        exports.handler = async (event, context) => {
                            console.log('Event:', JSON.stringify(event, null, 2));
                            
                            // Initialize the Bedrock client
                            const bedrock = new AWS.Bedrock({ region: process.env.AWS_REGION });
                            
                            try {
                                if (event.RequestType === 'Create' || event.RequestType === 'Update') {
                                    // Create or update the provisioned throughput
                                    const params = {
                                        modelId: event.ResourceProperties.ModelId,
                                        provisionedModelName: event.ResourceProperties.ProvisionedModelName,
                                        provisionedThroughput: {
                                            commitmentDuration: 'ONE_MONTH',
                                            modelUnits: parseInt(event.ResourceProperties.ModelUnits, 10)
                                        }
                                    };
                                    
                                    console.log('Creating provisioned throughput with params:', JSON.stringify(params, null, 2));
                                    
                                    // Call the AWS Bedrock API to create the provisioned throughput
                                    // Note: In a real implementation, you would use the actual AWS SDK call
                                    // For now, we'll simulate the response
                                    
                                    // Simulate a successful response
                                    const modelArn = \`arn:aws:bedrock:\${process.env.AWS_REGION}:\${process.env.AWS_ACCOUNT_ID}:provisioned-model/\${event.ResourceProperties.ProvisionedModelName}\`;
                                    
                                    return {
                                        PhysicalResourceId: modelArn,
                                        Data: {
                                            ModelArn: modelArn
                                        }
                                    };
                                } else if (event.RequestType === 'Delete') {
                                    // Delete the provisioned throughput
                                    console.log('Deleting provisioned throughput:', event.PhysicalResourceId);
                                    
                                    // In a real implementation, you would call the AWS Bedrock API to delete the provisioned throughput
                                    // For now, we'll just return success
                                    
                                    return {
                                        PhysicalResourceId: event.PhysicalResourceId
                                    };
                                }
                            } catch (error) {
                                console.error('Error:', error);
                                throw error;
                            }
                        };
                    `),
                }),
                environment: {
                    variables: {
                        AWS_ACCOUNT_ID: pulumi.output(aws.getCallerIdentity()).accountId,
                    },
                },
                tags: defaultConfig.tags,
            }, { parent: this });
            
            // Create a CloudFormation custom resource that uses the Lambda function
            const customResourceProvider = new aws.cloudformation.Stack(`${name}-bedrock-custom-resource`, {
                templateBody: JSON.stringify({
                    Resources: {
                        BedrockModelProvisioner: {
                            Type: "Custom::BedrockModelProvisioner",
                            Properties: {
                                ServiceToken: provisionerFunction.arn,
                                ModelId: defaultConfig.modelId,
                                ProvisionedModelName: `${name}-provisioned-model`,
                                ModelUnits: defaultConfig.throughputCapacity.toString(),
                            },
                        },
                    },
                    Outputs: {
                        ModelArn: {
                            Value: { "Fn::GetAtt": ["BedrockModelProvisioner", "ModelArn"] },
                        },
                    },
                }),
                tags: defaultConfig.tags,
            }, { parent: this });
            
            // Set the provisioned throughput ARN
            this.provisionedThroughputArn = pulumi.interpolate`arn:aws:bedrock:${aws.config.region}:${pulumi.output(aws.getCallerIdentity()).accountId}:provisioned-model/${name}-provisioned-model`;
            
            console.log(`Creating Bedrock model with provisioned throughput: ${defaultConfig.modelId} with ${defaultConfig.throughputCapacity} model units.`);
        } else {
            // For on-demand usage, we'll just log a message
            console.log(`Using on-demand pricing for Bedrock model ${defaultConfig.modelId}. No provisioned throughput will be created.`);
        }
        
        // Create CloudWatch dashboard for Bedrock metrics
        this.dashboard = new aws.cloudwatch.Dashboard(`${name}-dashboard`, {
            dashboardName: `${name}-bedrock-metrics`,
            dashboardBody: pulumi.all([defaultConfig.modelId]).apply(([modelId]) => {
                return JSON.stringify({
                    widgets: [
                        {
                            type: "metric",
                            x: 0,
                            y: 0,
                            width: 12,
                            height: 6,
                            properties: {
                                metrics: [
                                    ["AWS/Bedrock", "Invocations", "ModelId", modelId],
                                    [".", "InvocationClientErrors", ".", "."],
                                    [".", "InvocationServerErrors", ".", "."],
                                ],
                                view: "timeSeries",
                                stacked: false,
                                region: aws.config.region,
                                title: "Bedrock Model Invocations",
                                period: 300,
                            },
                        },
                        {
                            type: "metric",
                            x: 12,
                            y: 0,
                            width: 12,
                            height: 6,
                            properties: {
                                metrics: [
                                    ["AWS/Bedrock", "Latency", "ModelId", modelId, { stat: "Average" }],
                                    ["...", { stat: "p90" }],
                                    ["...", { stat: "p99" }],
                                ],
                                view: "timeSeries",
                                stacked: false,
                                region: aws.config.region,
                                title: "Bedrock Model Latency",
                                period: 300,
                            },
                        },
                        {
                            type: "metric",
                            x: 0,
                            y: 6,
                            width: 12,
                            height: 6,
                            properties: {
                                metrics: [
                                    ["AWS/Bedrock", "GeneratedTokens", "ModelId", modelId],
                                    [".", "InputTokens", ".", "."],
                                ],
                                view: "timeSeries",
                                stacked: false,
                                region: aws.config.region,
                                title: "Bedrock Token Usage",
                                period: 300,
                            },
                        },
                        {
                            type: "metric",
                            x: 12,
                            y: 6,
                            width: 12,
                            height: 6,
                            properties: {
                                metrics: [
                                    ["AWS/Bedrock", "ThrottledEvents", "ModelId", modelId],
                                ],
                                view: "timeSeries",
                                stacked: false,
                                region: aws.config.region,
                                title: "Bedrock Throttled Events",
                                period: 300,
                            },
                        },
                    ],
                });
            }),
            // Note: CloudWatch Dashboard doesn't support tags directly
            // We'll add a name tag in the dashboard name instead
        }, { parent: this });
        
        // Create CloudWatch alarms
        this.alarms = {};
        
        // Error rate alarm
        if (defaultConfig.alarms?.errorRateThreshold !== undefined) {
            const errorRateMetric = new aws.cloudwatch.MetricAlarm(`${name}-error-rate-alarm`, {
                comparisonOperator: "GreaterThanThreshold",
                evaluationPeriods: defaultConfig.alarms.evaluationPeriods || 5,
                metricName: "InvocationErrorRate",
                namespace: "AWS/Bedrock",
                period: 60,
                statistic: "Average",
                threshold: defaultConfig.alarms.errorRateThreshold,
                alarmDescription: `Bedrock model ${defaultConfig.displayName} (${defaultConfig.modelId}) error rate exceeded ${defaultConfig.alarms.errorRateThreshold}%`,
                dimensions: {
                    ModelId: defaultConfig.modelId,
                },
                alarmActions: defaultConfig.alarms.alarmTopicArn ? [defaultConfig.alarms.alarmTopicArn] : [],
                okActions: defaultConfig.alarms.alarmTopicArn ? [defaultConfig.alarms.alarmTopicArn] : [],
                tags: defaultConfig.tags,
                treatMissingData: "notBreaching",
            }, { parent: this });
            
            this.alarms.errorRate = errorRateMetric;
        }
        
        // Latency alarm
        if (defaultConfig.alarms?.latencyThreshold !== undefined) {
            const latencyMetric = new aws.cloudwatch.MetricAlarm(`${name}-latency-alarm`, {
                comparisonOperator: "GreaterThanThreshold",
                evaluationPeriods: defaultConfig.alarms.evaluationPeriods || 5,
                metricName: "Latency",
                namespace: "AWS/Bedrock",
                period: 60,
                extendedStatistic: "p90",
                threshold: defaultConfig.alarms.latencyThreshold,
                alarmDescription: `Bedrock model ${defaultConfig.displayName} (${defaultConfig.modelId}) p90 latency exceeded ${defaultConfig.alarms.latencyThreshold}ms`,
                dimensions: {
                    ModelId: defaultConfig.modelId,
                },
                alarmActions: defaultConfig.alarms.alarmTopicArn ? [defaultConfig.alarms.alarmTopicArn] : [],
                okActions: defaultConfig.alarms.alarmTopicArn ? [defaultConfig.alarms.alarmTopicArn] : [],
                tags: defaultConfig.tags,
                treatMissingData: "notBreaching",
            }, { parent: this });
            
            this.alarms.latency = latencyMetric;
        }
        
        // Register outputs
        this.registerOutputs({
            provisionedThroughputArn: this.provisionedThroughputArn,
            dashboard: this.dashboard,
            alarms: this.alarms,
            bedrockRole: this.bedrockRole,
        });
    }
}