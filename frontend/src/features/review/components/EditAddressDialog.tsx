import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<AddressFormValues>({
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(readAddressValues(shipment, addressType));
  }, [open, shipment, addressType, reset]);

  const onSubmit = (values: AddressFormValues) => {
    onSave(values, addressType);
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
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
              <Label htmlFor="address-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address-name"
                aria-invalid={Boolean(errors.name)}
                {...register("name", { required: "Name is required" })}
              />
              {isSubmitted && errors.name ? (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-company">Company</Label>
              <Input id="address-company" {...register("company")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address-street1">
                Street address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address-street1"
                aria-invalid={Boolean(errors.street1)}
                {...register("street1", {
                  required: "Street address is required",
                })}
              />
              {isSubmitted && errors.street1 ? (
                <p className="text-xs text-destructive">
                  {errors.street1.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address-street2">Street address line 2</Label>
              <Input id="address-street2" {...register("street2")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address-city"
                aria-invalid={Boolean(errors.city)}
                {...register("city", { required: "City is required" })}
              />
              {isSubmitted && errors.city ? (
                <p className="text-xs text-destructive">
                  {errors.city.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-state">
                State <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address-state"
                aria-invalid={Boolean(errors.state)}
                {...register("state", { required: "State is required" })}
              />
              {isSubmitted && errors.state ? (
                <p className="text-xs text-destructive">
                  {errors.state.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-postal">
                Postal code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address-postal"
                aria-invalid={Boolean(errors.postal_code)}
                {...register("postal_code", {
                  required: "Postal code is required",
                })}
              />
              {isSubmitted && errors.postal_code ? (
                <p className="text-xs text-destructive">
                  {errors.postal_code.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address-country">
                Country <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address-country"
                aria-invalid={Boolean(errors.country)}
                {...register("country", { required: "Country is required" })}
              />
              {isSubmitted && errors.country ? (
                <p className="text-xs text-destructive">
                  {errors.country.message}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
