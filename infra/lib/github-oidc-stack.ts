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
 */
export class GitHubOidcStack extends cdk.Stack {
  public readonly role: iam.IRole;
  public readonly provider: iam.OpenIdConnectProvider;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    const roleName = props.roleName ?? 'GitHubActionsExpenseTracker';
    const repoSub = `repo:${props.githubOwner}/${props.githubRepo}:*`;

    this.provider = new iam.OpenIdConnectProvider(this, 'GitHubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    this.role = new iam.Role(this, 'DeployRole', {
      roleName,
      description: `OIDC deploy role for ${props.githubOwner}/${props.githubRepo}`,
      assumedBy: new iam.OpenIdConnectPrincipal(this.provider, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': repoSub,
        },
      }),
      // Workshop convenience: full deploy surface for CDK + ECR + ECS.
      // Tighten later for production.
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
      ],
      maxSessionDuration: cdk.Duration.hours(1),
    });

    new cdk.CfnOutput(this, 'RoleArn', {
      value: this.role.roleArn,
      description: 'Use as role-to-assume in GitHub Actions',
    });
    new cdk.CfnOutput(this, 'OidcProviderArn', {
      value: this.provider.openIdConnectProviderArn,
    });
  }
}
