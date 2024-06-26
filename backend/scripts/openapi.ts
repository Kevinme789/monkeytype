import { generateOpenApi } from "@ts-rest/open-api";
import { contract } from "../../shared/contract/index.contract";
import { writeFileSync, mkdirSync } from "fs";
import { Metadata } from "../../shared/contract/shared/types";

type SecurityRequirementObject = {
  [name: string]: string[];
};

export function getOpenApi() {
  const openApiDocument = generateOpenApi(
    contract,
    {
      openapi: "3.1.0",
      info: {
        title: "Monkeytype API",
        description:
          "Documentation for the public endpoints provided by the Monkeytype API server.\n\nNote that authentication is performed with the Authorization HTTP header in the format `Authorization: ApeKey YOUR_APE_KEY`\n\nThere is a rate limit of `30 requests per minute` across all endpoints with some endpoints being more strict. Rate limit rates are shared across all ape keys.",
        version: "2.0.0",
        termsOfService: "https://monkeytype.com/terms-of-service",
        contact: {
          name: "Support",
          email: "support@monkeytype.com",
        },
        "x-logo": {
          url: "https://monkeytype.com/images/mtfulllogo.png",
        },
        license: {
          name: "GPL-3.0",
          url: "https://www.gnu.org/licenses/gpl-3.0.html",
        },
      },
      servers: [
        {
          url: "https://api.monkeytype.com",
          description: "Production server",
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
          },
          ApeKey: {
            type: "http",
            scheme: "ApeKey",
          },
        },
      },
      tags: [
        {
          name: "configs",
          description:
            "User specific configurations like test settings, theme or tags.",
          "x-displayName": "User configuration",
        },
      ],
    },

    {
      jsonQuery: true,
      setOperationId: "concatenated-path",
      operationMapper: (operation, route) => ({
        ...operation,
        ...addAuth(route.metadata as Metadata),
        ...addTags(route.metadata as Metadata),
      }),
    }
  );
  return openApiDocument;
}

function addAuth(metadata: Metadata | undefined): Object {
  const auth = metadata?.["auth"] ?? {};
  const security: SecurityRequirementObject[] = [];
  if (!auth.isPublic === true) {
    security.push({ BearerAuth: [] });

    if (auth.acceptApeKeys === true) {
      security.push({ ApeKey: [] });
    }
  }

  const includeInPublic = auth.isPublic === true || auth.acceptApeKeys === true;
  return {
    "x-public": includeInPublic ? "yes" : "no",
    security,
  };
}

function addTags(metadata: Metadata | undefined): Object {
  if (metadata === undefined || metadata.tags === undefined) return {};
  return {
    tags: Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags],
  };
}

//detect if we run this as a main
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Provide filename.");
    process.exit(1);
  }
  const outFile = args[0] as string;

  //create directories if needed
  const lastSlash = outFile.lastIndexOf("/");
  if (lastSlash > 1) {
    const dir = outFile.substring(0, lastSlash);
    mkdirSync(dir, { recursive: true });
  }

  const openapi = getOpenApi();
  writeFileSync(args[0] as string, JSON.stringify(openapi, null, 2));
}
