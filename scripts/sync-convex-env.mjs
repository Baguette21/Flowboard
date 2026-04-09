import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REQUIRED_KEYS = [
  "CONVEX_DEPLOYMENT",
  "R2_ACCOUNT_ID",
  "R2_BUCKET",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
];

function stripInlineComment(value) {
  let inSingleQuotes = false;
  let inDoubleQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === "'" && !inDoubleQuotes) {
      inSingleQuotes = !inSingleQuotes;
      continue;
    }

    if (character === "\"" && !inSingleQuotes) {
      inDoubleQuotes = !inDoubleQuotes;
      continue;
    }

    if (character === "#" && !inSingleQuotes && !inDoubleQuotes) {
      return value.slice(0, index).trimEnd();
    }
  }

  return value.trim();
}

function normalizeValue(rawValue) {
  const trimmed = stripInlineComment(rawValue.trim());

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseEnvFile(contents) {
  const parsed = {};

  for (const line of contents.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1);
    parsed[key] = normalizeValue(value);
  }

  return parsed;
}

async function main() {
  const candidateFiles = [
    ".env",
    ".env.local",
    path.join("convex", ".env"),
    path.join("convex", ".env.local"),
  ];
  const parsedEnv = {};
  const loadedFiles = [];

  for (const relativePath of candidateFiles) {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    if (!existsSync(absolutePath)) {
      continue;
    }

    const fileContents = await readFile(absolutePath, "utf8");
    Object.assign(parsedEnv, parseEnvFile(fileContents));
    loadedFiles.push(relativePath);
  }

  const resolvedEnv = {
    ...process.env,
    ...parsedEnv,
  };

  const missingKeys = REQUIRED_KEYS.filter((key) => !resolvedEnv[key]);
  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required values in env files or shell env: ${missingKeys.join(", ")}`,
    );
  }

  if (loadedFiles.length > 0) {
    console.log(`Loaded environment from: ${loadedFiles.join(", ")}`);
  } else {
    console.log("No local env files found, using current shell environment");
  }

  const childEnv = resolvedEnv;

  const npxCommand = "npx";
  const syncKeys = REQUIRED_KEYS.filter((key) => key !== "CONVEX_DEPLOYMENT");
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "flowboard-convex-env-"));
  const tempEnvFilePath = path.join(tempDirectory, ".env.sync");

  try {
    const tempEnvContents = syncKeys
      .map((key) => `${key}=${resolvedEnv[key]}`)
      .join("\n");

    await writeFile(tempEnvFilePath, `${tempEnvContents}\n`, "utf8");

    console.log(`Syncing ${syncKeys.join(", ")} to Convex...`);
    const result = spawnSync(
      npxCommand,
      ["convex", "env", "set", "--force", "--from-file", tempEnvFilePath],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: childEnv,
        shell: process.platform === "win32",
      },
    );

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      if (result.stdout) {
        console.error(result.stdout.trim());
      }
      if (result.stderr) {
        console.error(result.stderr.trim());
      }
      throw new Error("Failed to sync environment variables to Convex");
    }
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }

  console.log("Convex environment variables are in sync with local env files");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
