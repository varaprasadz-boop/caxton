import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { JobItem } from "@shared/schema";

interface DynamicItemsTableProps {
  items: JobItem[];
  onChange: (items: JobItem[]) => void;
}

export default function DynamicItemsTable({ items, onChange }: DynamicItemsTableProps) {
  const addRow = () => {
    onChange([...items, { item1: "", item2: "", remarks: "" }]);
  };

  const removeRow = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof JobItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 text-sm font-medium text-muted-foreground">Item 1</th>
              <th className="text-left p-2 text-sm font-medium text-muted-foreground">Item 2</th>
              <th className="text-left p-2 text-sm font-medium text-muted-foreground">Remarks</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-4 text-sm text-muted-foreground">
                  No items added. Click "Add Item" to add a row.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index} className="border-b last:border-b-0">
                  <td className="p-2">
                    <Input
                      value={item.item1 || ""}
                      onChange={(e) => updateRow(index, "item1", e.target.value)}
                      placeholder="Enter item"
                      className="h-8"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={item.item2 || ""}
                      onChange={(e) => updateRow(index, "item2", e.target.value)}
                      placeholder="Enter item"
                      className="h-8"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={item.remarks || ""}
                      onChange={(e) => updateRow(index, "remarks", e.target.value)}
                      placeholder="Enter remarks"
                      className="h-8"
                    />
                  </td>
                  <td className="p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(index)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  );
}
