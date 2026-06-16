import { validateProductionEnvironment } from "../server/config/environment";

const result = validateProductionEnvironment(process.env);

if (result.errors.length > 0) {
  console.error("Release environment check failed:\n");
  for (const error of result.errors) {
    console.error(`- ${error}`);
  }
}

if (result.warnings.length > 0) {
  const prefix = result.errors.length > 0 ? "\nWarnings:" : "Release environment warnings:";
  console.warn(prefix);
  for (const warning of result.warnings) {
    console.warn(`- ${warning}`);
  }
}

if (!result.ok) {
  process.exit(1);
}

console.log("Release environment check passed.");
