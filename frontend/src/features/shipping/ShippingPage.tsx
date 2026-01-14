import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  bulkShipments,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useSelectionStore } from "@/stores/selection.store";

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

  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const toggle = useSelectionStore((state) => state.toggle);
  const clear = useSelectionStore((state) => state.clear);
  const setMany = useSelectionStore((state) => state.setMany);
  const [bulkService, setBulkService] = useState("");
  const visibleIds = readyShipments.map((shipment) => shipment.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds[id]);
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds[id]) && !allVisibleSelected;
  const selectedIdsArray = Object.keys(selectedIds);

  useEffect(() => {
    clear();
  }, [importId, clear]);

  const bulkMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      bulkShipments(importId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments", importId] });
      toast.success("Bulk update applied");
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        return;
      }
      toast.error("Bulk update failed");
    },
  });

  const cheapestByShipment = useMemo(() => {
    const entries = readyShipments.map((shipment) => {
      const quotes = quotesByShipment.get(shipment.id) ?? [];
      const cheapest = quotes.reduce<QuoteItem | null>((acc, quote) => {
        if (!acc || quote.price_cents < acc.price_cents) return quote;
        return acc;
      }, null);
      return { shipment, cheapest };
    });
    return entries;
  }, [readyShipments, quotesByShipment]);

  const availableServices = useMemo(() => {
    const idsToScan =
      selectedIdsArray.length > 0 ? selectedIdsArray : visibleIds;
    const services = new Map<string, QuoteItem>();
    idsToScan.forEach((id) => {
      const quotes = quotesByShipment.get(id) ?? [];
      quotes.forEach((quote) => {
        if (!services.has(quote.service)) {
          services.set(quote.service, quote);
        }
      });
    });
    return Array.from(services.values());
  }, [selectedIdsArray, visibleIds, quotesByShipment]);

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
          {selectedIdsArray.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <div>{selectedIdsArray.length} selected</div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={bulkService}
                  onValueChange={setBulkService}
                  disabled={availableServices.length === 0}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Set service" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServices.map((quote) => (
                      <SelectItem key={quote.service} value={quote.service}>
                        {quote.name} • ${(quote.price_cents / 100).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={
                    bulkMutation.isPending ||
                    selectedIdsArray.length === 0 ||
                    !bulkService
                  }
                  onClick={() => {
                    const serviceQuote = availableServices.find(
                      (quote) => quote.service === bulkService,
                    );
                    if (!serviceQuote) {
                      toast.error("Select a valid service");
                      return;
                    }
                    bulkMutation.mutate({
                      action: "set_shipping_service",
                      shipment_ids: selectedIdsArray,
                      payload: {
                        service: bulkService,
                        price_cents: serviceQuote.price_cents,
                      },
                    });
                  }}
                >
                  Set service
                </Button>
                <Button
                  variant="outline"
                  disabled={bulkMutation.isPending}
                  onClick={() => {
                    const selection = readyShipments.filter(
                      (shipment) => selectedIds[shipment.id],
                    );
                    const cheapestSelections = selection
                      .map((shipment) => {
                        const quotes = quotesByShipment.get(shipment.id) ?? [];
                        const cheapest = quotes.reduce<QuoteItem | null>(
                          (acc, quote) => {
                            if (!acc || quote.price_cents < acc.price_cents) {
                              return quote;
                            }
                            return acc;
                          },
                          null,
                        );
                        return cheapest
                          ? { shipmentId: shipment.id, quote: cheapest }
                          : null;
                      })
                      .filter(Boolean) as Array<{
                      shipmentId: string;
                      quote: QuoteItem;
                    }>;

                    const grouped = cheapestSelections.reduce<
                      Record<string, { price: number; ids: string[] }>
                    >((acc, entry) => {
                      const key = entry.quote.service;
                      if (!acc[key]) {
                        acc[key] = { price: entry.quote.price_cents, ids: [] };
                      }
                      acc[key].ids.push(entry.shipmentId);
                      return acc;
                    }, {});

                    Object.entries(grouped).forEach(([service, data]) => {
                      bulkMutation.mutate({
                        action: "set_shipping_service",
                        shipment_ids: data.ids,
                        payload: {
                          service,
                          price_cents: data.price,
                        },
                      });
                    });
                  }}
                >
                  Cheapest available
                </Button>
                <Button variant="ghost" onClick={clear}>
                  Clear
                </Button>
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border">
            <div className="w-full min-w-0 max-w-full overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          allVisibleSelected
                            ? true
                            : someVisibleSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={(checked) => {
                          const shouldSelect = checked === true;
                          setMany(visibleIds, shouldSelect);
                        }}
                        aria-label="Select all shipments"
                      />
                    </TableHead>
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
                        {Array.from({ length: 7 }).map((__, cellIndex) => (
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
                        colSpan={7}
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
                            <Checkbox
                              checked={Boolean(selectedIds[shipment.id])}
                              onCheckedChange={() => toggle(shipment.id)}
                              aria-label={`Select shipment ${shipment.id}`}
                            />
                          </TableCell>
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
