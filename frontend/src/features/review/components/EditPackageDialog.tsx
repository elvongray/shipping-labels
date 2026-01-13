import { useEffect, useState } from "react";
import type { Shipment } from "@/api/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PackageFormValues = {
  weight_oz: string;
  length_in: string;
  width_in: string;
  height_in: string;
};

type EditPackageDialogProps = {
  open: boolean;
  shipment: Shipment | null;
  onClose: () => void;
  onSave: (values: PackageFormValues) => void;
  isSaving?: boolean;
};

const emptyValues: PackageFormValues = {
  weight_oz: "",
  length_in: "",
  width_in: "",
  height_in: "",
};

function readPackageValues(shipment: Shipment | null): PackageFormValues {
  if (!shipment) return emptyValues;
  return {
    weight_oz: shipment.weight_oz ? String(shipment.weight_oz) : "",
    length_in: shipment.length_in ? String(shipment.length_in) : "",
    width_in: shipment.width_in ? String(shipment.width_in) : "",
    height_in: shipment.height_in ? String(shipment.height_in) : "",
  };
}

export default function EditPackageDialog({
  open,
  shipment,
  onClose,
  onSave,
  isSaving,
}: EditPackageDialogProps) {
  const [values, setValues] = useState<PackageFormValues>(emptyValues);

  useEffect(() => {
    if (!open) return;
    setValues(readPackageValues(shipment));
  }, [open, shipment]);

  const handleChange = (field: keyof PackageFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit package</DialogTitle>
          <DialogDescription>
            Update the package weight and dimensions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="package-weight">Weight (oz)</Label>
            <Input
              id="package-weight"
              inputMode="decimal"
              value={values.weight_oz}
              onChange={(event) =>
                handleChange("weight_oz", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package-length">Length (in)</Label>
            <Input
              id="package-length"
              inputMode="decimal"
              value={values.length_in}
              onChange={(event) =>
                handleChange("length_in", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package-width">Width (in)</Label>
            <Input
              id="package-width"
              inputMode="decimal"
              value={values.width_in}
              onChange={(event) => handleChange("width_in", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package-height">Height (in)</Label>
            <Input
              id="package-height"
              inputMode="decimal"
              value={values.height_in}
              onChange={(event) =>
                handleChange("height_in", event.target.value)
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(values)} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
