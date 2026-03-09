import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Building2, Package, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import type { ConsumptionItem } from "../backend.d.ts";
import { useGetAllItems } from "../hooks/useQueries";

const MONTHS = [
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

export default function DashboardTab() {
  const { data: items = [], isLoading } = useGetAllItems();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const stats = useMemo(() => {
    const totalItems = items.length;
    const departments = new Set(items.map((i: ConsumptionItem) => i.department))
      .size;

    const currentMonthItems = items.filter(
      (i: ConsumptionItem) =>
        i.month === currentMonth && i.year === currentYear,
    );
    const currentMonthQty = currentMonthItems.reduce(
      (sum: number, i: ConsumptionItem) => sum + Number(i.quantity),
      0,
    );

    // Department consumption totals
    const deptMap = new Map<string, number>();
    for (const i of items as ConsumptionItem[]) {
      const curr = deptMap.get(i.department) || 0;
      deptMap.set(i.department, curr + Number(i.quantity));
    }

    const topDepts = Array.from(deptMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // Monthly trend (last 6 months)
    const monthlyMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthlyMap.set(key, 0);
    }
    for (const item of items as ConsumptionItem[]) {
      const key = `${item.year}-${item.month}`;
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(item.quantity));
      }
    }

    return { totalItems, departments, currentMonthQty, topDepts };
  }, [items, currentMonth, currentYear]);

  const maxDeptQty = stats.topDepts.length > 0 ? stats.topDepts[0][1] : 1;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Total Items
                </p>
                <p className="text-3xl font-display font-bold text-foreground mt-1">
                  {stats.totalItems.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All records
                </p>
              </div>
              <div className="bg-primary/10 rounded-lg p-2.5">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Departments
                </p>
                <p className="text-3xl font-display font-bold text-foreground mt-1">
                  {stats.departments}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Active units
                </p>
              </div>
              <div className="bg-primary/10 rounded-lg p-2.5">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  {MONTHS[currentMonth - 1]} {currentYear} Qty
                </p>
                <p className="text-3xl font-display font-bold text-foreground mt-1">
                  {stats.currentMonthQty.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-2.5">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Consumption */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-base">
              Top Departments by Consumption
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {stats.topDepts.length === 0 ? (
            <div
              data-ocid="dashboard.empty_state"
              className="text-center py-12 text-muted-foreground"
            >
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No data yet</p>
              <p className="text-sm mt-1">
                Import items or add them manually to see stats
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-muted-foreground w-8">
                    #
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground">
                    Department
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">
                    Total Qty
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground w-40 hidden md:table-cell">
                    Distribution
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topDepts.map(([dept, qty], idx) => (
                  <TableRow key={dept} className="hover:bg-muted/40">
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{dept}</span>
                        {idx === 0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs px-1.5 py-0 h-4"
                          >
                            Top
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-sm">
                      {qty.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(qty / maxDeptQty) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {Math.round((qty / maxDeptQty) * 100)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
