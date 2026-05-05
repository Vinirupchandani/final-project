import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { DatasetRow } from "@/lib/types";

const DEFAULT_DATASET_PATH = "/Users/vinirupchandani/Downloads/dubai_travel_beli_dataset.csv";

let cachedRows: DatasetRow[] | null = null;

function splitCsvLine(line: string): string[] {
  const output: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      output.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  output.push(current.trim());
  return output;
}

function normalizeRating(value: number): number {
  return Math.max(1, Math.min(5, value));
}

function resolveDatasetPath(): string {
  const envPath = process.env.BELI_DATASET_PATH;
  if (envPath && existsSync(envPath)) return envPath;
  if (existsSync(DEFAULT_DATASET_PATH)) return DEFAULT_DATASET_PATH;

  const localPath = join(process.cwd(), "dubai_travel_beli_dataset.csv");
  return localPath;
}

export function loadDatasetRows(): DatasetRow[] {
  if (cachedRows) return cachedRows;

  const csvPath = resolveDatasetPath();
  const raw = readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  if (lines.length <= 1) {
    cachedRows = [];
    return cachedRows;
  }

  const rows = lines.slice(1).map((line, index) => {
    const [friend_name, landmark, rating, tags, notes] = splitCsvLine(line);
    return {
      friend_name,
      landmark,
      rating: normalizeRating(Number(rating)),
      tags: (tags || "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
      notes: notes || "",
      recencyOrder: index + 1,
    } satisfies DatasetRow;
  });

  cachedRows = rows;
  return rows;
}

export function normalizeRating01(rating: number): number {
  return Math.max(0, Math.min(1, (rating - 1) / 4));
}
