import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const routeMethods = ["get", "post", "put", "patch", "delete"];

function extractImplementedMobilePaths(source: string): string[] {
  const methodPattern = routeMethods.join("|");
  const routePattern = new RegExp(`router\\.(${methodPattern})\\("([^"]+)"`, "g");
  const paths = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = routePattern.exec(source))) {
    paths.add(match[2].replace(/:([A-Za-z0-9_]+)/g, "{$1}"));
  }

  return [...paths].sort();
}

function extractOpenApiPaths(source: string): string[] {
  const paths = new Set<string>();
  const pathPattern = /^  (\/[^:]+):$/gm;
  let match: RegExpExecArray | null;

  while ((match = pathPattern.exec(source))) {
    paths.add(match[1]);
  }

  return [...paths].sort();
}

function extractOpenApiOperationBlock(source: string, path: string, method: string) {
  const pathMarker = `  ${path}:`;
  const pathStart = source.indexOf(pathMarker);
  if (pathStart < 0) return "";

  const nextPathStart = source.slice(pathStart + pathMarker.length).search(/\n  \//);
  const pathBlock = nextPathStart < 0
    ? source.slice(pathStart)
    : source.slice(pathStart, pathStart + pathMarker.length + nextPathStart);

  const methodMarker = `    ${method}:`;
  const methodStart = pathBlock.indexOf(methodMarker);
  if (methodStart < 0) return "";

  const nextMethodStart = pathBlock.slice(methodStart + methodMarker.length).search(/\n    [a-z]+:/);
  return nextMethodStart < 0
    ? pathBlock.slice(methodStart)
    : pathBlock.slice(methodStart, methodStart + methodMarker.length + nextMethodStart);
}

describe("mobile OpenAPI contract", () => {
  it("documents every implemented mobile route path", () => {
    const root = process.cwd();
    const routeSource = readFileSync(resolve(root, "server/routes/mobile.ts"), "utf8");
    const openApiSource = readFileSync(resolve(root, "docs/MOBILE_V1_OPENAPI.yaml"), "utf8");

    expect(extractOpenApiPaths(openApiSource)).toEqual(extractImplementedMobilePaths(routeSource));
  });

  it("requires idempotency keys for critical mobile mutations", () => {
    const openApiSource = readFileSync(resolve(process.cwd(), "docs/MOBILE_V1_OPENAPI.yaml"), "utf8");
    const criticalMutations = [
      { path: "/questionnaires/{id}/response", method: "post" },
      { path: "/substitutions", method: "post" },
      { path: "/substitutions/{id}/claim", method: "post" },
      { path: "/schedules/{id}/confirm", method: "post" },
      { path: "/formation/lessons/{lessonId}/complete", method: "post" },
      { path: "/admin/schedules/publish", method: "post" },
    ];

    for (const mutation of criticalMutations) {
      const operation = extractOpenApiOperationBlock(
        openApiSource,
        mutation.path,
        mutation.method,
      );

      expect(operation).toContain("#/components/parameters/IdempotencyKeyHeader");
      expect(operation).toContain('"409"');
    }
  });
});
