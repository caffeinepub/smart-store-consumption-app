import Float "mo:core/Float";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Set "mo:core/Set";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";



actor {
  // ---- Consumption Items ----
  type ConsumptionItem = {
    itemCode : Text;
    name : Text;
    department : Text;
    unit : Text;
    quantity : Float;
    month : Nat8;
    year : Nat16;
    notes : Text;
  };

  func compareItems(a : ConsumptionItem, b : ConsumptionItem) : Order.Order {
    switch (Text.compare(a.department, b.department)) {
      case (#equal) { Text.compare(a.name, b.name) };
      case (order) { order };
    };
  };

  let items = Map.empty<Text, ConsumptionItem>();

  func makeCompositeKey(name : Text, department : Text) : Text {
    name.trim(#char(' ')).toLower() # "::" # department.trim(#char(' ')).toLower();
  };

  public shared ({ caller }) func addItem(item : ConsumptionItem) : async () {
    let key = makeCompositeKey(item.name, item.department);
    items.add(key, item);
  };

  public shared ({ caller }) func bulkImport(newItems : [ConsumptionItem]) : async () {
    newItems.forEach(
      func(item) {
        let key = makeCompositeKey(item.name, item.department);
        if (not items.containsKey(key)) {
          items.add(key, item);
        };
      }
    );
  };

  public shared ({ caller }) func updateItemQuantity(name : Text, department : Text, newQuantity : Float) : async () {
    let key = makeCompositeKey(name, department);
    let itemOpt = items.get(key);
    switch (itemOpt) {
      case (null) { Runtime.trap("Item not found for update") };
      case (?item) {
        let updatedItem : ConsumptionItem = { item with quantity = newQuantity };
        items.add(key, updatedItem);
      };
    };
  };

  public shared ({ caller }) func updateItem(oldName : Text, oldDepartment : Text, updatedItem : ConsumptionItem) : async () {
    let oldKey = makeCompositeKey(oldName, oldDepartment);
    items.remove(oldKey);
    let newKey = makeCompositeKey(updatedItem.name, updatedItem.department);
    items.add(newKey, updatedItem);
  };

  public shared ({ caller }) func deleteItem(name : Text, department : Text) : async () {
    let key = makeCompositeKey(name, department);
    if (not items.containsKey(key)) {
      Runtime.trap("Item not found for deletion");
    };
    items.remove(key);
  };

  public query ({ caller }) func getAllItems() : async [ConsumptionItem] {
    items.values().toArray().sort(compareItems);
  };

  public query ({ caller }) func getItemsByDepartment(department : Text) : async [ConsumptionItem] {
    items.values().toArray().filter(func(item) { item.department == department });
  };

  public query ({ caller }) func getItemsByMonthYear(month : Nat8, year : Nat16) : async [ConsumptionItem] {
    items.values().toArray().filter(func(item) { item.month == month and item.year == year });
  };

  public query ({ caller }) func searchItemsByName(searchTerm : Text) : async [ConsumptionItem] {
    let lowerTerm = searchTerm.toLower();
    items.values().toArray().filter(
      func(item) { item.name.toLower().contains(#text(lowerTerm)) }
    );
  };

  public query ({ caller }) func searchItemsByCode(searchTerm : Text) : async [ConsumptionItem] {
    items.values().toArray().filter(func(item) { item.itemCode.contains(#text(searchTerm)) });
  };

  public query ({ caller }) func getUniqueDepartments() : async [Text] {
    let departmentSet = Set.empty<Text>();
    items.values().forEach(func(item) { departmentSet.add(item.department) });
    departmentSet.toArray();
  };

  public shared ({ caller }) func resetData() : async () {
    items.clear();
  };

  // ---- Saved Entries ----
  type SavedRow = {
    itemCode : Text;
    name : Text;
    unit : Text;
    qty : Float;
    department : Text;
    reasonCode : Text;
  };

  type SavedEntry = {
    id : Text;
    date : Text;
    savedAt : Text;
    department : Text;
    savedBy : Text;
    rows : [SavedRow];
  };

  let savedEntries = Map.empty<Text, SavedEntry>();

  func compareEntriesBySavedAtDesc(a : SavedEntry, b : SavedEntry) : Order.Order {
    Text.compare(b.savedAt, a.savedAt);
  };

  public shared ({ caller }) func saveEntry(entry : SavedEntry) : async () {
    savedEntries.add(entry.id, entry);
  };

  public query ({ caller }) func getAllEntries() : async [SavedEntry] {
    savedEntries.values().toArray().sort(compareEntriesBySavedAtDesc);
  };

  public shared ({ caller }) func deleteEntry(id : Text) : async () {
    if (not savedEntries.containsKey(id)) {
      Runtime.trap("Entry not found for deletion");
    };
    savedEntries.remove(id);
  };

  public shared ({ caller }) func deleteAllEntries() : async () {
    savedEntries.clear();
  };
};
