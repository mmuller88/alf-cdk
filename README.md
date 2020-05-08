# The Alfresco Provisioner

## Cognito

## Build

To build this app, you need to be in this example's root folder. Then run the following:

```bash
npm install -g aws-cdk
npm install
npm run build
```

This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the API's URL, which represents the url you can then use.

## Applying Swagger File
**NOTICE**: If any changes are made to the API Gateway you need to do the following steps!

First you need to deploy without the Swagger file. Than go to API Gateway and export Swagger + API Gateway Extension in YAML. Put that into templates/swagger_neu.yaml and than:

```
npm i -g merge-yaml-cli
merge-yaml -i templates/swagger_neu.yaml templates/swagger_validations.yaml -o templates/swagger_full.yaml
```

# TODO
* Lookup specific needed Permission instead of wildcards. Lambda ec2 permissions could be me finegraned
* Use React Typescript again 
* use Authorization code grant instead of implicit grant https://aws.amazon.com/blogs/mobile/understanding-amazon-cognito-user-pool-oauth-2-0-grants/
