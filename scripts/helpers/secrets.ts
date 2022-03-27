import { manifest } from "../manifest";
import { SecretName, SecretVersion } from "@wormgraph/manifest";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

interface SecretRequest {
  name: SecretName;
}

// Authenticated via gcloud CLI application-default credentials
const client = new SecretManagerServiceClient();

const buildSecretsPath = (
  projectName: string,
  secretName: SecretName,
  version: SecretVersion
) => `projects/${projectName}/secrets/${secretName}/versions/${version}`;

export const getSecret = async (
  request: SecretRequest
): Promise<string | undefined> => {
  const config = manifest.secretManager.secrets.find(
    (secret) => secret.name === request.name
  );

  if (!config) {
    console.error(`Credentials not configured for "${request.name}"`);
    return;
  }

  const [secretResponse] = await client.accessSecretVersion({
    name: buildSecretsPath(
      manifest.googleCloud.projectID,
      config.name,
      config.version
    ),
  });

  const secret = secretResponse?.payload?.data?.toString();

  return secret;
};
