import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  getImport,
  listShipments,
  patchShipment,
  quoteShipping,
} from "@/api/endpoints";
import type { Shipment } from "@/api/types";
import { ApiClientError } from "@/api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

type QuoteItem = {
  service: string;
  name: string;
  price_cents: number;
};

type QuoteResponse = {
  results: Array<{
    shipment_id: string;
    quotes: QuoteItem[];
  }>;
};

export default function ShippingPage() {
  const { importId } = useParams({ from: "/shipping/$importId" });
  const queryClient = useQueryClient();

  const importQuery = useQuery({
    queryKey: ["importJob", importId],
    queryFn: () => getImport(importId),
  });

  const shipmentsQuery = useQuery({
    queryKey: ["shipments", importId],
    queryFn: () => listShipments(importId),
    enabled: Boolean(importId),
  });

  const quoteQuery = useQuery({
    queryKey: ["shippingQuotes", importId],
    queryFn: () =>
      quoteShipping({ import_id: importId }) as Promise<QuoteResponse>,
    enabled: Boolean(importId),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      shipmentId,
      service,
      priceCents,
    }: {
      shipmentId: string;
      service: string;
      priceCents: number;
    }) =>
      patchShipment(shipmentId, {
        selected_service: service,
        selected_service_price_cents: priceCents,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments", importId] });
      toast.success("Service updated");
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        return;
      }
      toast.error("Update failed");
    },
  });

  const shipments = shipmentsQuery.data?.results ?? [];
  const readyShipments = shipments.filter(
    (shipment) => shipment.validation_status === "READY",
  );
  const attentionCount = importQuery.data
    ? (importQuery.data.invalid_count ?? 0) +
      (importQuery.data.needs_info_count ?? 0) +
      (importQuery.data.address_unverified_count ?? 0)
    : 0;
  const quotesByShipment = useMemo(() => {
    const map = new Map<string, QuoteItem[]>();
    (quoteQuery.data?.results ?? []).forEach((item) => {
      map.set(item.shipment_id, item.quotes);
    });
    return map;
  }, [quoteQuery.data]);

  const totalCents = readyShipments.reduce((sum, shipment) => {
    return sum + (shipment.selected_service_price_cents ?? 0);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Select Shipping</h1>
        <p className="mt-2 text-sm text-muted-foreground">Import: {importId}</p>
      </div>

      {attentionCount > 0 ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-destructive">
              {attentionCount} shipment(s) need fixes before purchase.
            </div>
            <Button asChild variant="outline">
              <Link to={`/review/${importId}`}>Go fix issues</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ready shipments</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select a shipping service for each ready shipment.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">
              ${(totalCents / 100).toFixed(2)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 min-w-0">
          <div className="rounded-lg border">
            <div className="w-full min-w-0 max-w-full overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Ship From</TableHead>
                    <TableHead>Ship To</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipmentsQuery.isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        {Array.from({ length: 6 }).map((__, cellIndex) => (
                          <TableCell
                            key={`skeleton-cell-${index}-${cellIndex}`}
                          >
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : readyShipments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        No ready shipments yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    readyShipments.map((shipment) => {
                      const quotes = quotesByShipment.get(shipment.id) ?? [];
                      const selected = shipment.selected_service ?? "";
                      return (
                        <TableRow key={shipment.id}>
                          <TableCell>
                            {shipment.external_order_number?.trim() || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {[
                              shipment.from_name,
                              shipment.from_city,
                              shipment.from_state,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {[
                              shipment.to_name,
                              shipment.to_city,
                              shipment.to_state,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {shipment.weight_oz
                              ? `${shipment.weight_oz} oz`
                              : "Missing weight"}
                          </TableCell>
                          <TableCell>
                            {quotes.length === 0 ? (
                              <Badge variant="outline">No quotes</Badge>
                            ) : (
                              <Select
                                value={selected}
                                onValueChange={(value) => {
                                  const match = quotes.find(
                                    (quote) => quote.service === value,
                                  );
                                  if (!match) return;
                                  patchMutation.mutate({
                                    shipmentId: shipment.id,
                                    service: match.service,
                                    priceCents: match.price_cents,
                                  });
                                }}
                              >
                                <SelectTrigger className="w-[220px]">
                                  <SelectValue placeholder="Select service" />
                                </SelectTrigger>
                                <SelectContent>
                                  {quotes.map((quote) => (
                                    <SelectItem
                                      key={`${shipment.id}-${quote.service}`}
                                      value={quote.service}
                                    >
                                      {quote.name} • $
                                      {(quote.price_cents / 100).toFixed(2)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {shipment.selected_service_price_cents
                              ? `$${(
                                  shipment.selected_service_price_cents / 100
                                ).toFixed(2)}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
