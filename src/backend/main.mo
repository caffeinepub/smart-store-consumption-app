import Float "mo:core/Float";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Array "mo:core/Array";
import Set "mo:core/Set";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";



actor {
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

  module ConsumptionItem {
    public func compare(a : ConsumptionItem, b : ConsumptionItem) : Order.Order {
      switch (Text.compare(a.department, b.department)) {
        case (#equal) { Text.compare(a.name, b.name) };
        case (order) { order };
      };
    };
  };

  let items = Map.empty<Text, ConsumptionItem>();

  public shared ({ caller }) func addItem(item : ConsumptionItem) : async () {
    if (items.containsKey(item.itemCode)) {
      Runtime.trap("Item with code " # item.itemCode # " already exists");
    };
    items.add(item.itemCode, item);
  };

  public shared ({ caller }) func bulkImport(newItems : [ConsumptionItem]) : async () {
    newItems.forEach(
      func(item) {
        if (not items.containsKey(item.itemCode)) {
          items.add(item.itemCode, item);
        };
      }
    );
  };

  public shared ({ caller }) func updateItemQuantity(name : Text, department : Text, newQuantity : Float) : async () {
    let itemOpt = items.values().find(
      func(item) {
        item.name == name and item.department == department
      }
    );

    switch (itemOpt) {
      case (null) {
        Runtime.trap("Item not found for update");
      };
      case (?item) {
        let updatedItem = {
          item with quantity = newQuantity;
        };
        items.add(updatedItem.itemCode, updatedItem);
      };
    };
  };

  public shared ({ caller }) func deleteItem(name : Text, department : Text) : async () {
    let itemOpt = items.values().find(
      func(item) {
        item.name == name and item.department == department
      }
    );

    switch (itemOpt) {
      case (null) {
        Runtime.trap("Item not found for deletion");
      };
      case (?item) {
        items.remove(item.itemCode);
      };
    };
  };

  public query ({ caller }) func getAllItems() : async [ConsumptionItem] {
    items.values().toArray().sort();
  };

  public query ({ caller }) func getItemsByDepartment(department : Text) : async [ConsumptionItem] {
    items.values().toArray().filter(func(item) { item.department == department });
  };

  public query ({ caller }) func getItemsByMonthYear(month : Nat8, year : Nat16) : async [ConsumptionItem] {
    items.values().toArray().filter(func(item) { item.month == month and item.year == year });
  };

  public query ({ caller }) func searchItemsByName(searchTerm : Text) : async [ConsumptionItem] {
    items.values().toArray().filter(func(item) { item.name.contains(#text(searchTerm)) });
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
};
