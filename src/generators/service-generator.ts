import { promises as fs } from "node:fs";
import * as path from "node:path";

export interface GenerateServiceOptions {
  serviceName: string;
  outDir?: string;
  generatedAt?: Date;
}

const SERVICE_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const TEMPLATE_ROOT = path.resolve(__dirname, "..", "..", "src", "templates", "service");
const CI_TEMPLATE_PATH = path.join(TEMPLATE_ROOT, "ci", "ci.yml");
const SKIP_DIRECTORIES = new Set([".git", ".idea", ".vscode", "coverage", "dist", "node_modules"]);
const BINARY_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".eot",
  ".gif",
  ".gz",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".tar",
  ".tgz",
  ".ttf",
  ".webp",
  ".woff",
  ".woff2",
  ".zip"
]);

export function validateServiceName(serviceName: string): void {
  if (!SERVICE_NAME_PATTERN.test(serviceName)) {
    throw new Error(
      "Invalid service name. Use kebab-case with lowercase letters, numbers, and hyphens (e.g. payments-api)."
    );
  }
}

export async function generateService(options: GenerateServiceOptions): Promise<string> {
  const generatedAt = options.generatedAt ?? new Date();
  const serviceName = options.serviceName;

  validateServiceName(serviceName);

  const targetDir = path.resolve(options.outDir ?? path.join(process.cwd(), serviceName));
  await ensureWritableEmptyDirectory(targetDir);

  const placeholders = [
    ["__SERVICE_NAME__", serviceName],
    ["__SERVICE_NAME_PASCAL__", toPascalCase(serviceName)],
    ["__GENERATED_DATE_ISO__", generatedAt.toISOString()]
  ] as const;

  await copyDirectoryWithReplacement(TEMPLATE_ROOT, targetDir, placeholders, 0);

  const ciContent = await fs.readFile(CI_TEMPLATE_PATH, "utf8");
  const ciOutputPath = path.join(targetDir, ".github", "workflows", "ci.yml");
  await fs.mkdir(path.dirname(ciOutputPath), { recursive: true });
  await fs.writeFile(ciOutputPath, applyPlaceholders(normalizeNewlines(ciContent), placeholders), "utf8");

  return targetDir;
}

async function ensureWritableEmptyDirectory(targetDir: string): Promise<void> {
  const existing = await fs.stat(targetDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  });

  if (!existing) {
    await fs.mkdir(targetDir, { recursive: true });
    return;
  }

  if (!existing.isDirectory()) {
    throw new Error(`Target path exists and is not a directory: ${targetDir}`);
  }

  const entries = await fs.readdir(targetDir);
  if (entries.length > 0) {
    throw new Error(`Target directory is not empty: ${targetDir}`);
  }
}

async function copyDirectoryWithReplacement(
  sourceDir: string,
  targetDir: string,
  placeholders: ReadonlyArray<readonly [string, string]>,
  depth: number
): Promise<void> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  entries.sort((a, b) => compareNames(a.name, b.name));

  for (const entry of entries) {
    if (depth === 0 && entry.name === "ci") {
      continue;
    }

    if (entry.isDirectory() && shouldSkipDirectory(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(targetPath, { recursive: true });
      await copyDirectoryWithReplacement(sourcePath, targetPath, placeholders, depth + 1);
      continue;
    }

    if (entry.isFile()) {
      await copyFileWithReplacement(sourcePath, targetPath, placeholders);
    }
  }
}

async function copyFileWithReplacement(
  sourcePath: string,
  targetPath: string,
  placeholders: ReadonlyArray<readonly [string, string]>
): Promise<void> {
  const rawBuffer = await fs.readFile(sourcePath);
  if (!isTextFile(sourcePath, rawBuffer)) {
    await fs.copyFile(sourcePath, targetPath);
    return;
  }

  const raw = rawBuffer.toString("utf8");
  const normalized = normalizeNewlines(raw);
  const content = applyPlaceholders(normalized, placeholders);
  await fs.writeFile(targetPath, content, "utf8");
}

function applyPlaceholders(
  content: string,
  placeholders: ReadonlyArray<readonly [string, string]>
): string {
  let result = content;
  for (const [token, value] of placeholders) {
    result = result.split(token).join(value);
  }
  return result;
}

function normalizeNewlines(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

function toPascalCase(value: string): string {
  return value
    .split("-")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join("");
}

function compareNames(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function shouldSkipDirectory(directoryName: string): boolean {
  return SKIP_DIRECTORIES.has(directoryName.toLowerCase());
}

function isTextFile(filePath: string, content: Buffer): boolean {
  const extension = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(extension)) {
    return false;
  }

  const sampleLength = Math.min(content.length, 8000);
  for (let index = 0; index < sampleLength; index += 1) {
    if (content[index] === 0) {
      return false;
    }
  }

  return true;
}
