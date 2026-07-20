import { readFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const passportArgument = process.argv[2];

if (!passportArgument) {
  fail("Usage: npm run passport:sync -- docs/passports/<passport>.md");
}

await loadLocalEnvironment();

const webhookUrl = process.env.GOOGLE_DOCS_PASSPORT_WEBHOOK_URL;
const secret = process.env.GOOGLE_DOCS_PASSPORT_SECRET;

if (!webhookUrl || !secret) {
  fail(
    "Missing GOOGLE_DOCS_PASSPORT_WEBHOOK_URL or GOOGLE_DOCS_PASSPORT_SECRET in .env.local.",
  );
}

const passportPath = resolve(projectRoot, passportArgument);
const passportsRoot = resolve(projectRoot, "docs/passports");
const relativePassportPath = relative(passportsRoot, passportPath);

if (
  relativePassportPath.startsWith("..") ||
  isAbsolute(relativePassportPath) ||
  !relativePassportPath.endsWith(".md")
) {
  fail("Only files inside docs/passports may be synchronized.");
}

const markdown = await readFile(passportPath, "utf8");
const firstHeading = markdown.match(/^#\s+(.+)$/m)?.[1];
const title = firstHeading
  ? `Atlant-Hybrid — ${firstHeading}`
  : `Atlant-Hybrid — ${basename(passportPath, ".md")}`;

const response = await fetch(webhookUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ secret, title, markdown }),
  redirect: "follow",
});

if (!response.ok) {
  fail(`Google Apps Script returned HTTP ${response.status}.`);
}

const result = await response.json();

if (!result.ok) {
  fail(`Google Docs synchronization failed: ${result.error ?? "Unknown error"}`);
}

console.log(`Passport synchronized: ${result.documentUrl}`);

async function loadLocalEnvironment() {
  try {
    const contents = await readFile(resolve(projectRoot, ".env.local"), "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed
        .slice(separator + 1)
        .trim()
        .replace(/^(['"])(.*)\1$/, "$2");

      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
