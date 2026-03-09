import Map "mo:core/Map";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

module {
  type OldActor = {
    items : Map.Map<Text, ConsumptionItem>;
  };

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

  type SavedRow = {
    itemCode : Text;
    name : Text;
    unit : Text;
    qty : Float;
    department : Text;
  };

  type SavedEntry = {
    id : Text;
    date : Text;
    savedAt : Text;
    department : Text;
    savedBy : Text;
    rows : [SavedRow];
  };

  type NewActor = {
    items : Map.Map<Text, ConsumptionItem>;
    savedEntries : Map.Map<Text, SavedEntry>;
  };

  public func run(old : OldActor) : NewActor {
    { old with savedEntries = Map.empty<Text, SavedEntry>() };
  };
};
