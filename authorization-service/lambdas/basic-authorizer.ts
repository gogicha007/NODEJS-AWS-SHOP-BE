type Event = {
  headers?: {
    authorization?: string;
    Authorization?: string;
  };
  methodArn?: string;
};

type PolicyEffect = "Allow" | "Deny";

type AuthorizerResponse = {
  principalId: string;
  policyDocument: {
    Version: "2012-10-17";
    Statement: Array<{
      Action: "execute-api:Invoke";
      Effect: PolicyEffect;
      Resource: string;
    }>;
  };
};

export const handler = async (event: Event): Promise<AuthorizerResponse> => {
  const headers = event.headers || {};
  const authHeader = headers["Authorization"] || headers["authorization"];

  const tmp = event.methodArn?.split(":");

  // HTTP 401 in API Gateway
  if (!authHeader) throw new Error("Unauthorized");
  if (!tmp || !event.methodArn) throw new Error("Unauthorized");

  const apiGatewayArnTmp = tmp[5].split("/");
  if (!apiGatewayArnTmp.length) {
    return generateDeny("me", event.methodArn);
  }

  const [authType, encoded] = authHeader.split(" ");

  if (authType?.toLowerCase() !== "basic" || !encoded) {
    return generateDeny("me", event.methodArn);
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const [username, password] = decoded.split(":");

  if (username && password && password === process.env[username]) {
    return generateAllow("me", event.methodArn);
  }

  // HTTP 403 in API Gateway
  return generateDeny("me", event.methodArn);
};

const generatePolicy = (
  principalId: string,
  effect: PolicyEffect,
  resource: string,
) : AuthorizerResponse => {
  return {
    principalId: principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
};

const generateAllow = (principalId: string, resource: string) => {
  return generatePolicy(principalId, "Allow", resource);
};

const generateDeny = (principalId: string, resource: string) => {
  return generatePolicy(principalId, "Deny", resource);
};
