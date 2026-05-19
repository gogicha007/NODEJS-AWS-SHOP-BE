export type ParsedProductRow = {
  title: string;
  description: string;
  price: number;
  count: number;
};

const requiredHeaders = ["title", "description", "price", "count"];

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

export function validateHeaders(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  return requiredHeaders.filter((header) => !normalized.includes(header));
}

function toRowString(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

export function validateAndMapRow(row: Record<string, unknown>): ParsedProductRow {
  const title = toRowString(row.title);
  const description = toRowString(row.description);
  const priceRaw = toRowString(row.price);
  const countRaw = toRowString(row.count);

  if (!title || !description) {
    throw new Error("Row has empty title or description");
  }

  const price = Number(priceRaw);
  if (!Number.isFinite(price)) {
    throw new Error(`Row has invalid price: ${priceRaw}`);
  }

  const count = Number(countRaw);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Row has invalid count: ${countRaw}`);
  }

  return { title, description, price, count };
}