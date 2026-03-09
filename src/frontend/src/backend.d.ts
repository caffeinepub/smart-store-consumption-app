import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ConsumptionItem {
    month: number;
    name: string;
    unit: string;
    year: number;
    itemCode: string;
    notes: string;
    quantity: number;
    department: string;
}
export interface backendInterface {
    addItem(item: ConsumptionItem): Promise<void>;
    bulkImport(newItems: Array<ConsumptionItem>): Promise<void>;
    deleteItem(name: string, department: string): Promise<void>;
    getAllItems(): Promise<Array<ConsumptionItem>>;
    getItemsByDepartment(department: string): Promise<Array<ConsumptionItem>>;
    getItemsByMonthYear(month: number, year: number): Promise<Array<ConsumptionItem>>;
    getUniqueDepartments(): Promise<Array<string>>;
    resetData(): Promise<void>;
    searchItemsByCode(searchTerm: string): Promise<Array<ConsumptionItem>>;
    searchItemsByName(searchTerm: string): Promise<Array<ConsumptionItem>>;
    updateItemQuantity(name: string, department: string, newQuantity: number): Promise<void>;
}
