#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ComputeStack } from '../lib/compute-stack';
import { DataStack } from '../lib/data-stack';
import { DnsStack } from '../lib/dns-stack';
import { GitHubOidcStack } from '../lib/github-oidc-stack';
import { NetworkStack } from '../lib/network-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT ?? '565393069879',
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

const domainName = 'briefly-learn.com';
const appHostname = `app.${domainName}`;
const apiHostname = `api.${domainName}`;
const hostedZoneId = 'Z08333773CBXERA1YVDZO';
const imageTag = String(app.node.tryGetContext('imageTag') ?? 'latest');
const desiredCount = Number(app.node.tryGetContext('desiredCount') ?? 0);

new GitHubOidcStack(app, 'ExpenseTrackerGitHubOidc', {
  env,
  githubOwner: 'brieflydev',
  githubRepo: 'expense-tracker',
  roleName: 'GitHubActionsExpenseTracker',
});

const network = new NetworkStack(app, 'ExpenseTrackerNetwork', { env });

const data = new DataStack(app, 'ExpenseTrackerData', {
  env,
  vpc: network.vpc,
  dbSecurityGroup: network.dbSecurityGroup,
});

const dns = new DnsStack(app, 'ExpenseTrackerDns', {
  env,
  domainName,
  appHostname,
  apiHostname,
  hostedZoneId,
});

new ComputeStack(app, 'ExpenseTrackerCompute', {
  env,
  vpc: network.vpc,
  database: data.database,
  dbSecret: data.dbSecret,
  albSecurityGroup: network.albSecurityGroup,
  ecsSecurityGroup: network.ecsSecurityGroup,
  certificate: dns.certificate,
  hostedZone: dns.hostedZone,
  appHostname,
  apiHostname,
  imageTag,
  desiredCount,
});

app.synth();
