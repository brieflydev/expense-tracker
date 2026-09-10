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
 * GitHub now issues `sub` claims with numeric IDs, e.g.
 * `repo:org@123/repo@456:ref:refs/heads/main`.
 * IAM also requires a `sub` (or `job_workflow_ref`) condition that is not `*`.
 */
export class GitHubOidcStack extends cdk.Stack {
  public readonly role: iam.IRole;
  public readonly provider: iam.OpenIdConnectProvider;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    const roleName = props.roleName ?? 'GitHubActionsExpenseTracker';
    const repository = `${props.githubOwner}/${props.githubRepo}`;

    this.provider = new iam.OpenIdConnectProvider(this, 'GitHubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    // Match both legacy `repo:owner/name:*` and current `repo:owner@id/name@id:*`.
    const principal = new iam.OpenIdConnectPrincipal(this.provider, {
      StringEquals: {
        'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        'token.actions.githubusercontent.com:repository': repository,
      },
      StringLike: {
        'token.actions.githubusercontent.com:sub': [
          `repo:${props.githubOwner}/${props.githubRepo}:*`,
          `repo:${props.githubOwner}@*/${props.githubRepo}@*:*`,
        ],
      },
    });

    this.role = new iam.Role(this, 'DeployRole', {
      roleName,
      description: `OIDC deploy role for ${repository}`,
      // TagSession is required by aws-actions/configure-aws-credentials@v4
      assumedBy: principal.withSessionTags(),
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
