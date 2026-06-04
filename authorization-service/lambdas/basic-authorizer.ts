type Event = {
  headers?: {
    authorization?: string;
    Authorization?: string;
  };
  methodArn?: string;
  routeArn?: string;
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
  context?: {
    principal: string;
    effect: PolicyEffect;
  };
};

export const handler = async (event: Event): Promise<AuthorizerResponse> => {
  const headers = event.headers || {};
  const authHeader = headers["Authorization"] || headers["authorization"];
  const resourceArn = event.methodArn || event.routeArn;

  const tmp = resourceArn?.split(":");

  // HTTP 401 in API Gateway
  if (!authHeader) throw new Error("Unauthorized");
  if (!tmp || !resourceArn) return generateDeny("me", "*");

  const apiGatewayArnTmp = tmp[5]?.split("/") || [];
  if (!apiGatewayArnTmp.length) {
    return generateDeny("me", resourceArn);
  }

  const [authType, encoded] = authHeader.split(" ");

  if (authType?.toLowerCase() !== "basic" || !encoded) {
    return generateDeny("me", resourceArn);
  }

  const decoded = Buffer.from(encoded, "base64").toString("utf8");

  const [username, password] = decoded.split(":");

  if (username && password && password === process.env[username]) {
    return generateAllow("me", resourceArn);
  }

  // HTTP 403 in API Gateway
  return generateDeny("me", resourceArn);
};

const generatePolicy = (
  principalId: string,
  effect: PolicyEffect,
  resource: string,
): AuthorizerResponse => {
  const safeResource = resource || "*";
  const response: AuthorizerResponse = {
    principalId: principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: safeResource,
        },
      ],
    },
    context: {
      principal: principalId,
      effect,
    },
  };

  console.log("authorizer response", JSON.stringify(response));
  return response;
};

const generateAllow = (principalId: string, resource: string) => {
  return generatePolicy(principalId, "Allow", resource);
};

const generateDeny = (principalId: string, resource: string) => {
  return generatePolicy(principalId, "Deny", resource);
};
