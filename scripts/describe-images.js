const fs = require("node:fs/promises");
const path = require("node:path");
require("dotenv").config();
const OpenAI = require("openai");

const MODEL = process.env.OPENAI_IMAGE_DESCRIPTION_MODEL || "gpt-5-mini-2025-08-07";
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ASSETS_DIR = path.join(PROJECT_ROOT, "static", "assets");
const OUTPUT_FILE = path.join(PROJECT_ROOT, "image-descriptions.json");

const SUPPORTED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",
]);

function extensionToMimeType(extension) {
  switch (extension.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".bmp":
      return "image/bmp";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    default:
      return null;
  }
}

async function collectImagePaths(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectImagePaths(fullPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(extension)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getResponseText(response) {
  if (typeof response.output_text === "string" && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  const output = Array.isArray(response.output) ? response.output : [];
  const parts = [];

  for (const item of output) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (contentItem.type === "output_text" && typeof contentItem.text === "string") {
        parts.push(contentItem.text);
      }
    }
  }

  return parts.join("\n").trim();
}

async function describeImage(client, absoluteImagePath) {
  const extension = path.extname(absoluteImagePath);
  const mimeType = extensionToMimeType(extension);
  if (!mimeType) {
    throw new Error(`Unsupported image extension: ${extension}`);
  }

  const imageBuffer = await fs.readFile(absoluteImagePath);
  const base64Image = imageBuffer.toString("base64");
  const relativeImagePath = path.relative(PROJECT_ROOT, absoluteImagePath).replaceAll(path.sep, "/");

  const prompt = [
    "Provide a detailed visual description of this image.",
    "Include key subjects, composition/layout, text that appears, color/style, and likely purpose.",
    "If any text is present, transcribe it as accurately as possible.",
    "Return plain text only.",
  ].join(" ");

  const response = await client.responses.create({
    model: MODEL,
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: prompt,
          },
          {
            type: "input_image",
            image_url: `data:${mimeType};base64,${base64Image}`,
          },
        ],
      },
    ],
  });

  const description = getResponseText(response);
  if (!description) {
    throw new Error("No text description returned by model");
  }

  return {
    path: relativeImagePath,
    description,
  };
}

function buildPayload(imagePaths, results) {
  return {
    generatedAt: new Date().toISOString(),
    model: MODEL,
    sourceDirectory: "static/assets",
    totalImages: imagePaths.length,
    successfulDescriptions: results.filter((entry) => entry.status === "ok").length,
    failedDescriptions: results.filter((entry) => entry.status === "error").length,
    images: results,
  };
}

async function writeCheckpoint(imagePaths, results) {
  const payload = buildPayload(imagePaths, results);
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function run() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const assetsStat = await fs.stat(ASSETS_DIR).catch(() => null);
  if (!assetsStat || !assetsStat.isDirectory()) {
    throw new Error(`Assets directory not found: ${ASSETS_DIR}`);
  }

  const imagePaths = await collectImagePaths(ASSETS_DIR);
  imagePaths.sort((left, right) => left.localeCompare(right));

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const results = [];

  await writeCheckpoint(imagePaths, results);

  for (const imagePath of imagePaths) {
    const relativePath = path.relative(PROJECT_ROOT, imagePath).replaceAll(path.sep, "/");
    process.stdout.write(`Describing ${relativePath}... `);

    try {
      const described = await describeImage(client, imagePath);
      results.push({ ...described, status: "ok" });
      process.stdout.write("done\n");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        path: relativePath,
        status: "error",
        error: message,
      });
      process.stdout.write(`failed (${message})\n`);
    }

    await writeCheckpoint(imagePaths, results);
  }

  console.log(`\nWrote ${results.length} records to ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
