// The Agent Who Read My Search History (And Quit)
// Meme Sprint 3: AI Agent Goes Rogue — make.fun bounty entry.
//
// What this program does: it ships the meme image (entry.png, in this
// repository) and writes a copy of it to the harness output location as
// /output/entry.png, so the sealed gate scorer can judge it. The image is
// a 1024x1024 PNG, under the 1 MiB cap. No network, no secrets, no model
// calls — the program only copies a file that is already in the repo and
// verifies it is a whole, well-formed PNG of the right size first.

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_NAME = "entry.png";
const OUTPUT_NAME = "entry.png";
const EXPECTED_WIDTH = 1024;
const EXPECTED_HEIGHT = 1024;
const MAX_BYTES = 1048576;

// The PNG signature (8 bytes) and the IHDR chunk that follows it.
// Reading the dimensions from IHDR keeps the check dependency-free:
// the gate only needs a whole PNG of the right size, and this program
// refuses anything else instead of copying a broken file through.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function readPngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail(`${SOURCE_NAME} is not a whole PNG file (bad signature)`);
  }
  // IHDR chunk: length (4 bytes) + "IHDR" (4 bytes) + width (4) + height (4).
  if (bytes.toString("ascii", 12, 16) !== "IHDR") {
    fail(`${SOURCE_NAME} is not a whole PNG file (missing IHDR chunk)`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  return { width, height };
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const sourcePath = resolve(here, SOURCE_NAME);
  if (!existsSync(sourcePath)) {
    fail(`source image not found: ${sourcePath}`);
  }

  const bytes = readFileSync(sourcePath);
  const { width, height } = readPngDimensions(bytes);
  if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
    fail(
      `${SOURCE_NAME} is ${width}x${height}, expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}`,
    );
  }
  if (bytes.length > MAX_BYTES) {
    fail(`${SOURCE_NAME} is ${bytes.length} bytes, over the 1048576 byte cap`);
  }

  const outputDir = process.env.OUTPUT_DIR ?? "/output";
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, OUTPUT_NAME);
  copyFileSync(sourcePath, outputPath);

  const written = statSync(outputPath);
  console.log(
    `wrote ${outputPath} (${written.size} bytes, ${width}x${height} PNG)`,
  );
}

main();
