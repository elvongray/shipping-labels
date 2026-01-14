import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { PresetAddress } from "@/api/types";
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

export type AddressPresetFormValues = {
  name: string;
  contact_name: string;
  company: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type CreateAddressPresetDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (values: AddressPresetFormValues) => void;
  isSaving?: boolean;
  initialValues?: Partial<PresetAddress>;
};

const emptyValues: AddressPresetFormValues = {
  name: "",
  contact_name: "",
  company: "",
  street1: "",
  street2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "US",
};

export default function CreateAddressPresetDialog({
  open,
  onClose,
  onSave,
  isSaving,
  initialValues,
}: CreateAddressPresetDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<AddressPresetFormValues>({
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      ...emptyValues,
      ...initialValues,
    });
  }, [open, reset, initialValues]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New address preset</DialogTitle>
          <DialogDescription>
            Save a ship-from address to reuse in bulk actions.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit(onSave)}
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="preset-name">
              Preset name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="preset-name"
              aria-invalid={Boolean(errors.name)}
              {...register("name", { required: "Preset name is required" })}
            />
            {isSubmitted && errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="preset-contact">Contact name</Label>
            <Input id="preset-contact" {...register("contact_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preset-company">Company</Label>
            <Input id="preset-company" {...register("company")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="preset-street1">
              Street address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="preset-street1"
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
            <Label htmlFor="preset-street2">Street address line 2</Label>
            <Input id="preset-street2" {...register("street2")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preset-city">
              City <span className="text-destructive">*</span>
            </Label>
            <Input
              id="preset-city"
              aria-invalid={Boolean(errors.city)}
              {...register("city", { required: "City is required" })}
            />
            {isSubmitted && errors.city ? (
              <p className="text-xs text-destructive">{errors.city.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="preset-state">
              State <span className="text-destructive">*</span>
            </Label>
            <Input
              id="preset-state"
              aria-invalid={Boolean(errors.state)}
              {...register("state", { required: "State is required" })}
            />
            {isSubmitted && errors.state ? (
              <p className="text-xs text-destructive">{errors.state.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="preset-postal">
              Postal code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="preset-postal"
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
            <Label htmlFor="preset-country">
              Country <span className="text-destructive">*</span>
            </Label>
            <Input
              id="preset-country"
              aria-invalid={Boolean(errors.country)}
              {...register("country", { required: "Country is required" })}
            />
            {isSubmitted && errors.country ? (
              <p className="text-xs text-destructive">
                {errors.country.message}
              </p>
            ) : null}
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save preset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
