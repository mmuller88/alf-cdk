process.env.AWS_REGION = "eu-central-1";
process.env.MOCK_AUTH = "true";

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node"
};
