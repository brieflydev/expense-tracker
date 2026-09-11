import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

type GitHubOidcStackProps = cdk.StackProps & {
  githubOwner: string;
  githubRepo: string;
  roleName?: string;
};

/**
 * GitHub Actions OIDC identity provider + deploy role.
 * Prefer this over long-lived AWS access keys in GitHub secrets.
 *
 * Trust is limited to pushes/runs on `main` for the configured repository.
 */
export class GitHubOidcStack extends cdk.Stack {
  public readonly role: iam.Role;
  public readonly provider: iam.OpenIdConnectProvider;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    const roleName = props.roleName ?? 'GitHubActionsExpenseTracker';
    const repository = `${props.githubOwner}/${props.githubRepo}`;

    this.provider = new iam.OpenIdConnectProvider(this, 'GitHubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    const principal = new iam.OpenIdConnectPrincipal(this.provider, {
      StringEquals: {
        'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        'token.actions.githubusercontent.com:repository': repository,
      },
      StringLike: {
        // Legacy and current GitHub sub formats, main branch only.
        'token.actions.githubusercontent.com:sub': [
          `repo:${props.githubOwner}/${props.githubRepo}:ref:refs/heads/main`,
          `repo:${props.githubOwner}@*/${props.githubRepo}@*:ref:refs/heads/main`,
        ],
      },
    });

    this.role = new iam.Role(this, 'DeployRole', {
      roleName,
      description: `OIDC deploy role for ${repository} (main only)`,
      assumedBy: principal.withSessionTags(),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Scoped permissions for ECR push, ECS update, and CDK deploy of this app.
    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'AmazonEC2ContainerRegistryPowerUser',
      ),
    );
    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'),
    );
    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationFullAccess'),
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CdkDeploySurface',
        actions: [
          'ec2:Describe*',
          'ec2:CreateSecurityGroup',
          'ec2:DeleteSecurityGroup',
          'ec2:AuthorizeSecurityGroupIngress',
          'ec2:AuthorizeSecurityGroupEgress',
          'ec2:RevokeSecurityGroupIngress',
          'ec2:RevokeSecurityGroupEgress',
          'ec2:CreateTags',
          'ec2:DeleteTags',
          'elasticloadbalancing:*',
          'route53:ChangeResourceRecordSets',
          'route53:GetChange',
          'route53:ListHostedZones',
          'route53:ListResourceRecordSets',
          'route53:GetHostedZone',
          'acm:DescribeCertificate',
          'acm:ListCertificates',
          'acm:GetCertificate',
          'acm:RequestCertificate',
          'acm:DeleteCertificate',
          'acm:AddTagsToCertificate',
          'acm:RemoveTagsFromCertificate',
          'rds:*',
          'secretsmanager:*',
          'logs:*',
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:PutParameter',
          'ssm:DeleteParameter',
          's3:*',
          'application-autoscaling:*',
          'ecr:GetAuthorizationToken',
        ],
        resources: ['*'],
      }),
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'PassEcsTaskRoles',
        actions: ['iam:PassRole'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'iam:PassedToService': [
              'ecs-tasks.amazonaws.com',
              'ecs.amazonaws.com',
            ],
          },
        },
      }),
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        sid: 'IamForCdkRoles',
        actions: [
          'iam:GetRole',
          'iam:GetRolePolicy',
          'iam:ListRolePolicies',
          'iam:ListAttachedRolePolicies',
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:UpdateRole',
          'iam:UpdateAssumeRolePolicy',
          'iam:PutRolePolicy',
          'iam:DeleteRolePolicy',
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
          'iam:TagRole',
          'iam:UntagRole',
          'iam:CreateServiceLinkedRole',
          'iam:GetOpenIDConnectProvider',
          'iam:CreateOpenIDConnectProvider',
          'iam:DeleteOpenIDConnectProvider',
          'iam:UpdateOpenIDConnectProviderThumbprint',
          'iam:TagOpenIDConnectProvider',
          'iam:UntagOpenIDConnectProvider',
          'iam:ListOpenIDConnectProviders',
        ],
        resources: [
          `arn:aws:iam::${this.account}:role/ExpenseTracker*`,
          `arn:aws:iam::${this.account}:role/GitHubActionsExpenseTracker`,
          `arn:aws:iam::${this.account}:role/cdk-*`,
          `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`,
        ],
      }),
    );

    new cdk.CfnOutput(this, 'RoleArn', {
      value: this.role.roleArn,
      description: 'Use as role-to-assume in GitHub Actions',
    });
    new cdk.CfnOutput(this, 'OidcProviderArn', {
      value: this.provider.openIdConnectProviderArn,
    });
  }
}
