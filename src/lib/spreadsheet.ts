import "server-only";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value !== "object") return String(value);
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return String(value.text);
  if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
  return "";
}

/** Rows of the first sheet (xlsx) or the CSV (comma or semicolon, as Indonesian Excel saves it), as text. */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();
  if (file.name.toLowerCase().endsWith(".csv")) {
    const firstLine = buffer.subarray(0, 2000).toString("utf8").split(/\r?\n/)[0] ?? "";
    const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
    await workbook.csv.read(Readable.from(buffer), { parserOptions: { delimiter } });
  } else {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  }
  const sheet = workbook.worksheets[0];
  const rows: string[][] = [];
  sheet?.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    // Keep Excel's row numbers so errors point at the right line.
    while (rows.length < rowNumber - 1) rows.push([]);
    rows.push(values.map((value) => cellText(value as ExcelJS.CellValue)));
  });
  return rows;
}
