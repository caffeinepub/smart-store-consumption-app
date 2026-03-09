import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Download,
  History,
  Loader2,
  RotateCcw,
  Save,
  Search,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ConsumptionItem, SavedEntry, SavedRow } from "../backend.d.ts";
import { useAuth } from "../context/AuthContext";
import {
  useDeleteEntry,
  useGetAllEntries,
  useGetAllItems,
  useGetDepartments,
  useSaveEntry,
} from "../hooks/useQueries";

// Re-export SavedEntry so WorkerEntriesTab can import from here for backward compat
export type { SavedEntry };

type ReasonCode = "CONS" | "WASTAGE" | "";

// Local row type that always has reasonCode (backend.d.ts SavedRow)
type RowWithReason = {
  itemCode: string;
  name: string;
  unit: string;
  qty: number;
  department: string;
  reasonCode: string;
};

// ---- Main Component ----
export default function ConsumptionEntryTab() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { data: items = [], isLoading } = useGetAllItems();
  const { data: departments = [] } = useGetDepartments();
  const { data: entries = [], isLoading: entriesLoading } = useGetAllEntries();
  const saveEntry = useSaveEntry();
  const deleteEntry = useDeleteEntry();

  // Local qty state: keyed by `${itemCode}-${department}-${name}` for uniqueness
  const [qtys, setQtys] = useState<Record<string, string>>({});
  // Reason code per row
  const [reasonCodes, setReasonCodes] = useState<Record<string, ReasonCode>>(
    {},
  );
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [reasonFilter, setReasonFilter] = useState<"ALL" | "CONS" | "WASTAGE">(
    "ALL",
  );
  const [activeView, setActiveView] = useState<"entry" | "history">("entry");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const makeKey = useCallback(
    (item: ConsumptionItem) =>
      `${item.itemCode || ""}-${item.department}-${item.name}`,
    [],
  );

  // Filtered items: first by dept, then by reason, then by search
  const filteredItems = useMemo(() => {
    let result = items as ConsumptionItem[];

    if (deptFilter !== "ALL") {
      result = result.filter((item) => item.department === deptFilter);
    }

    if (reasonFilter !== "ALL") {
      result = result.filter((item) => {
        const key = makeKey(item);
        return reasonCodes[key] === reasonFilter;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.itemCode?.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.department.toLowerCase().includes(q) ||
          (item.notes || "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [items, deptFilter, reasonFilter, reasonCodes, search, makeKey]);

  const filledCount = useMemo(
    () =>
      Object.values(qtys).filter((v) => {
        const n = Number(v);
        return !Number.isNaN(n) && n > 0;
      }).length,
    [qtys],
  );

  // Count filled rows in currently visible filtered items
  const visibleFilledCount = useMemo(
    () =>
      filteredItems.filter((item) => {
        const key = makeKey(item);
        const n = Number(qtys[key] ?? "0");
        return !Number.isNaN(n) && n > 0;
      }).length,
    [filteredItems, qtys, makeKey],
  );

  const handleQtyChange = (key: string, value: string) => {
    setQtys((prev) => ({ ...prev, [key]: value }));
  };

  const handleReasonChange = (key: string, value: ReasonCode) => {
    setReasonCodes((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearAll = () => {
    setQtys({});
    setReasonCodes({});
  };

  // Export to CSV (all filled rows across ALL departments)
  const handleExport = () => {
    const rows = (items as ConsumptionItem[]).filter((item) => {
      const key = makeKey(item);
      const n = Number(qtys[key] ?? "0");
      return !Number.isNaN(n) && n > 0;
    });

    if (rows.length === 0) {
      toast.error("Koi bhi qty nahi bhari hai export karne ke liye");
      return;
    }

    const headers = [
      "Date",
      "Item Code",
      "Item Name",
      "Qty",
      "Unit",
      "Reason Code",
      "Department",
    ];
    const today = new Date().toISOString().slice(0, 10);
    const csvRows = [
      headers.join(","),
      ...rows.map((item) => {
        const key = makeKey(item);
        const qty = qtys[key] ?? "0";
        const reasonCode = reasonCodes[key] || "";
        const displayCode = item.notes || item.itemCode || "";
        return [
          today,
          `"${displayCode.replace(/"/g, '""')}"`,
          `"${item.name.replace(/"/g, '""')}"`,
          qty,
          `"${item.unit.replace(/"/g, '""')}"`,
          `"${reasonCode}"`,
          `"${item.department.replace(/"/g, '""')}"`,
        ].join(",");
      }),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `consumption-entry-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} items exported`);
  };

  // Save entry to backend
  // FIX: Wrap in try/catch so mutateAsync errors don't become unhandled rejections.
  // Reason Code is OPTIONAL -- only Qty > 0 is needed to save a row.
  const handleSave = async () => {
    try {
      const allItems = items as ConsumptionItem[];

      // If items haven't loaded yet, tell the user to wait
      if (allItems.length === 0) {
        toast.error("Items abhi load ho rahe hain, please thoda wait karein");
        return;
      }

      // Build rows from ALL items (across all departments) where qty > 0
      // Reason Code (CONS/WASTAGE) is optional -- empty string is perfectly fine
      const rows = allItems
        .filter((item) => {
          const key = makeKey(item);
          const n = Number(qtys[key] ?? "0");
          return !Number.isNaN(n) && n > 0;
        })
        .map((item) => {
          const key = makeKey(item);
          return {
            itemCode: item.notes || item.itemCode || "",
            name: item.name,
            unit: item.unit,
            qty: Number(qtys[key] ?? "0"),
            department: item.department,
            reasonCode: reasonCodes[key] || "", // empty string is OK, not required
          };
        });

      if (rows.length === 0) {
        toast.error("Koi bhi qty nahi bhari -- pehle kuch qty bharein");
        return;
      }

      const now = new Date();
      const entry: SavedEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        date: now.toISOString().slice(0, 10),
        savedAt: now.toISOString(),
        department: deptFilter,
        savedBy: role ?? "worker",
        rows,
      };

      // mutateAsync throws on error -- the mutation's onError already shows a toast,
      // so we just catch here to prevent unhandled promise rejection
      await saveEntry.mutateAsync(entry);
      // onSuccess in useSaveEntry shows "Saved!" toast, so no extra toast needed here
    } catch (err) {
      // The useSaveEntry onError already shows toast.error("Save karne mein error aaya")
      // Just log for debugging; avoid double-toasting
      console.error("[ConsumptionEntryTab] handleSave error:", err);
    }
  };

  // Export a saved history entry
  const handleExportHistory = (entry: SavedEntry) => {
    const headers = [
      "Date",
      "Item Code",
      "Item Name",
      "Qty",
      "Unit",
      "Reason Code",
      "Department",
    ];
    const csvRows = [
      headers.join(","),
      ...(entry.rows as unknown as RowWithReason[]).map((r) =>
        [
          entry.date,
          `"${r.itemCode.replace(/"/g, '""')}"`,
          `"${r.name.replace(/"/g, '""')}"`,
          r.qty,
          `"${r.unit.replace(/"/g, '""')}"`,
          `"${r.reasonCode || ""}"`,
          `"${r.department.replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ];
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `consumption-${entry.date}-${entry.department === "ALL" ? "all" : entry.department}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteEntry.mutateAsync(id);
    } catch (err) {
      console.error("[ConsumptionEntryTab] handleDeleteHistory error:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-ocid="entry.loading_state">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // ---- HISTORY VIEW ----
  if (activeView === "history") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 rounded-lg p-1.5">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base leading-tight">
                Saved History
              </h2>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                Date-wise saved consumption records
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView("entry")}
            data-ocid="history.back_button"
          >
            ← Entry pe Wapas
          </Button>
        </div>

        {entriesLoading ? (
          <div className="space-y-3" data-ocid="history.loading_state">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <div
            data-ocid="history.empty_state"
            className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-border rounded-lg bg-card"
          >
            <History className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">Koi saved record nahi hai</p>
            <p className="text-sm mt-1">
              Entry tab mein qty bharke Save karein
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...entries]
              .sort(
                (a, b) =>
                  new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
              )
              .map((entry) => (
                <div
                  key={entry.id}
                  className="border border-border rounded-lg bg-card overflow-hidden"
                  data-ocid="history.row"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-sm">{entry.date}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.department === "ALL"
                            ? "All Departments"
                            : entry.department}{" "}
                          · {entry.rows.length} items ·{" "}
                          {new Date(entry.savedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Total Qty:{" "}
                        {entry.rows
                          .reduce((s, r) => s + r.qty, 0)
                          .toLocaleString()}
                      </Badge>
                      {entry.savedBy === "worker" ? (
                        <Badge className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 border">
                          Worker
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 border">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedId(
                            expandedId === entry.id ? null : entry.id,
                          )
                        }
                        data-ocid="history.toggle_button"
                      >
                        {expandedId === entry.id ? "Hide" : "Details"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportHistory(entry)}
                        data-ocid="history.export_button"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Excel
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteHistory(entry.id)}
                          disabled={deleteEntry.isPending}
                          data-ocid="history.delete_button"
                        >
                          {deleteEntry.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {expandedId === entry.id && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableHead className="text-xs">#</TableHead>
                            <TableHead className="text-xs">Item Code</TableHead>
                            <TableHead className="text-xs">Item Name</TableHead>
                            <TableHead className="text-xs">Qty</TableHead>
                            <TableHead className="text-xs">Unit</TableHead>
                            <TableHead className="text-xs">
                              Reason Code
                            </TableHead>
                            <TableHead className="text-xs">
                              Department
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(entry.rows as unknown as RowWithReason[]).map(
                            (r, i) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: stable within saved entry
                              <TableRow key={i}>
                                <TableCell className="text-xs text-muted-foreground">
                                  {i + 1}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {r.itemCode || "—"}
                                </TableCell>
                                <TableCell className="text-sm font-medium">
                                  {r.name}
                                </TableCell>
                                <TableCell className="font-semibold text-sm text-primary">
                                  {r.qty.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {r.unit || "—"}
                                </TableCell>
                                <TableCell>
                                  {r.reasonCode ? (
                                    <Badge
                                      className={`text-xs font-semibold ${
                                        r.reasonCode === "CONS"
                                          ? "bg-blue-500/10 text-blue-600 border-blue-500/30 border"
                                          : "bg-orange-500/10 text-orange-600 border-orange-500/30 border"
                                      }`}
                                    >
                                      {r.reasonCode}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground/40 text-xs">
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
                            ),
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }

  // ---- ENTRY VIEW ----
  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 rounded-lg p-1.5">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base leading-tight">
              Consumption Entry
            </h2>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Qty bharein (Reason Code optional hai), Save/Export karein
            </p>
          </div>
          {filledCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold ml-1"
            >
              {filledCount} filled
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView("history")}
            className="text-muted-foreground"
            data-ocid="entry.history_button"
          >
            <History className="h-3.5 w-3.5 mr-1.5" />
            History ({entries.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={filledCount === 0}
            className="text-muted-foreground"
            data-ocid="entry.clear_button"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Clear All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={filledCount === 0 || saveEntry.isPending}
            className="border-green-500/50 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
            data-ocid="entry.save_button"
          >
            {saveEntry.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            {saveEntry.isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={filledCount === 0}
            className="bg-primary text-primary-foreground"
            data-ocid="entry.export_button"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Filters row: Reason Code + Department + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        {/* Reason Code Filter */}
        <Select
          value={reasonFilter}
          onValueChange={(val) =>
            setReasonFilter(val as "ALL" | "CONS" | "WASTAGE")
          }
        >
          <SelectTrigger
            className="w-full sm:w-40"
            data-ocid="entry.reason_filter_select"
          >
            <SelectValue placeholder="All Reasons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Reasons</SelectItem>
            <SelectItem value="CONS">CONS</SelectItem>
            <SelectItem value="WASTAGE">WASTAGE</SelectItem>
          </SelectContent>
        </Select>

        {/* Department Filter */}
        <Select
          value={deptFilter}
          onValueChange={(val) => {
            setDeptFilter(val);
            setSearch("");
          }}
        >
          <SelectTrigger
            className="w-full sm:w-52"
            data-ocid="entry.department_select"
          >
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Code, Name or Department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
            data-ocid="entry.search_input"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Item count info */}
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {filteredItems.length} items
          {visibleFilledCount > 0 && (
            <span className="text-primary font-medium ml-1">
              · {visibleFilledCount} filled
            </span>
          )}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table data-ocid="entry.table">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs font-semibold text-muted-foreground w-10">
                  #
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground min-w-28">
                  Item Code
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground min-w-44">
                  Item Name
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground w-24">
                  Qty
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground w-20">
                  Unit
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground w-36">
                  Reason Code
                  <span className="ml-1 text-muted-foreground/50 font-normal">
                    (optional)
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground min-w-32">
                  Department
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div
                      data-ocid="entry.empty_state"
                      className="flex flex-col items-center justify-center py-16 text-muted-foreground"
                    >
                      <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">
                        {search ||
                        deptFilter !== "ALL" ||
                        reasonFilter !== "ALL"
                          ? "Koi item nahi mila"
                          : "Koi item nahi hai"}
                      </p>
                      <p className="text-sm mt-1">
                        {search ||
                        deptFilter !== "ALL" ||
                        reasonFilter !== "ALL"
                          ? "Filter ya search change karein"
                          : "Pehle Items tab mein items add karein"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, idx) => {
                  const key = makeKey(item);
                  const qtyVal = qtys[key] ?? "";
                  const reasonVal = reasonCodes[key] ?? "";
                  const hasQty =
                    qtyVal !== "" &&
                    !Number.isNaN(Number(qtyVal)) &&
                    Number(qtyVal) > 0;

                  return (
                    <TableRow
                      key={key}
                      data-ocid="entry.row"
                      className={
                        hasQty
                          ? "bg-primary/5 hover:bg-primary/8 border-l-2 border-l-primary/40"
                          : "hover:bg-muted/30"
                      }
                    >
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.notes ? (
                          <span className="font-semibold text-foreground/80">
                            {item.notes}
                          </span>
                        ) : item.itemCode ? (
                          <span>{item.itemCode}</span>
                        ) : (
                          <span className="text-muted-foreground/40 italic">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-sm ${hasQty ? "font-semibold text-foreground" : "font-medium"}`}
                      >
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={qtyVal}
                          onChange={(e) => handleQtyChange(key, e.target.value)}
                          className={`h-8 w-20 text-sm px-2 ${
                            hasQty
                              ? "border-primary/50 bg-primary/5 font-semibold text-primary focus-visible:ring-primary/40"
                              : ""
                          }`}
                          data-ocid={`entry.qty_input.${idx + 1}`}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.unit || "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={reasonVal}
                          onValueChange={(val) =>
                            handleReasonChange(key, val as ReasonCode)
                          }
                        >
                          <SelectTrigger
                            className={`h-8 w-32 text-xs ${
                              reasonVal === "CONS"
                                ? "border-blue-500/50 bg-blue-500/5 text-blue-700 dark:text-blue-400"
                                : reasonVal === "WASTAGE"
                                  ? "border-orange-500/50 bg-orange-500/5 text-orange-700 dark:text-orange-400"
                                  : ""
                            }`}
                            data-ocid={`entry.reason_select.${idx + 1}`}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONS">CONS</SelectItem>
                            <SelectItem value="WASTAGE">WASTAGE</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {item.department}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-xs text-muted-foreground text-center">
        Qty bharein (Reason Code optional hai), phir{" "}
        <button
          type="button"
          onClick={handleSave}
          className="text-green-600 hover:underline font-medium"
          disabled={filledCount === 0}
        >
          Save
        </button>{" "}
        karein history mein rakhne ke liye, ya{" "}
        {filledCount > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="text-primary hover:underline font-medium"
          >
            Export ({filledCount} items)
          </button>
        )}{" "}
        karo Excel mein. Refresh karne par entry data hat jata hai — Save zaroor
        karein.
      </p>
    </div>
  );
}
