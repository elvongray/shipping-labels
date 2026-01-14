import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { purchase, getImport, listShipments } from "@/api/endpoints";
import { ApiClientError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function CheckoutPage() {
  const { importId } = useParams({ from: "/checkout/$importId" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [labelFormat, setLabelFormat] = useState<"LETTER" | "LABEL_4X6">(
    "LABEL_4X6",
  );
  const [agree, setAgree] = useState(false);

  useQuery({
    queryKey: ["importJob", importId],
    queryFn: () => getImport(importId),
  });

  const shipmentsQuery = useQuery({
    queryKey: ["shipments", importId],
    queryFn: () => listShipments(importId),
    enabled: Boolean(importId),
  });

  const shipments = shipmentsQuery.data?.results ?? [];
  const readyShipments = shipments.filter(
    (shipment) => shipment.validation_status === "READY",
  );
  const missingService = readyShipments.filter(
    (shipment) => !shipment.selected_service,
  );
  const totalCents = readyShipments.reduce(
    (sum, shipment) => sum + (shipment.selected_service_price_cents ?? 0),
    0,
  );

  const purchaseMutation = useMutation({
    mutationFn: () =>
      purchase(importId, {
        label_format: labelFormat,
        agree_to_terms: agree,
      }) as Promise<{ purchase_id: string; label_download_url: string }>,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["importJob", importId] });
      toast.success("Purchase complete");
      navigate({
        to: `/success/${importId}`,
        search: {
          purchaseId: data.purchase_id,
          labelUrl: data.label_download_url,
        },
      });
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        return;
      }
      toast.error("Purchase failed");
    },
  });

  const canPurchase =
    readyShipments.length > 0 && missingService.length === 0 && agree;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="mt-2 text-sm text-muted-foreground">Import: {importId}</p>
      </div>

      <Card className="w-full max-w-full">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review totals and confirm label settings.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Ready shipments</p>
              <p className="text-lg font-semibold">{readyShipments.length}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-semibold">
                ${(totalCents / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {missingService.length > 0 ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {missingService.length} ready shipment(s) are missing a service.
              <Button
                variant="outline"
                size="sm"
                className="ml-3"
                onClick={() => navigate({ to: `/shipping/${importId}` })}
              >
                Fix in Shipping
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium">Label format</label>
            <Select
              value={labelFormat}
              onValueChange={(value) =>
                setLabelFormat(value as "LETTER" | "LABEL_4X6")
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LABEL_4X6">4x6 label</SelectItem>
                <SelectItem value="LETTER">Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={agree}
              onCheckedChange={(checked) => setAgree(checked === true)}
            />
            <span>I agree to the terms and conditions</span>
          </div>

          <div>
            <Button
              onClick={() => purchaseMutation.mutate()}
              disabled={!canPurchase || purchaseMutation.isPending}
            >
              {purchaseMutation.isPending ? "Purchasing..." : "Purchase labels"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
