interface ExportFilenameOptions {
  source: string;
  descriptor: string;
  month?: string;
  date?: Date;
  extension: "csv" | "json";
}

export function buildExportFilename({
  source,
  descriptor,
  month,
  date = new Date(),
  extension
}: ExportFilenameOptions): string {
  const dateStamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
  const parts = ["campaign-pulse", source, month, descriptor, dateStamp]
    .filter(Boolean)
    .map((part) => slugifyFilenamePart(String(part)))
    .filter(Boolean);

  return `${parts.join("-")}.${extension}`;
}

export function slugifyFilenamePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
