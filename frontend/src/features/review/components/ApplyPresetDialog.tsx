import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PresetOption = {
  id: string;
  name: string;
  subtitle?: ReactNode;
};

type ApplyPresetDialogProps = {
  open: boolean;
  title: string;
  description: string;
  presets: PresetOption[];
  onClose: () => void;
  onApply: (presetId: string) => void;
  isLoading?: boolean;
};

export default function ApplyPresetDialog({
  open,
  title,
  description,
  presets,
  onClose,
  onApply,
  isLoading,
}: ApplyPresetDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");

  const handleApply = () => {
    if (!selectedId) return;
    onApply(selectedId);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Select preset</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a preset" />
            </SelectTrigger>
            <SelectContent>
              {presets.length === 0 ? (
                <SelectItem value="none" disabled>
                  No presets yet
                </SelectItem>
              ) : (
                presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex flex-col items-start">
                      <span>{preset.name}</span>
                      {preset.subtitle ? (
                        <span className="text-xs text-muted-foreground">
                          {preset.subtitle}
                        </span>
                      ) : null}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {presets.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Create a preset first to apply it in bulk.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selectedId || isLoading}>
            Apply preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
