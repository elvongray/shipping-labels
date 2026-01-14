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

export type PackageFormValues = {
  weight_lb: string;
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
  weight_lb: "",
  weight_oz: "",
  length_in: "",
  width_in: "",
  height_in: "",
};

function readPackageValues(shipment: Shipment | null): PackageFormValues {
  if (!shipment) return emptyValues;
  const totalOz = shipment.weight_oz ?? null;
  const pounds = totalOz !== null ? Math.floor(totalOz / 16) : null;
  const ounces = totalOz !== null ? totalOz % 16 : null;
  return {
    weight_lb: pounds !== null ? String(pounds) : "",
    weight_oz: ounces !== null ? String(ounces) : "",
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<PackageFormValues>({
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(readPackageValues(shipment));
  }, [open, shipment, reset]);

  const onSubmit = (values: PackageFormValues) => {
    onSave(values);
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
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <Label htmlFor="package-weight-lb">
              Weight (lb) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="package-weight-lb"
              inputMode="decimal"
              aria-invalid={Boolean(errors.weight_lb)}
              {...register("weight_lb", { required: "Weight is required" })}
            />
            {isSubmitted && errors.weight_lb ? (
              <p className="text-xs text-destructive">
                {errors.weight_lb.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="package-weight-oz">
              Weight (oz) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="package-weight-oz"
              inputMode="decimal"
              aria-invalid={Boolean(errors.weight_oz)}
              {...register("weight_oz", { required: "Weight is required" })}
            />
            {isSubmitted && errors.weight_oz ? (
              <p className="text-xs text-destructive">
                {errors.weight_oz.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="package-length">
              Length (in) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="package-length"
              inputMode="decimal"
              aria-invalid={Boolean(errors.length_in)}
              {...register("length_in", { required: "Length is required" })}
            />
            {isSubmitted && errors.length_in ? (
              <p className="text-xs text-destructive">
                {errors.length_in.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="package-width">
              Width (in) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="package-width"
              inputMode="decimal"
              aria-invalid={Boolean(errors.width_in)}
              {...register("width_in", { required: "Width is required" })}
            />
            {isSubmitted && errors.width_in ? (
              <p className="text-xs text-destructive">
                {errors.width_in.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="package-height">
              Height (in) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="package-height"
              inputMode="decimal"
              aria-invalid={Boolean(errors.height_in)}
              {...register("height_in", { required: "Height is required" })}
            />
            {isSubmitted && errors.height_in ? (
              <p className="text-xs text-destructive">
                {errors.height_in.message}
              </p>
            ) : null}
          </div>
          <DialogFooter className="sm:col-span-2">
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
