export function serializeJson(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}

export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([serializeJson(payload)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
