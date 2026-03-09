import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { Loader2, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { ConsumptionItem } from "../backend.d.ts";
import { useAuth } from "../context/AuthContext";
import {
  useAddItem,
  useDeleteItem,
  useGetAllItems,
  useGetDepartments,
  useUpdateItem,
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

const MONTH_ABBR = [
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

const PAGE_SIZE = 50;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

type ItemForm = {
  itemCode: string;
  name: string;
  department: string;
  unit: string;
  quantity: string;
  month: string;
  year: string;
  notes: string;
};

export default function ItemsTab() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { data: items = [], isLoading } = useGetAllItems();
  const { data: departments = [] } = useGetDepartments();
  const addItem = useAddItem();
  const deleteItem = useDeleteItem();
  const updateItem = useUpdateItem();

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [page, setPage] = useState(1);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    name: string;
    department: string;
  } | null>(null);

  // Edit dialog state
  const [editTarget, setEditTarget] = useState<ConsumptionItem | null>(null);
  const [editForm, setEditForm] = useState<ItemForm>({
    itemCode: "",
    name: "",
    department: "",
    unit: "",
    quantity: "",
    month: "",
    year: "",
    notes: "",
  });

  const [addForm, setAddForm] = useState<ItemForm>({
    itemCode: "",
    name: "",
    department: "",
    unit: "",
    quantity: "",
    month: String(new Date().getMonth() + 1),
    year: String(currentYear),
    notes: "",
  });

  const filteredItems = useMemo(() => {
    let result = items as ConsumptionItem[];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.itemCode || "").toLowerCase().includes(q) ||
          i.department.toLowerCase().includes(q) ||
          (i.notes || "").toLowerCase().includes(q),
      );
    }
    if (filterDept !== "all") {
      result = result.filter((i) => i.department === filterDept);
    }
    if (filterMonth !== "all") {
      result = result.filter((i) => String(i.month) === filterMonth);
    }
    if (filterYear !== "all") {
      result = result.filter((i) => String(i.year) === filterYear);
    }

    return result;
  }, [items, search, filterDept, filterMonth, filterYear]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPageItems = filteredItems.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const handleFilterChange = useCallback(
    (setter: (v: string) => void) => (val: string) => {
      setter(val);
      setPage(1);
    },
    [],
  );

  const handleAddSubmit = async () => {
    if (!addForm.name.trim() || !addForm.department.trim()) return;
    await addItem.mutateAsync({
      itemCode: addForm.itemCode.trim(),
      name: addForm.name.trim(),
      department: addForm.department.trim(),
      unit: addForm.unit.trim(),
      quantity: Number(addForm.quantity) || 0,
      month: Number(addForm.month),
      year: Number(addForm.year),
      notes: addForm.notes.trim(),
    });
    setShowAddDialog(false);
    setAddForm({
      itemCode: "",
      name: "",
      department: "",
      unit: "",
      quantity: "",
      month: String(new Date().getMonth() + 1),
      year: String(currentYear),
      notes: "",
    });
  };

  const handleOpenEdit = (item: ConsumptionItem) => {
    setEditTarget(item);
    setEditForm({
      itemCode: item.itemCode || "",
      name: item.name,
      department: item.department,
      unit: item.unit || "",
      quantity: String(item.quantity),
      month: String(item.month),
      year: String(item.year),
      notes: item.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !editForm.name.trim() || !editForm.department.trim())
      return;
    await updateItem.mutateAsync({
      oldName: editTarget.name,
      oldDepartment: editTarget.department,
      updatedItem: {
        itemCode: editForm.itemCode.trim(),
        name: editForm.name.trim(),
        department: editForm.department.trim(),
        unit: editForm.unit.trim(),
        quantity: Number(editForm.quantity) || 0,
        month: Number(editForm.month),
        year: Number(editForm.year),
        notes: editForm.notes.trim(),
      },
    });
    setEditTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteItem.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  };

  // Page numbers to show
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 min-w-0 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              data-ocid="items.search_input"
            />
          </div>

          <Select
            value={filterDept}
            onValueChange={handleFilterChange(setFilterDept)}
          >
            <SelectTrigger
              className="w-full sm:w-44"
              data-ocid="items.department_select"
            >
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filterMonth}
            onValueChange={handleFilterChange(setFilterMonth)}
          >
            <SelectTrigger
              className="w-full sm:w-36"
              data-ocid="items.month_select"
            >
              <SelectValue placeholder="All Months" />
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

          <Select
            value={filterYear}
            onValueChange={handleFilterChange(setFilterYear)}
          >
            <SelectTrigger className="w-full sm:w-28">
              <SelectValue placeholder="All Years" />
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

        {isAdmin && (
          <Button
            onClick={() => setShowAddDialog(true)}
            className="w-full sm:w-auto shrink-0"
            data-ocid="items.add_button"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Item
          </Button>
        )}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {Math.min(page * PAGE_SIZE, filteredItems.length)} of{" "}
          {filteredItems.length.toLocaleString()} items
        </span>
        {(search ||
          filterDept !== "all" ||
          filterMonth !== "all" ||
          filterYear !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilterDept("all");
              setFilterMonth("all");
              setFilterYear("all");
              setPage(1);
            }}
            className="text-primary hover:underline text-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table data-ocid="items.table">
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-xs font-semibold text-muted-foreground w-12">
                  #
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground min-w-28">
                  Item Code
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground min-w-36">
                  Name
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground min-w-32">
                  Department
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground w-20">
                  Unit
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground w-28">
                  Quantity
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground w-24">
                  Month/Year
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Notes
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground w-24 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div
                      data-ocid="items.empty_state"
                      className="flex flex-col items-center justify-center py-16 text-muted-foreground"
                    >
                      <Package className="h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">No items found</p>
                      <p className="text-sm mt-1">
                        {search || filterDept !== "all" || filterMonth !== "all"
                          ? "Try adjusting your filters"
                          : "Add items or import from Excel"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentPageItems.map((item, idx) => {
                  const rowNum = (page - 1) * PAGE_SIZE + idx + 1;

                  return (
                    <TableRow
                      key={`${item.name}-${item.department}-${item.month}-${item.year}`}
                      className="hover:bg-muted/30"
                      data-ocid="items.row"
                    >
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {rowNum}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {item.itemCode || (
                          <span className="text-muted-foreground/40 italic">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {item.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.unit}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold text-sm">
                          {Number(item.quantity).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {MONTH_ABBR[item.month - 1]} {item.year}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate">
                        {item.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEdit(item)}
                              data-ocid="items.edit_button.1"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setDeleteTarget({
                                  name: item.name,
                                  department: item.department,
                                })
                              }
                              data-ocid="items.delete_button.1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={
                  page === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
                data-ocid="items.pagination_prev"
              />
            </PaginationItem>
            {pageNumbers.map((p, i) =>
              p === "ellipsis" ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis items have no stable id
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={page === p}
                    onClick={() => setPage(p)}
                    className="cursor-pointer"
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={
                  page === totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
                data-ocid="items.pagination_next"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Edit Item Dialog — admin only */}
      <Dialog
        open={isAdmin && !!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      >
        <DialogContent className="max-w-md" data-ocid="edit_item.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-itemcode">Item Code</Label>
              <Input
                id="edit-itemcode"
                placeholder="e.g. RM40018"
                value={editForm.itemCode}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, itemCode: e.target.value }))
                }
                data-ocid="edit_item.itemcode_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Item Name *</Label>
              <Input
                id="edit-name"
                placeholder="Item ka naam"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                data-ocid="edit_item.name_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-dept">Department *</Label>
              <Input
                id="edit-dept"
                placeholder="e.g. Bhatura"
                value={editForm.department}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, department: e.target.value }))
                }
                data-ocid="edit_item.department_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-unit">Unit</Label>
              <Input
                id="edit-unit"
                placeholder="e.g. KGS, Pcs, Ltr"
                value={editForm.unit}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, unit: e.target.value }))
                }
                data-ocid="edit_item.unit_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                placeholder="Optional"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, notes: e.target.value }))
                }
                data-ocid="edit_item.notes_input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              data-ocid="edit_item.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={
                updateItem.isPending ||
                !editForm.name.trim() ||
                !editForm.department.trim()
              }
              data-ocid="edit_item.save_button"
            >
              {updateItem.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog — admin only */}
      <Dialog
        open={isAdmin && showAddDialog}
        onOpenChange={isAdmin ? setShowAddDialog : undefined}
      >
        <DialogContent className="max-w-md" data-ocid="add_item.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Add New Item</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-itemcode">Item Code</Label>
              <Input
                id="add-itemcode"
                placeholder="e.g. ITM-001"
                value={addForm.itemCode}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, itemCode: e.target.value }))
                }
                data-ocid="add_item.itemcode_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-name">Item Name *</Label>
              <Input
                id="add-name"
                placeholder="e.g. Printer Paper A4"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, name: e.target.value }))
                }
                data-ocid="add_item.name_input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-dept">Department *</Label>
              <Input
                id="add-dept"
                placeholder="e.g. IT Department"
                value={addForm.department}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, department: e.target.value }))
                }
                data-ocid="add_item.department_input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-unit">Unit</Label>
                <Input
                  id="add-unit"
                  placeholder="e.g. Pcs, Kg, Ltr"
                  value={addForm.unit}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, unit: e.target.value }))
                  }
                  data-ocid="add_item.unit_input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-qty">Quantity</Label>
                <Input
                  id="add-qty"
                  type="number"
                  placeholder="0"
                  value={addForm.quantity}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                  data-ocid="add_item.quantity_input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select
                  value={addForm.month}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, month: v }))}
                >
                  <SelectTrigger data-ocid="add_item.month_select">
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
                <Select
                  value={addForm.year}
                  onValueChange={(v) => setAddForm((f) => ({ ...f, year: v }))}
                >
                  <SelectTrigger data-ocid="add_item.year_select">
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
            <div className="space-y-1.5">
              <Label htmlFor="add-notes">Notes</Label>
              <Input
                id="add-notes"
                placeholder="Optional notes"
                value={addForm.notes}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              data-ocid="add_item.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubmit}
              disabled={
                addItem.isPending ||
                !addForm.name.trim() ||
                !addForm.department.trim()
              }
              data-ocid="add_item.submit_button"
            >
              {addItem.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm — admin only */}
      <AlertDialog
        open={isAdmin && !!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong> from{" "}
              <strong>{deleteTarget?.department}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="delete_item.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="delete_item.confirm_button"
            >
              {deleteItem.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
