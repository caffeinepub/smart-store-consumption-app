import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useGetAllEntries,
  useGetAllItems,
  useGetDepartments,
} from "../hooks/useQueries";

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

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
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

// ---- Department Report (using saved entries, date-wise breakdown) ----
function DepartmentReport() {
  const { data: entries = [], isLoading } = useGetAllEntries();
  const [selectedDept, setSelectedDept] = useState("");

  // Extract unique departments from saved entries
  const departments = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      for (const row of entry.rows) {
        if (row.department) set.add(row.department);
      }
    }
    return Array.from(set).sort();
  }, [entries]);

  // All rows for selected department, with entry date
  const deptRows = useMemo(() => {
    if (!selectedDept) return [];
    const rows: {
      date: string;
      itemCode: string;
      name: string;
      qty: number;
      unit: string;
    }[] = [];
    for (const entry of entries) {
      for (const r of entry.rows) {
        if (r.department === selectedDept) {
          rows.push({
            date: entry.date,
            itemCode: r.itemCode,
            name: r.name,
            qty: r.qty,
            unit: r.unit,
          });
        }
      }
    }
    return rows;
  }, [entries, selectedDept]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const map = new Map<string, typeof deptRows>();
    for (const r of deptRows) {
      const arr = map.get(r.date) || [];
      arr.push(r);
      map.set(r.date, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [deptRows]);

  const grandTotal = deptRows.reduce((s, r) => s + r.qty, 0);

  const handleExport = () => {
    const header = ["Date", "Item Code", "Item Name", "Qty", "Unit"];
    const rows: string[][] = [];
    for (const [date, dateRows] of groupedByDate) {
      for (const r of dateRows) {
        rows.push([date, r.itemCode, r.name, String(r.qty), r.unit]);
      }
      rows.push([
        `${date} Subtotal`,
        "",
        "",
        String(dateRows.reduce((s, r) => s + r.qty, 0)),
        "",
      ]);
    }
    rows.push(["GRAND TOTAL", "", "", String(grandTotal), ""]);
    downloadCsv(`${selectedDept}-dept-report.csv`, [header, ...rows]);
  };

  if (isLoading) {
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
        {deptRows.length > 0 && (
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

      {!selectedDept && (
        <div
          data-ocid="reports.empty_state"
          className="py-16 text-center text-muted-foreground border border-dashed rounded-lg"
        >
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Select a department to view its report</p>
          <p className="text-sm mt-1 text-muted-foreground/70">
            Report shows date-wise item consumption from saved entries
          </p>
        </div>
      )}

      {selectedDept && deptRows.length === 0 && (
        <div
          data-ocid="reports.empty_state"
          className="py-12 text-center text-muted-foreground"
        >
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>
            No saved entries found for <strong>{selectedDept}</strong>
          </p>
          <p className="text-sm mt-1">Entry tab mein save karo pehle</p>
        </div>
      )}

      {selectedDept && groupedByDate.length > 0 && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-primary/10 rounded-lg px-4 py-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{selectedDept}</span>
            </div>
            <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {groupedByDate.length} dates
              </span>
            </div>
            <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono font-semibold text-muted-foreground">
                Total: {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {groupedByDate.map(([date, dateRows]) => {
            const dateTotal = dateRows.reduce((s, r) => s + r.qty, 0);
            return (
              <div
                key={date}
                className="rounded-lg border border-border overflow-hidden bg-card"
              >
                <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{date}</span>
                    <Badge variant="secondary" className="text-xs">
                      {dateRows.length} items
                    </Badge>
                  </div>
                  <span className="font-mono text-sm font-bold text-primary">
                    {dateTotal.toLocaleString()}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/20">
                        <TableHead className="text-xs font-semibold text-muted-foreground w-10">
                          #
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Item Code
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Item Name
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground w-28 text-right">
                          Qty
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground w-20">
                          Unit
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateRows.map((r, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable within date group
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="text-xs text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {r.itemCode || "—"}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {r.name}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-sm text-primary">
                            {r.qty.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.unit || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/70">
                        <TableCell
                          colSpan={3}
                          className="font-semibold text-sm"
                        >
                          {date} Total
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

          {/* Grand Total */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex justify-between items-center">
            <span className="font-display font-bold text-sm">
              Grand Total — {selectedDept}
            </span>
            <span className="font-mono font-bold text-primary text-lg">
              {grandTotal.toLocaleString()}
            </span>
          </div>
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

// ---- Saved Entries Report (from backend) ----
function HistorySavedReport() {
  const { data: entries = [], isLoading } = useGetAllEntries();
  const [filterDept, setFilterDept] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState(
    String(new Date().getFullYear()),
  );

  // Collect all unique departments from entries
  const historyDepts = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      for (const r of entry.rows) set.add(r.department);
    }
    return Array.from(set).sort();
  }, [entries]);

  // Flatten all rows with date info
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
      reasonCode: string;
    }[] = [];
    for (const entry of entries) {
      const d = new Date(entry.date);
      const year = String(d.getFullYear());
      const month = String(d.getMonth() + 1);
      for (const r of entry.rows) {
        rows.push({
          date: entry.date,
          year,
          month,
          itemCode: r.itemCode,
          name: r.name,
          unit: r.unit,
          qty: r.qty,
          department: r.department,
          reasonCode: (r as any).reasonCode || "",
        });
      }
    }
    return rows;
  }, [entries]);

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
      "Reason Code",
      "Department",
    ];
    const rows = filteredRows.map((r) => [
      r.date,
      r.itemCode,
      r.name,
      r.unit,
      String(r.qty),
      r.reasonCode || "",
      r.department,
    ]);
    rows.push(["GRAND TOTAL", "", "", "", String(grandTotal), "", ""]);
    const monthLabel =
      filterMonth !== "all"
        ? MONTHS.find((m) => m.value === filterMonth)?.label || filterMonth
        : "all";
    downloadCsv(
      `history-report-${filterDept}-${monthLabel}-${filterYear}.csv`,
      [header, ...rows],
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3" data-ocid="reports.loading_state">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (entries.length === 0) {
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
                          Reason Code
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Department
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deptGroups.map(([_dept, deptRows]) =>
                        deptRows.map((r, i) => (
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
                            <TableCell className="text-sm">
                              {r.reasonCode ? (
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-semibold ${
                                    r.reasonCode === "WASTAGE"
                                      ? "border-orange-400/50 text-orange-600 bg-orange-50 dark:bg-orange-950/20"
                                      : "border-blue-400/50 text-blue-600 bg-blue-50 dark:bg-blue-950/20"
                                  }`}
                                >
                                  {r.reasonCode}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground/40">
                                  —
                                </span>
                              )}
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
                        )),
                      )}
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
