import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Trash2, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SavedEntry } from "./ConsumptionEntryTab";

const LS_KEY = "consumption_history_v1";

function loadHistory(): SavedEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistoryLS(entries: SavedEntry[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

export default function WorkerEntriesTab() {
  const [history, setHistory] = useState<SavedEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const handleDelete = (id: string) => {
    const updated = loadHistory().filter((e) => e.id !== id);
    saveHistoryLS(updated);
    setHistory(updated);
    setConfirmDeleteId(null);
    toast.success("Entry delete ho gayi");
  };

  const handleDeleteAll = () => {
    saveHistoryLS([]);
    setHistory([]);
    setConfirmDeleteId(null);
    toast.success("Sari entries delete ho gayi");
  };

  const handleExportEntry = (entry: SavedEntry) => {
    const headers = [
      "Date",
      "Saved By",
      "Item Code",
      "Item Name",
      "Unit",
      "Qty",
      "Department",
    ];
    const csvRows = [
      headers.join(","),
      ...entry.rows.map((r) =>
        [
          entry.date,
          entry.savedBy ?? "unknown",
          `"${r.itemCode.replace(/"/g, '""')}"`,
          `"${r.name.replace(/"/g, '""')}"`,
          `"${r.unit.replace(/"/g, '""')}"`,
          r.qty,
          `"${r.department.replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ];
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `entry-${entry.date}-${entry.savedBy ?? "unknown"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Export ho gaya");
  };

  const handleExportAll = () => {
    if (history.length === 0) {
      toast.error("Koi entry nahi hai export karne ke liye");
      return;
    }
    const headers = [
      "Date",
      "Saved By",
      "Item Code",
      "Item Name",
      "Unit",
      "Qty",
      "Department",
    ];
    const csvRows = [headers.join(",")];
    for (const entry of history) {
      for (const r of entry.rows) {
        csvRows.push(
          [
            entry.date,
            entry.savedBy ?? "unknown",
            `"${r.itemCode.replace(/"/g, '""')}"`,
            `"${r.name.replace(/"/g, '""')}"`,
            `"${r.unit.replace(/"/g, '""')}"`,
            r.qty,
            `"${r.department.replace(/"/g, '""')}"`,
          ].join(","),
        );
      }
    }
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const today = new Date().toISOString().slice(0, 10);
    link.download = `all-worker-entries-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Saari ${history.length} entries export ho gayi`);
  };

  const workerCount = history.filter((e) => e.savedBy === "worker").length;
  const adminCount = history.filter(
    (e) => e.savedBy === "admin" || !e.savedBy,
  ).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-500/10 rounded-lg p-1.5">
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base leading-tight">
              Worker Entries
            </h2>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Sab saved entries -- workers aur admin dono ki
            </p>
          </div>
          <div className="flex gap-1.5 ml-1">
            <Badge className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 border">
              Worker: {workerCount}
            </Badge>
            <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 border">
              Admin: {adminCount}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAll}
            disabled={history.length === 0}
            data-ocid="worker-entries.export_button"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export All
          </Button>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmDeleteId("__ALL__")}
              data-ocid="worker-entries.delete_all_button"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete All
            </Button>
          )}
        </div>
      </div>

      {/* Confirm Delete All Dialog */}
      {confirmDeleteId === "__ALL__" && (
        <div
          className="border border-destructive/40 bg-destructive/5 rounded-lg px-4 py-3 flex items-center justify-between gap-3"
          data-ocid="worker-entries.delete_all_dialog"
        >
          <p className="text-sm text-destructive font-medium">
            Saari {history.length} entries permanently delete karein?
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteAll}
              data-ocid="worker-entries.confirm_button"
            >
              Haan, Delete Karo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
              data-ocid="worker-entries.cancel_button"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {history.length === 0 ? (
        <div
          data-ocid="worker-entries.empty_state"
          className="flex flex-col items-center justify-center py-24 text-muted-foreground border border-border rounded-lg bg-card"
        >
          <Users className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">Abhi tak koi entry nahi aayi</p>
          <p className="text-sm mt-1">
            Jab worker ya admin Entry tab mein Save karein, yahan dikhega
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...history]
            .sort(
              (a, b) =>
                new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
            )
            .map((entry, idx) => (
              <div
                key={entry.id}
                className="border border-border rounded-lg bg-card overflow-hidden"
                data-ocid={`worker-entries.item.${idx + 1}`}
              >
                {/* Row header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                  <div className="flex items-center gap-3 flex-wrap">
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
                    {entry.savedBy === "worker" ? (
                      <Badge className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 border">
                        Worker
                      </Badge>
                    ) : (
                      <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30 border">
                        Admin
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      Total Qty:{" "}
                      {entry.rows
                        .reduce((s, r) => s + r.qty, 0)
                        .toLocaleString()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedId(expandedId === entry.id ? null : entry.id)
                      }
                      data-ocid={`worker-entries.toggle_button.${idx + 1}`}
                    >
                      {expandedId === entry.id ? "Hide" : "Details"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportEntry(entry)}
                      data-ocid={`worker-entries.export_button.${idx + 1}`}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Excel
                    </Button>
                    {confirmDeleteId === entry.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(entry.id)}
                          data-ocid={`worker-entries.confirm_button.${idx + 1}`}
                        >
                          Haan
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDeleteId(null)}
                          data-ocid={`worker-entries.cancel_button.${idx + 1}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDeleteId(entry.id)}
                        data-ocid={`worker-entries.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded row details */}
                {expandedId === entry.id && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Item Code</TableHead>
                          <TableHead className="text-xs">Item Name</TableHead>
                          <TableHead className="text-xs">Unit</TableHead>
                          <TableHead className="text-xs">Qty</TableHead>
                          <TableHead className="text-xs">Department</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entry.rows.map((r, i) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: stable within entry
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
                            <TableCell className="text-sm text-muted-foreground">
                              {r.unit || "—"}
                            </TableCell>
                            <TableCell className="font-semibold text-sm text-primary">
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
