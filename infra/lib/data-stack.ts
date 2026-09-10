import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

type DataStackProps = cdk.StackProps & {
  vpc: ec2.IVpc;
  dbSecurityGroup: ec2.ISecurityGroup;
};

export class DataStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    this.database = new rds.DatabaseInstance(this, 'Postgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.dbSecurityGroup],
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),
      allocatedStorage: 20,
      maxAllocatedStorage: 40,
      databaseName: 'expense_tracker',
      credentials: rds.Credentials.fromGeneratedSecret('expense_admin', {
        secretName: 'expense-tracker/db',
      }),
      multiAz: false,
      publiclyAccessible: false,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      backupRetention: cdk.Duration.days(1),
      deleteAutomatedBackups: true,
      storageEncrypted: true,
    });

    this.dbSecret = this.database.secret!;

    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: this.database.instanceEndpoint.hostname,
    });
    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
    });
  }
}
