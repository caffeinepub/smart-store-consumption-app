import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { ConsumptionItem } from "../backend.d.ts";
import { useBulkImport } from "../hooks/useQueries";

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const COLUMN_OPTIONS = [
  { value: "skip", label: "— Skip —" },
  { value: "itemCode", label: "Item Code" },
  { value: "name", label: "Item Name" },
  { value: "department", label: "Department" },
  { value: "unit", label: "Unit" },
  { value: "quantity", label: "Quantity" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "notes", label: "Notes" },
];

type ColMapping = { [colIdx: number]: string };

function parseTabSeparated(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => line.split("\t").map((cell) => cell.trim()));
}

function parseNumber(val: string): number {
  const n = Number.parseFloat(val.replace(/,/g, ""));
  return Number.isNaN(n) ? 0 : n;
}

// Auto-detect column mapping from header row
function autoDetectMapping(rows: string[][]): ColMapping {
  if (rows.length === 0) return {};
  const headerRow = rows[0];
  const mapping: ColMapping = {};
  headerRow.forEach((cell, idx) => {
    // Normalize: lowercase, remove spaces, dashes, underscores, dots
    const lower = cell.toLowerCase().replace(/[\s_\-./]/g, "");
    if (
      lower.includes("itemcode") ||
      lower === "code" ||
      lower === "itmcode" ||
      lower === "item#" ||
      lower === "itemno" ||
      lower === "itcode" ||
      lower === "partno" ||
      lower === "partcode" ||
      lower === "slno" ||
      lower === "srno" ||
      lower === "srno."
    ) {
      mapping[idx] = "itemCode";
    } else if (
      lower.includes("itemname") ||
      lower === "name" ||
      lower === "description" ||
      lower === "desc" ||
      lower.includes("descr") ||
      lower === "item" ||
      lower === "product" ||
      lower === "productname" ||
      lower === "material" ||
      lower === "itmdesc" ||
      lower === "itemdesc"
    ) {
      mapping[idx] = "name";
    } else if (
      lower.includes("dept") ||
      lower.includes("department") ||
      lower === "section" ||
      lower === "area" ||
      lower === "location" ||
      lower === "costcenter" ||
      lower === "store"
    ) {
      mapping[idx] = "department";
    } else if (
      lower === "unit" ||
      lower === "uom" ||
      lower === "umo" ||
      lower === "measure" ||
      lower === "unitofmeasure" ||
      lower === "unitofmeasurement" ||
      lower === "baseunit" ||
      lower === "stockunit"
    ) {
      mapping[idx] = "unit";
    } else if (
      lower.includes("qty") ||
      lower.includes("quantity") ||
      lower === "amount" ||
      lower === "stock"
    ) {
      mapping[idx] = "quantity";
    } else if (lower === "month" || lower === "mon") {
      mapping[idx] = "month";
    } else if (lower === "year" || lower === "yr") {
      mapping[idx] = "year";
    } else if (
      lower === "notes" ||
      lower === "note" ||
      lower === "remark" ||
      lower === "remarks" ||
      lower === "rmcode" ||
      lower === "rmno" ||
      lower === "altcode" ||
      lower === "alternativecode" ||
      lower === "suppliercod" ||
      lower === "suppliercode"
    ) {
      mapping[idx] = "notes";
    }
  });
  return mapping;
}

// Extract plain text from HTML (for Excel HTML paste)
function extractTextFromHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const rows = doc.querySelectorAll("tr");
  if (rows.length === 0) {
    // Fallback: strip tags
    return doc.body.innerText || doc.body.textContent || "";
  }
  const lines: string[] = [];
  for (const tr of Array.from(rows)) {
    const cells = tr.querySelectorAll("td, th");
    const parts: string[] = [];
    for (const td of Array.from(cells)) {
      parts.push((td.textContent || "").trim());
    }
    if (parts.some((p) => p)) lines.push(parts.join("\t"));
  }
  return lines.join("\n");
}

export default function ImportTab() {
  const bulkImport = useBulkImport();
  const [pasteText, setPasteText] = useState("");
  const [defaultMonth, setDefaultMonth] = useState(
    String(new Date().getMonth() + 1),
  );
  const [defaultYear, setDefaultYear] = useState(String(currentYear));
  const [colMapping, setColMapping] = useState<ColMapping>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePasteEvent = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const clipboardData = e.clipboardData;
      let text = "";
      // Try to get HTML first (Excel copies as HTML with table structure)
      const htmlData = clipboardData.getData("text/html");
      if (htmlData?.includes("<table")) {
        e.preventDefault();
        text = extractTextFromHtml(htmlData);
      } else {
        // Let browser handle plain text paste naturally, then read value
        const plainText = clipboardData.getData("text/plain");
        if (plainText?.trim()) {
          e.preventDefault();
          text = plainText;
        } else {
          // fallback: let browser paste, read via setTimeout
          setTimeout(() => {
            const el = textareaRef.current;
            if (el) {
              const val = el.value;
              setPasteText(val);
              setParseError(null);
              setImportSuccess(false);
              const rows = parseTabSeparated(val);
              if (rows.length > 0) {
                const detected = autoDetectMapping(rows);
                if (Object.keys(detected).length > 0) setColMapping(detected);
              }
            }
          }, 50);
          return;
        }
      }
      if (!text.trim()) return;
      setPasteText(text);
      setParseError(null);
      setImportSuccess(false);
      // Auto-detect column mapping
      const rows = parseTabSeparated(text);
      if (rows.length > 0) {
        const detected = autoDetectMapping(rows);
        if (Object.keys(detected).length > 0) {
          setColMapping(detected);
        }
      }
    },
    [],
  );

  const parsedRows = useCallback(() => {
    if (!pasteText.trim()) return [];
    return parseTabSeparated(pasteText);
  }, [pasteText])();

  const numCols =
    parsedRows.length > 0 ? Math.max(...parsedRows.map((r) => r.length)) : 0;

  // handleParse is available for future use
  const _handleParse = () => {
    if (!pasteText.trim()) {
      setParseError("Please paste some data first.");
      return;
    }
    setParseError(null);
    setImportSuccess(false);
  };

  const buildItems = (): ConsumptionItem[] | null => {
    const rows = parsedRows;
    if (rows.length === 0) return null;

    // Skip header row: if first row has any cell matching a known header keyword
    const firstRow = rows[0];
    const isHeader = firstRow.some((cell) => {
      const lower = cell.toLowerCase().replace(/[\s_\-./]/g, "");
      return (
        lower.includes("itemcode") ||
        lower.includes("itemname") ||
        lower === "name" ||
        lower === "description" ||
        lower.includes("descr") ||
        lower.includes("dept") ||
        lower.includes("department") ||
        lower === "unit" ||
        lower === "uom" ||
        lower === "umo" ||
        lower.includes("qty") ||
        lower.includes("quantity") ||
        lower === "code" ||
        lower === "itmdesc" ||
        lower === "itemdesc"
      );
    });
    const dataRows = isHeader ? rows.slice(1) : rows;

    const items: ConsumptionItem[] = [];
    for (const row of dataRows) {
      const get = (field: string) => {
        for (const [idx, mapped] of Object.entries(colMapping)) {
          if (mapped === field) return row[Number(idx)] || "";
        }
        return "";
      };

      const name = get("name");
      const department = get("department");
      if (!name && !department) continue;

      const monthRaw = get("month");
      const yearRaw = get("year");

      items.push({
        itemCode: get("itemCode") || "",
        name: name || "Unknown",
        department: department || "General",
        unit: get("unit") || "Pcs",
        quantity: parseNumber(get("quantity")),
        month: monthRaw ? parseNumber(monthRaw) : Number(defaultMonth),
        year: yearRaw ? parseNumber(yearRaw) : Number(defaultYear),
        notes: get("notes") || "",
      });
    }
    return items;
  };

  const handleImport = async () => {
    setParseError(null);
    setImportSuccess(false);

    const items = buildItems();
    if (!items || items.length === 0) {
      setParseError(
        "No valid rows found. Please map at least Name and Department columns.",
      );
      return;
    }

    await bulkImport.mutateAsync(items);
    setImportSuccess(true);
    setPasteText("");
    setColMapping({});
  };

  const previewRows = parsedRows.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-base">
              Excel Data Import
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Excel se data paste karne ke steps:</strong>
              <ol className="mt-2 space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Excel/Google Sheets mein apna data select karein</li>
                <li>Ctrl+C se copy karein</li>
                <li>Neeche diye gaye box mein Ctrl+V se paste karein</li>
                <li>Har column ko map karein (Name, Department, etc.)</li>
                <li>Default month/year set karein (agar data mein nahi hai)</li>
                <li>Import button dabayein</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Paste Area */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">
            Step 1: Data Paste Karein
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Excel Data (Tab-separated)</Label>
              {pasteText.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setPasteText("");
                    setColMapping({});
                    setParseError(null);
                    setImportSuccess(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive underline"
                  data-ocid="import.clear_button"
                >
                  Clear
                </button>
              )}
            </div>
            <Textarea
              ref={textareaRef}
              placeholder="Yahan Excel data paste karein... (Ctrl+V)"
              value={pasteText}
              onChange={(e) => {
                const newVal = e.target.value;
                setPasteText(newVal);
                setParseError(null);
                setImportSuccess(false);
                // Re-run auto-detect on manual edits too
                const rows = parseTabSeparated(newVal);
                if (rows.length > 0) {
                  const detected = autoDetectMapping(rows);
                  if (Object.keys(detected).length > 0) {
                    setColMapping(detected);
                  }
                }
              }}
              onPaste={handlePasteEvent}
              className="min-h-40 font-mono text-sm resize-y"
              data-ocid="import.textarea"
            />
            <p className="text-xs text-muted-foreground">
              {parsedRows.length > 0
                ? `✓ ${parsedRows.length} rows detected with ${numCols} columns`
                : "Excel mein rows select karein → Ctrl+C → is box mein Ctrl+V"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {parsedRows.length > 0 && numCols > 0 && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">
              Step 2: Column Mapping
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({numCols} columns found)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: numCols }, (_, colIdx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: column index is stable
                <div key={`col-${colIdx}`} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Column {colIdx + 1}
                    {parsedRows[0]?.[colIdx] && (
                      <span className="ml-1 text-foreground/60 truncate block max-w-28">
                        "{parsedRows[0][colIdx]}"
                      </span>
                    )}
                  </Label>
                  <Select
                    value={colMapping[colIdx] || "skip"}
                    onValueChange={(v) =>
                      setColMapping((prev) => ({ ...prev, [colIdx]: v }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default Month/Year */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">
            Step 3: Default Month & Year
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (used if not in data)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={defaultMonth} onValueChange={setDefaultMonth}>
                <SelectTrigger className="w-40" data-ocid="import.month_select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={defaultYear} onValueChange={setDefaultYear}>
                <SelectTrigger className="w-28" data-ocid="import.year_select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {previewRows.length > 0 && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base">
                Data Preview
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                First {previewRows.length} of {parsedRows.length} rows
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {Array.from({ length: numCols }, (_, ci) => {
                      const headKey = `col-head-${ci}`;
                      return (
                        <TableHead
                          key={headKey}
                          className="text-xs font-semibold"
                        >
                          Col {ci + 1}
                          {colMapping[ci] && colMapping[ci] !== "skip" && (
                            <span className="ml-1 text-primary">
                              (
                              {
                                COLUMN_OPTIONS.find(
                                  (o) => o.value === colMapping[ci],
                                )?.label
                              }
                              )
                            </span>
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, ri) => {
                    const rowKey = `preview-row-${ri}`;
                    return (
                      <TableRow key={rowKey} className="hover:bg-muted/30">
                        {Array.from({ length: numCols }, (_, ci) => {
                          const cellKey = `cell-r${ri}-c${ci}`;
                          return (
                            <TableCell
                              key={cellKey}
                              className="text-xs max-w-xs truncate"
                            >
                              {row[ci] || ""}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error / Success */}
      {parseError && (
        <Alert variant="destructive" data-ocid="import.error_state">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {importSuccess && (
        <Alert
          className="border-green-200 bg-green-50 text-green-800"
          data-ocid="import.success_state"
        >
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>Data successfully imported!</AlertDescription>
        </Alert>
      )}

      {/* Import Button */}
      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleImport}
          disabled={bulkImport.isPending || !pasteText.trim()}
          className="min-w-36"
          data-ocid="import.import_button"
        >
          {bulkImport.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Import{" "}
              {parsedRows.length > 0 ? `(${parsedRows.length} rows)` : "Data"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
