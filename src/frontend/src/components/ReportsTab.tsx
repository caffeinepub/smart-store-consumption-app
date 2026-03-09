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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Building2,
  Calendar,
  Download,
  FileText,
  History,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ConsumptionItem } from "../backend.d.ts";
import { useGetAllItems, useGetDepartments } from "../hooks/useQueries";

// ---- Saved Entry types (from ConsumptionEntryTab) ----
interface SavedEntryRow {
  itemCode: string;
  name: string;
  unit: string;
  qty: number;
  department: string;
}
interface SavedEntry {
  id: string;
  date: string;
  savedAt: string;
  department: string;
  rows: SavedEntryRow[];
}
const LS_KEY = "consumption_history_v1";
function loadHistory(): SavedEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

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

const _MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DepartmentReport() {
  const { data: items = [], isLoading: itemsLoading } = useGetAllItems();
  const { data: departments = [], isLoading: deptsLoading } =
    useGetDepartments();
  const [selectedDept, setSelectedDept] = useState("");

  const reportRows = useMemo(() => {
    if (!selectedDept) return [];
    const filtered = (items as ConsumptionItem[]).filter(
      (i) => i.department === selectedDept,
    );
    const itemMap = new Map<string, { unit: string; total: number }>();
    for (const i of filtered) {
      const curr = itemMap.get(i.name);
      if (curr) {
        curr.total += Number(i.quantity);
      } else {
        itemMap.set(i.name, { unit: i.unit, total: Number(i.quantity) });
      }
    }
    return Array.from(itemMap.entries())
      .map(([name, { unit, total }]) => ({ name, unit, total }))
      .sort((a, b) => b.total - a.total);
  }, [items, selectedDept]);

  const grandTotal = reportRows.reduce((s, r) => s + r.total, 0);

  const handleExport = () => {
    const header = ["Item Name", "Unit", "Total Quantity"];
    const rows = reportRows.map((r) => [r.name, r.unit, String(r.total)]);
    rows.push(["GRAND TOTAL", "", String(grandTotal)]);
    downloadCsv(`${selectedDept}-report.csv`, [header, ...rows]);
  };

  if (itemsLoading || deptsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="space-y-1.5 flex-1 max-w-xs">
          <Label>Select Department</Label>
          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger data-ocid="reports.department_select">
              <SelectValue placeholder="Choose a department..." />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {reportRows.length > 0 && (
          <Button
            variant="outline"
            onClick={handleExport}
            className="shrink-0"
            data-ocid="reports.export_button"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {selectedDept && (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">{selectedDept}</span>
            </div>
            <Badge variant="secondary">{reportRows.length} items</Badge>
          </div>
          {reportRows.length === 0 ? (
            <div
              data-ocid="reports.empty_state"
              className="py-12 text-center text-muted-foreground"
            >
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No items found for this department</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Item Name
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-24">
                      Unit
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground w-32 text-right">
                      Total Qty
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportRows.map((row) => (
                    <TableRow key={row.name} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm">
                        {row.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.unit}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-sm">
                        {row.total.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/70 font-bold">
                    <TableCell colSpan={2} className="font-semibold">
                      Grand Total
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">
                      {grandTotal.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
      )}

      {!selectedDept && (
        <div
          data-ocid="reports.empty_state"
          className="py-16 text-center text-muted-foreground border border-dashed rounded-lg"
        >
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Select a department to view its report</p>
        </div>
      )}
    </div>
  );
}

function MonthlyReport() {
  const { data: items = [], isLoading } = useGetAllItems();
  const [selectedMonth, setSelectedMonth] = useState(
    String(new Date().getMonth() + 1),
  );
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const reportData = useMemo(() => {
    const month = Number(selectedMonth);
    const year = Number(selectedYear);
    const filtered = (items as ConsumptionItem[]).filter(
      (i) => i.month === month && i.year === year,
    );

    // Group by department
    const deptMap = new Map<string, ConsumptionItem[]>();
    for (const i of filtered) {
      const arr = deptMap.get(i.department) || [];
      arr.push(i);
      deptMap.set(i.department, arr);
    }

    const groups = Array.from(deptMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dept, deptItems]) => ({
        department: dept,
        items: deptItems.sort((a, b) => a.name.localeCompare(b.name)),
        subtotal: deptItems.reduce((s, i) => s + Number(i.quantity), 0),
      }));

    const grandTotal = groups.reduce((s, g) => s + g.subtotal, 0);
    return { groups, grandTotal };
  }, [items, selectedMonth, selectedYear]);

  const handleExport = () => {
    const header = ["Department", "Item Name", "Unit", "Quantity", "Notes"];
    const rows: string[][] = [];
    for (const g of reportData.groups) {
      for (const item of g.items) {
        rows.push([
          item.department,
          item.name,
          item.unit,
          String(item.quantity),
          item.notes,
        ]);
      }
      rows.push([`${g.department} SUBTOTAL`, "", "", String(g.subtotal), ""]);
    }
    rows.push(["GRAND TOTAL", "", "", String(reportData.grandTotal), ""]);
    const monthLabel =
      MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;
    downloadCsv(`monthly-report-${monthLabel}-${selectedYear}.csv`, [
      header,
      ...rows,
    ]);
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="space-y-1.5">
          <Label>Month</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40" data-ocid="reports.month_select">
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
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28" data-ocid="reports.year_select">
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
        {reportData.groups.length > 0 && (
          <Button
            variant="outline"
            onClick={handleExport}
            className="shrink-0"
            data-ocid="reports.export_button"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {reportData.groups.length === 0 ? (
        <div
          data-ocid="reports.empty_state"
          className="py-16 text-center text-muted-foreground border border-dashed rounded-lg"
        >
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            No data for {MONTHS.find((m) => m.value === selectedMonth)?.label}{" "}
            {selectedYear}
          </p>
          <p className="text-sm mt-1">
            Import items or add them for this month
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-primary/10 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {MONTHS.find((m) => m.value === selectedMonth)?.label}{" "}
                {selectedYear}
              </span>
            </div>
            <div className="bg-muted rounded-lg px-4 py-2.5 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {reportData.groups.length} departments
              </span>
            </div>
            <div className="bg-muted rounded-lg px-4 py-2.5 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground font-mono font-semibold">
                Total: {reportData.grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Tables per department */}
          {reportData.groups.map((group) => (
            <div
              key={group.department}
              className="rounded-lg border border-border overflow-hidden bg-card"
            >
              <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">
                    {group.department}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    {group.items.length} items
                  </Badge>
                  <span className="font-mono text-sm font-bold text-primary">
                    {group.subtotal.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-muted-foreground">
                        Item Name
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground w-20">
                        Unit
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground w-28 text-right">
                        Quantity
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">
                        Notes
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item) => (
                      <TableRow key={item.name} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.unit}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-sm">
                          {Number(item.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                          {item.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={2} className="text-sm font-semibold">
                        Subtotal
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary text-sm">
                        {group.subtotal.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden md:table-cell" />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </div>
          ))}

          {/* Grand Total Row */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex justify-between items-center">
            <span className="font-display font-bold text-sm">Grand Total</span>
            <span className="font-mono font-bold text-primary text-lg">
              {reportData.grandTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- History-based Reports ----
function HistorySavedReport() {
  const [history] = useState<SavedEntry[]>(() => loadHistory());
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState(
    String(new Date().getFullYear()),
  );

  // Collect all unique departments from history
  const historyDepts = useMemo(() => {
    const set = new Set<string>();
    for (const entry of history) {
      for (const r of entry.rows) set.add(r.department);
    }
    return Array.from(set).sort();
  }, [history]);

  // Flatten all rows with date info, then filter
  const allRows = useMemo(() => {
    const rows: {
      date: string;
      year: string;
      month: string;
      itemCode: string;
      name: string;
      unit: string;
      qty: number;
      department: string;
    }[] = [];
    for (const entry of history) {
      const d = new Date(entry.date);
      const year = String(d.getFullYear());
      const month = String(d.getMonth() + 1);
      for (const r of entry.rows) {
        rows.push({ date: entry.date, year, month, ...r });
      }
    }
    return rows;
  }, [history]);

  const filteredRows = useMemo(() => {
    let result = allRows;
    if (filterDept !== "ALL")
      result = result.filter((r) => r.department === filterDept);
    if (filterMonth !== "all")
      result = result.filter((r) => r.month === filterMonth);
    if (filterYear !== "all")
      result = result.filter((r) => r.year === filterYear);
    return result;
  }, [allRows, filterDept, filterMonth, filterYear]);

  // Group by date for display
  const groupedByDate = useMemo(() => {
    const map = new Map<string, typeof filteredRows>();
    for (const r of filteredRows) {
      const arr = map.get(r.date) || [];
      arr.push(r);
      map.set(r.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredRows]);

  const grandTotal = filteredRows.reduce((s, r) => s + r.qty, 0);

  const handleExport = () => {
    const header = [
      "Date",
      "Item Code",
      "Item Name",
      "Unit",
      "Qty",
      "Department",
    ];
    const rows = filteredRows.map((r) => [
      r.date,
      r.itemCode,
      r.name,
      r.unit,
      String(r.qty),
      r.department,
    ]);
    rows.push(["GRAND TOTAL", "", "", "", String(grandTotal), ""]);
    const monthLabel =
      filterMonth !== "all"
        ? MONTHS.find((m) => m.value === filterMonth)?.label || filterMonth
        : "all";
    downloadCsv(
      `history-report-${filterDept}-${monthLabel}-${filterYear}.csv`,
      [header, ...rows],
    );
  };

  if (history.length === 0) {
    return (
      <div
        data-ocid="reports.empty_state"
        className="py-16 text-center text-muted-foreground border border-dashed rounded-lg"
      >
        <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Koi saved entry nahi hai</p>
        <p className="text-sm mt-1">Entry tab mein qty bharke Save karein</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger
              className="w-44"
              data-ocid="history_report.department_select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {historyDepts.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Month</Label>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger
              className="w-36"
              data-ocid="history_report.month_select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
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
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger
              className="w-28"
              data-ocid="history_report.year_select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filteredRows.length > 0 && (
          <Button
            variant="outline"
            onClick={handleExport}
            className="shrink-0"
            data-ocid="history_report.export_button"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Summary bar */}
      {filteredRows.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="bg-primary/10 rounded-lg px-4 py-2 flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {groupedByDate.length} dates
            </span>
          </div>
          <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {filteredRows.length} item entries
            </span>
          </div>
          <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-mono font-semibold">
              Total Qty: {grandTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {filteredRows.length === 0 ? (
        <div
          data-ocid="history_report.empty_state"
          className="py-12 text-center text-muted-foreground border border-dashed rounded-lg"
        >
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Is filter ke liye koi data nahi mila</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([date, rows]) => {
            const dateTotal = rows.reduce((s, r) => s + r.qty, 0);
            // Group by department within date
            const deptMap = new Map<string, typeof rows>();
            for (const r of rows) {
              const arr = deptMap.get(r.department) || [];
              arr.push(r);
              deptMap.set(r.department, arr);
            }
            const deptGroups = Array.from(deptMap.entries()).sort((a, b) =>
              a[0].localeCompare(b[0]),
            );

            return (
              <div
                key={date}
                className="rounded-lg border border-border overflow-hidden bg-card"
                data-ocid="history_report.row"
              >
                <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{date}</span>
                    <Badge variant="secondary" className="text-xs">
                      {rows.length} items
                    </Badge>
                  </div>
                  <span className="font-mono text-sm font-bold text-primary">
                    Total: {dateTotal.toLocaleString()}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/20">
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          #
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Item Code
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Item Name
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground w-20">
                          Unit
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground w-28 text-right">
                          Qty
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Department
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deptGroups.map(([dept, deptRows]) => (
                        <>
                          {deptRows.map((r, i) => (
                            <TableRow
                              key={`${r.itemCode}-${r.name}-${i}`}
                              className="hover:bg-muted/30"
                            >
                              <TableCell className="text-xs text-muted-foreground">
                                {i + 1}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {r.itemCode || "—"}
                              </TableCell>
                              <TableCell className="font-medium text-sm">
                                {r.name}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {r.unit || "—"}
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-sm text-primary">
                                {r.qty.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-normal"
                                >
                                  {r.department}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow
                            key={`subtotal-${dept}`}
                            className="bg-muted/30"
                          >
                            <TableCell
                              colSpan={4}
                              className="text-xs font-semibold text-muted-foreground pl-4"
                            >
                              {dept} Subtotal
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-sm">
                              {deptRows
                                .reduce((s, r) => s + r.qty, 0)
                                .toLocaleString()}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/70">
                        <TableCell
                          colSpan={4}
                          className="font-semibold text-sm"
                        >
                          {date} Grand Total
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-primary">
                          {dateTotal.toLocaleString()}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ReportsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-xl">Reports</h2>
      </div>

      <Tabs defaultValue="history">
        <TabsList className="bg-card border border-border h-10 p-1">
          <TabsTrigger
            value="history"
            className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-ocid="reports.history_tab"
          >
            <History className="h-4 w-4 mr-1.5" />
            Saved Entries Report
          </TabsTrigger>
          <TabsTrigger
            value="department"
            className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-ocid="reports.department_tab"
          >
            <Building2 className="h-4 w-4 mr-1.5" />
            Department Report
          </TabsTrigger>
          <TabsTrigger
            value="monthly"
            className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-ocid="reports.monthly_tab"
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            Monthly Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <HistorySavedReport />
        </TabsContent>
        <TabsContent value="department" className="mt-4">
          <DepartmentReport />
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
          <MonthlyReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
