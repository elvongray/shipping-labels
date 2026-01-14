import { useEffect } from "react";
import { useForm } from "react-hook-form";
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

export type PackagePresetFormValues = {
  name: string;
  weight_lb: string;
  weight_oz: string;
  length_in: string;
  width_in: string;
  height_in: string;
};

type CreatePackagePresetDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (values: PackagePresetFormValues) => void;
  isSaving?: boolean;
};

const emptyValues: PackagePresetFormValues = {
  name: "",
  weight_lb: "",
  weight_oz: "",
  length_in: "",
  width_in: "",
  height_in: "",
};

export default function CreatePackagePresetDialog({
  open,
  onClose,
  onSave,
  isSaving,
}: CreatePackagePresetDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<PackagePresetFormValues>({
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    reset(emptyValues);
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New package preset</DialogTitle>
          <DialogDescription>
            Save package dimensions to apply in bulk.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={handleSubmit(onSave)}
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="package-name">
              Preset name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="package-name"
              aria-invalid={Boolean(errors.name)}
              {...register("name", { required: "Preset name is required" })}
            />
            {isSubmitted && errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
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
              {isSaving ? "Saving..." : "Save preset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
