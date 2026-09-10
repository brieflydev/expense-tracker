# Infrastructure (AWS CDK)

TypeScript CDK app that provisions the expense tracker on AWS.

## Stacks

| Stack | Resources |
|---|---|
| `ExpenseTrackerGitHubOidc` | GitHub Actions OIDC provider + deploy IAM role |
| `ExpenseTrackerNetwork` | VPC (public + isolated), ALB/ECS/DB security groups |
| `ExpenseTrackerData` | RDS PostgreSQL 16 (`db.t4g.micro`), Secrets Manager creds |
| `ExpenseTrackerDns` | ACM cert + DNS validation for `app` / `api.briefly-learn.com` |
| `ExpenseTrackerCompute` | ECR, ECS Fargate, ALB (HTTPS), Route53 aliases |

Cost note: no NAT Gateway; Fargate tasks use public subnets with public IPs.

## Commands

From repo root:

```bash
npm run cdk -- synth
npm run cdk:deploy
# or with context:
npm run cdk -- deploy --all -c imageTag=$(git rev-parse --short HEAD) -c desiredCount=1
```

## Bootstrap

Already bootstrapped in `us-east-1` for account `565393069879`.

## First deploy notes

ECS `desiredCount` defaults to **0** so stacks succeed before images exist.
After GitHub Actions pushes images to ECR, redeploy with `-c desiredCount=1` (or update the services).
