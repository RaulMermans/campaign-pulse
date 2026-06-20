export interface CsvParseError {
  row: number;
  message: string;
}

export interface CsvParseResult {
  columns: string[];
  rows: Record<string, string>[];
  errors: CsvParseError[];
}

export function parseCsvText(text: string): CsvParseResult {
  const errors: CsvParseError[] = [];
  const rawRows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let rowNumber = 1;
  let inQuotes = false;
  let closedQuote = false;

  const pushRow = () => {
    row.push(field.trim());
    if (row.some((value) => value.length > 0)) rawRows.push(row);
    row = [];
    field = "";
    closedQuote = false;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (inQuotes) {
      if (character === "\"" && nextCharacter === "\"") {
        field += "\"";
        index += 1;
      } else if (character === "\"") {
        inQuotes = false;
        closedQuote = true;
      } else {
        field += character;
        if (character === "\n") rowNumber += 1;
      }
      continue;
    }

    if (character === "\"" && field.trim().length === 0 && !closedQuote) {
      field = "";
      inQuotes = true;
      continue;
    }

    if (closedQuote && character !== "," && character !== "\n" && character !== "\r" && !/\s/.test(character)) {
      errors.push({ row: rowNumber, message: "Unexpected character after a closing quote." });
      closedQuote = false;
    }

    if (character === ",") {
      row.push(field.trim());
      field = "";
      closedQuote = false;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      pushRow();
      rowNumber += 1;
    } else if (character === "\"") {
      errors.push({ row: rowNumber, message: "Unexpected quote in an unquoted value." });
      field += character;
    } else if (!closedQuote || !/\s/.test(character)) {
      field += character;
    }
  }

  if (inQuotes) {
    errors.push({ row: rowNumber, message: "Quoted value is not closed." });
  }
  if (field.length > 0 || row.length > 0) pushRow();

  const columns = (rawRows.shift() ?? []).map((header) => header.trim());
  if (columns.length === 0) {
    errors.push({ row: 1, message: "CSV header row is missing." });
    return { columns: [], rows: [], errors };
  }

  const seenHeaders = new Set<string>();
  columns.forEach((header) => {
    if (!header) {
      errors.push({ row: 1, message: "CSV headers cannot be blank." });
    } else if (seenHeaders.has(header)) {
      errors.push({ row: 1, message: `Duplicate CSV header "${header}".` });
    }
    seenHeaders.add(header);
  });

  const rows = rawRows.map((values, index) => {
    const dataRowNumber = index + 2;
    if (values.length !== columns.length) {
      errors.push({
        row: dataRowNumber,
        message: `Expected ${columns.length} values but found ${values.length}.`
      });
    }

    return columns.reduce<Record<string, string>>((record, column, columnIndex) => {
      if (column) record[column] = (values[columnIndex] ?? "").trim();
      return record;
    }, {});
  });

  return { columns, rows, errors };
}
