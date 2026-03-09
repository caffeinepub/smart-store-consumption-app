import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ConsumptionItem, SavedEntry, SavedRow } from "../backend.d.ts";
import { useActor } from "./useActor";

export function useGetAllItems() {
  const { actor, isFetching } = useActor();
  return useQuery<ConsumptionItem[]>({
    queryKey: ["items"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllItems();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDepartments() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUniqueDepartments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetItemsByDepartment(department: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ConsumptionItem[]>({
    queryKey: ["items", "department", department],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getItemsByDepartment(department);
    },
    enabled: !!actor && !isFetching && !!department,
  });
}

export function useGetItemsByMonthYear(month: number, year: number) {
  const { actor, isFetching } = useActor();
  return useQuery<ConsumptionItem[]>({
    queryKey: ["items", "monthyear", month, year],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getItemsByMonthYear(month, year);
    },
    enabled: !!actor && !isFetching && !!month && !!year,
  });
}

export function useSearchItems(searchTerm: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ConsumptionItem[]>({
    queryKey: ["items", "search", searchTerm],
    queryFn: async () => {
      if (!actor || !searchTerm.trim()) return [];
      return actor.searchItemsByName(searchTerm);
    },
    enabled: !!actor && !isFetching && !!searchTerm.trim(),
  });
}

export function useAddItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: ConsumptionItem) => {
      if (!actor) throw new Error("Actor not available");
      await actor.addItem(item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Item add ho gaya");
    },
    onError: () => {
      toast.error("Item add karne mein error aaya");
    },
  });
}

export function useBulkImport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: ConsumptionItem[]) => {
      if (!actor) throw new Error("Actor not available");
      await actor.bulkImport(items);
    },
    onSuccess: (_, items) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success(`${items.length} items import ho gaye`);
    },
    onError: () => {
      toast.error("Import karne mein error aaya");
    },
  });
}

export function useDeleteItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      department,
    }: { name: string; department: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteItem(name, department);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Item delete ho gaya");
    },
    onError: () => {
      toast.error("Delete karne mein error aaya");
    },
  });
}

export function useUpdateItemQuantity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      department,
      newQuantity,
    }: {
      name: string;
      department: string;
      newQuantity: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateItemQuantity(name, department, newQuantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Quantity update ho gaya");
    },
    onError: () => {
      toast.error("Quantity update karne mein error aaya");
    },
  });
}

export function useUpdateItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      oldName,
      oldDepartment,
      updatedItem,
    }: {
      oldName: string;
      oldDepartment: string;
      updatedItem: ConsumptionItem;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateItem(oldName, oldDepartment, updatedItem);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Item update ho gaya");
    },
    onError: () => {
      toast.error("Item update karne mein error aaya");
    },
  });
}

export function useResetData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.resetData();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Sab data reset ho gaya");
    },
    onError: () => {
      toast.error("Reset karne mein error aaya");
    },
  });
}

// ---- Entries (Saved Consumption History) ----

export function useGetAllEntries() {
  const { actor, isFetching } = useActor();
  return useQuery<SavedEntry[]>({
    queryKey: ["entries"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEntries();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: SavedEntry) => {
      if (!actor)
        throw new Error(
          "Backend se connection nahi hai -- thoda wait karke dobara try karein",
        );
      await actor.saveEntry(entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      toast.success("Entry save ho gayi!");
    },
    onError: (err) => {
      const msg =
        err instanceof Error ? err.message : "Save karne mein error aaya";
      toast.error(msg);
    },
  });
}

export function useDeleteEntry() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      toast.success("Entry delete ho gayi");
    },
    onError: () => {
      toast.error("Delete karne mein error aaya");
    },
  });
}

export function useDeleteAllEntries() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteAllEntries();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      toast.success("Sari entries delete ho gayi");
    },
    onError: () => {
      toast.error("Delete karne mein error aaya");
    },
  });
}
