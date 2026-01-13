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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AddressType = "from" | "to";

export type AddressFormValues = {
  name: string;
  company: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type EditAddressDialogProps = {
  open: boolean;
  shipment: Shipment | null;
  addressType: AddressType;
  onAddressTypeChange: (value: AddressType) => void;
  onClose: () => void;
  onSave: (values: AddressFormValues, addressType: AddressType) => void;
  isSaving?: boolean;
};

const emptyValues: AddressFormValues = {
  name: "",
  company: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
};

function readAddressValues(shipment: Shipment | null, type: AddressType) {
  if (!shipment) return emptyValues;
  const prefix = type === "from" ? "from" : "to";
  return {
    name: (shipment[`${prefix}_name` as const] ?? "") as string,
    company: (shipment[`${prefix}_company` as const] ?? "") as string,
    street1: (shipment[`${prefix}_street1` as const] ?? "") as string,
    street2: (shipment[`${prefix}_street2` as const] ?? "") as string,
    city: (shipment[`${prefix}_city` as const] ?? "") as string,
    state: (shipment[`${prefix}_state` as const] ?? "") as string,
    postal_code: (shipment[`${prefix}_postal_code` as const] ?? "") as string,
    country: (shipment[`${prefix}_country` as const] ?? "US") as string,
  };
}

export default function EditAddressDialog({
  open,
  shipment,
  addressType,
  onAddressTypeChange,
  onClose,
  onSave,
  isSaving,
}: EditAddressDialogProps) {
  const [values, setValues] = useState<AddressFormValues>(emptyValues);

  useEffect(() => {
    if (!open) return;
    setValues(readAddressValues(shipment, addressType));
  }, [open, shipment, addressType]);

  const handleChange = (field: keyof AddressFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit address</DialogTitle>
          <DialogDescription>
            Update the ship from or ship to address for this shipment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Address type</Label>
            <Select
              value={addressType}
              onValueChange={(value) =>
                onAddressTypeChange(value as AddressType)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select address type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="from">Ship from</SelectItem>
                <SelectItem value="to">Ship to</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address-name">Name</Label>
              <Input
                id="address-name"
                value={values.name}
                onChange={(event) => handleChange("name", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-company">Company</Label>
              <Input
                id="address-company"
                value={values.company}
                onChange={(event) =>
                  handleChange("company", event.target.value)
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address-street1">Street address</Label>
              <Input
                id="address-street1"
                value={values.street1}
                onChange={(event) =>
                  handleChange("street1", event.target.value)
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address-street2">Street address line 2</Label>
              <Input
                id="address-street2"
                value={values.street2}
                onChange={(event) =>
                  handleChange("street2", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-city">City</Label>
              <Input
                id="address-city"
                value={values.city}
                onChange={(event) => handleChange("city", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-state">State</Label>
              <Input
                id="address-state"
                value={values.state}
                onChange={(event) => handleChange("state", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-postal">Postal code</Label>
              <Input
                id="address-postal"
                value={values.postal_code}
                onChange={(event) =>
                  handleChange("postal_code", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-country">Country</Label>
              <Input
                id="address-country"
                value={values.country}
                onChange={(event) =>
                  handleChange("country", event.target.value)
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(values, addressType)}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
