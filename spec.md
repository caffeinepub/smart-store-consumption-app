# Smart Store Consumption App

## Current State
- Full-stack app with Motoko backend and React frontend
- Login system: Worker (password 362341) and Admin (password 121212)
- Worker sees only Entry tab -- can fill qty, save to localStorage, export CSV
- Admin sees Dashboard, Items, Import, Reports, Entry tabs
- History is stored in localStorage under key `consumption_history_v1`
- SavedEntry interface: { id, date, savedAt, department, rows[] }
- Admin can delete history entries from within the Entry tab's history view
- Workers and Admin share the same localStorage, so history is visible to both on the same device

## Requested Changes (Diff)

### Add
- `savedBy` field to `SavedEntry` interface to track who saved the entry ("worker" | "admin")
- New **"Worker Entries"** tab in Admin navigation -- a dedicated view for admin to see all saved history entries (especially those saved by workers), with date, department, item count, total qty
- Delete button on each entry in the Worker Entries admin tab (admin can delete any entry)
- Worker name/label badge on each entry so admin knows it came from a worker or admin

### Modify
- `handleSave` in `ConsumptionEntryTab.tsx` -- store `savedBy: role` ("worker" or "admin") in each SavedEntry
- Admin navigation in `App.tsx` -- add a 6th tab "Worker Entries" (only visible to admin)
- History view inside Entry tab -- show `savedBy` badge on each entry so admin can see who saved it

### Remove
- Nothing removed

## Implementation Plan
1. Update `SavedEntry` interface in `ConsumptionEntryTab.tsx` to include `savedBy: "worker" | "admin"`
2. Update `handleSave` to pass `savedBy: role` when creating a new entry
3. In history view (inside ConsumptionEntryTab), show a "Worker" or "Admin" badge on each entry
4. Create new component `WorkerEntriesTab.tsx` -- admin-only view showing all history entries from localStorage, with:
   - Table/list of all saved entries sorted by date desc
   - Columns: Date, Saved By (badge), Department, Items, Total Qty, Actions (Excel export + Delete)
   - Delete confirmation or direct delete with toast
   - Expandable row to see item details
   - Empty state if no history
5. Add "Worker Entries" tab to admin nav in `App.tsx` (6th tab)
6. Validate and deploy
