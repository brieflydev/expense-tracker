import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

type ComputeStackProps = cdk.StackProps & {
  vpc: ec2.IVpc;
  database: rds.DatabaseInstance;
  dbSecret: secretsmanager.ISecret;
  albSecurityGroup: ec2.ISecurityGroup;
  ecsSecurityGroup: ec2.ISecurityGroup;
  certificate: acm.ICertificate;
  hostedZone: route53.IHostedZone;
  appHostname: string;
  apiHostname: string;
  imageTag: string;
  desiredCount: number;
};

export class ComputeStack extends cdk.Stack {
  public readonly frontendRepo: ecr.Repository;
  public readonly backendRepo: ecr.Repository;
  public readonly cluster: ecs.Cluster;
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    this.frontendRepo = new ecr.Repository(this, 'FrontendRepo', {
      repositoryName: 'expense-tracker-frontend',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    this.backendRepo = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: 'expense-tracker-backend',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    const appSecrets = new secretsmanager.Secret(this, 'AppSecrets', {
      secretName: 'expense-tracker/app',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'jwtAccessSecret',
        excludePunctuation: true,
        passwordLength: 48,
      },
    });

    const refreshSecret = new secretsmanager.Secret(this, 'JwtRefreshSecret', {
      secretName: 'expense-tracker/jwt-refresh',
      generateSecretString: {
        passwordLength: 48,
        excludePunctuation: true,
      },
    });

    this.cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      clusterName: 'expense-tracker',
      containerInsightsV2: ecs.ContainerInsights.DISABLED,
    });

    const albSg = props.albSecurityGroup;
    const ecsSg = props.ecsSecurityGroup;

    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: albSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });

    this.loadBalancer.addRedirect({
      sourceProtocol: elbv2.ApplicationProtocol.HTTP,
      sourcePort: 80,
      targetProtocol: elbv2.ApplicationProtocol.HTTPS,
      targetPort: 443,
    });

    const listener = this.loadBalancer.addListener('HttpsListener', {
      port: 443,
      protocol: elbv2.ApplicationProtocol.HTTPS,
      certificates: [props.certificate],
      defaultAction: elbv2.ListenerAction.fixedResponse(404, {
        contentType: 'text/plain',
        messageBody: 'Not found',
      }),
    });

    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AmazonECSTaskExecutionRolePolicy',
        ),
      ],
    });
    props.dbSecret.grantRead(executionRole);
    appSecrets.grantRead(executionRole);
    refreshSecret.grantRead(executionRole);

    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    props.dbSecret.grantRead(taskRole);
    appSecrets.grantRead(taskRole);
    refreshSecret.grantRead(taskRole);

    const frontendTask = new ecs.FargateTaskDefinition(this, 'FrontendTask', {
      cpu: 256,
      memoryLimitMiB: 512,
      executionRole,
      taskRole,
    });

    frontendTask.addContainer('frontend', {
      image: ecs.ContainerImage.fromEcrRepository(
        this.frontendRepo,
        props.imageTag,
      ),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'frontend',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      portMappings: [{ containerPort: 80 }],
      healthCheck: {
        command: ['CMD-SHELL', 'wget -qO- http://127.0.0.1/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(10),
      },
    });

    const backendTask = new ecs.FargateTaskDefinition(this, 'BackendTask', {
      cpu: 256,
      memoryLimitMiB: 512,
      executionRole,
      taskRole,
    });

    backendTask.addContainer('backend', {
      image: ecs.ContainerImage.fromEcrRepository(
        this.backendRepo,
        props.imageTag,
      ),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'backend',
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      portMappings: [{ containerPort: 4000 }],
      environment: {
        NODE_ENV: 'production',
        PORT: '4000',
        CORS_ORIGIN: `https://${props.appHostname}`,
        COOKIE_DOMAIN: '.briefly-learn.com',
        JWT_ISSUER: 'expense-tracker-api',
        JWT_AUDIENCE: 'expense-tracker-app',
      },
      secrets: {
        JWT_ACCESS_SECRET: ecs.Secret.fromSecretsManager(
          appSecrets,
          'jwtAccessSecret',
        ),
        JWT_REFRESH_SECRET: ecs.Secret.fromSecretsManager(refreshSecret),
        DB_USER: ecs.Secret.fromSecretsManager(props.dbSecret, 'username'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, 'password'),
        DB_HOST: ecs.Secret.fromSecretsManager(props.dbSecret, 'host'),
        DB_PORT: ecs.Secret.fromSecretsManager(props.dbSecret, 'port'),
        DB_NAME: ecs.Secret.fromSecretsManager(props.dbSecret, 'dbname'),
      },
      healthCheck: {
        command: [
          'CMD-SHELL',
          "node -e \"fetch('http://127.0.0.1:4000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\"",
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(40),
      },
    });

    const frontendService = new ecs.FargateService(this, 'FrontendService', {
      cluster: this.cluster,
      taskDefinition: frontendTask,
      desiredCount: props.desiredCount,
      assignPublicIp: true,
      securityGroups: [ecsSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      circuitBreaker: { rollback: true },
      minHealthyPercent: 0,
      maxHealthyPercent: 200,
    });

    const backendService = new ecs.FargateService(this, 'BackendService', {
      cluster: this.cluster,
      taskDefinition: backendTask,
      desiredCount: props.desiredCount,
      assignPublicIp: true,
      securityGroups: [ecsSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      circuitBreaker: { rollback: true },
      minHealthyPercent: 0,
      maxHealthyPercent: 200,
    });

    listener.addTargets('FrontendTargets', {
      priority: 10,
      conditions: [elbv2.ListenerCondition.hostHeaders([props.appHostname])],
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [frontendService],
      healthCheck: {
        path: '/health',
        healthyHttpCodes: '200',
      },
    });

    listener.addTargets('BackendTargets', {
      priority: 20,
      conditions: [elbv2.ListenerCondition.hostHeaders([props.apiHostname])],
      port: 4000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [backendService],
      healthCheck: {
        path: '/health',
        healthyHttpCodes: '200',
      },
    });

    new route53.ARecord(this, 'AppAlias', {
      zone: props.hostedZone,
      recordName: props.appHostname,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(this.loadBalancer),
      ),
    });

    new route53.ARecord(this, 'ApiAlias', {
      zone: props.hostedZone,
      recordName: props.apiHostname,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.LoadBalancerTarget(this.loadBalancer),
      ),
    });

    new cdk.CfnOutput(this, 'AlbDnsName', {
      value: this.loadBalancer.loadBalancerDnsName,
    });
    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${props.appHostname}`,
    });
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://${props.apiHostname}`,
    });
    new cdk.CfnOutput(this, 'FrontendRepoUri', {
      value: this.frontendRepo.repositoryUri,
    });
    new cdk.CfnOutput(this, 'BackendRepoUri', {
      value: this.backendRepo.repositoryUri,
    });
    new cdk.CfnOutput(this, 'FrontendServiceName', {
      value: frontendService.serviceName,
    });
    new cdk.CfnOutput(this, 'BackendServiceName', {
      value: backendService.serviceName,
    });
    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
    });
  }
}
