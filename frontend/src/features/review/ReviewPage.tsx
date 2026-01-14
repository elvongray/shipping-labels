import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import {
  bulkShipments,
  deleteShipment,
  getImport,
  listShipments,
  patchShipment,
} from "@/api/endpoints";
import type { Shipment } from "@/api/types";
import { ApiClientError } from "@/api/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSelectionStore } from "@/stores/selection.store";
import { toast } from "sonner";
import EditAddressDialog from "@/features/review/components/EditAddressDialog";
import type { AddressFormValues } from "@/features/review/components/EditAddressDialog";
import EditPackageDialog from "@/features/review/components/EditPackageDialog";
import type { PackageFormValues } from "@/features/review/components/EditPackageDialog";
import ConfirmDialog from "@/features/common/ConfirmDialog";

export default function ReviewPage() {
  const { importId } = useParams({ from: "/review/$importId" });
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const [editAddressShipment, setEditAddressShipment] =
    useState<Shipment | null>(null);
  const [editAddressType, setEditAddressType] = useState<"from" | "to">("from");
  const [editPackageShipment, setEditPackageShipment] =
    useState<Shipment | null>(null);
  const [updateMessage, setUpdateMessage] = useState("Shipment updated");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const toggle = useSelectionStore((state) => state.toggle);
  const clear = useSelectionStore((state) => state.clear);
  const setMany = useSelectionStore((state) => state.setMany);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    clear();
  }, [importId, clear]);

  const importQuery = useQuery({
    queryKey: ["importJob", importId],
    queryFn: () => getImport(importId),
    enabled: !!importId,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (!data) return 1500;

      const status = String(data.status ?? "").toUpperCase();
      return status === "PENDING" || status === "PROCESSING" ? 1500 : false;
    },
    refetchIntervalInBackground: true,
  });

  const error =
    importQuery.error instanceof ApiClientError ? importQuery.error : null;
  const importJob = importQuery.data;
  const progressTotal = importJob?.progress_total ?? 0;
  const progressDone = importJob?.progress_done ?? 0;
  const progressValue =
    progressTotal > 0 ? Math.min(100, (progressDone / progressTotal) * 100) : 0;

  const shipmentsQuery = useQuery({
    queryKey: [
      "shipments",
      importId,
      { status: statusFilter, search: debouncedSearch, page, pageSize },
    ],
    queryFn: () =>
      listShipments(importId, {
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: debouncedSearch || undefined,
        page,
        page_size: pageSize,
      }),
    enabled: Boolean(importId),
    refetchInterval: () => {
      if (!importJob) return false;
      const status = importJob.status?.toUpperCase();
      const shouldPoll = status === "PENDING" || status === "PROCESSING";
      return shouldPoll ? 4000 : false;
    },
    refetchIntervalInBackground: true,
  });

  const shipments = shipmentsQuery.data?.results ?? [];
  const visibleIds = shipments.map((shipment) => shipment.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds[id]);
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds[id]) && !allVisibleSelected;
  const selectedCount = useMemo(
    () => Object.keys(selectedIds).length,
    [selectedIds],
  );
  const totalCount = shipmentsQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(totalCount, page * pageSize);
  const isFetchingShipments =
    shipmentsQuery.isFetching && !shipmentsQuery.isLoading;
  const pageOptions = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalPages; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  const formatAddress = (prefix: "from" | "to", shipment: Shipment) => {
    if (!shipment) return ["—"];
    const name = shipment[`${prefix}_name` as const];
    const company = shipment[`${prefix}_company` as const];
    const street1 = shipment[`${prefix}_street1` as const];
    const street2 = shipment[`${prefix}_street2` as const];
    const city = shipment[`${prefix}_city` as const];
    const state = shipment[`${prefix}_state` as const];
    const postal = shipment[`${prefix}_postal_code` as const];
    const country = shipment[`${prefix}_country` as const];

    const line1 = [name, company].filter(Boolean).join(" • ");
    const line2 = [street1, street2].filter(Boolean).join(", ");
    const line3 = [city, state, postal].filter(Boolean).join(" ");
    const line4 = country ?? "";
    const lines = [line1, line2, line3, line4].filter((line) => line.trim());

    return lines.length ? lines : ["—"];
  };

  const formatPackage = (shipment: Shipment) => {
    if (!shipment) return "—";
    const weight = shipment.weight_oz ?? null;
    const length = shipment.length_in ?? null;
    const width = shipment.width_in ?? null;
    const height = shipment.height_in ?? null;
    const weightLabel = weight ? `${weight} oz` : "";
    const dimsLabel =
      length && width && height ? `${length}x${width}x${height} in` : "";
    const label = [weightLabel, dimsLabel].filter(Boolean).join(" • ");
    return label || "—";
  };

  const statusVariant = (status?: string) => {
    switch (status) {
      case "READY":
        return "secondary";
      case "NEEDS_INFO":
        return "outline";
      case "INVALID":
        return "destructive";
      default:
        return "outline";
    }
  };

  const patchMutation = useMutation({
    mutationFn: ({
      shipmentId,
      payload,
    }: {
      shipmentId: string;
      payload: Partial<Shipment>;
    }) => patchShipment(shipmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments", importId] });
      toast.success(updateMessage);
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        return;
      }
      toast.error("Update failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => {
      if (ids.length === 1) {
        return deleteShipment(ids[0]);
      }
      return bulkShipments(importId, { action: "delete", shipment_ids: ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments", importId] });
      toast.success("Shipments deleted");
      clear();
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        return;
      }
      toast.error("Delete failed");
    },
  });

  const handleSaveAddress = (
    values: AddressFormValues,
    type: "from" | "to",
  ) => {
    if (!editAddressShipment) return;
    setUpdateMessage(
      type === "from" ? "Ship-from address updated" : "Ship-to address updated",
    );
    const prefix = type === "from" ? "from" : "to";
    const payload: Record<string, string | null> = {
      [`${prefix}_name`]: values.name || null,
      [`${prefix}_company`]: values.company || null,
      [`${prefix}_street1`]: values.street1 || null,
      [`${prefix}_street2`]: values.street2 || null,
      [`${prefix}_city`]: values.city || null,
      [`${prefix}_state`]: values.state || null,
      [`${prefix}_postal_code`]: values.postal_code || null,
      [`${prefix}_country`]: values.country || null,
    };
    patchMutation.mutate(
      { shipmentId: editAddressShipment.id, payload },
      {
        onSuccess: () => {
          setEditAddressShipment(null);
        },
      },
    );
  };

  const handleSavePackage = (values: PackageFormValues) => {
    if (!editPackageShipment) return;
    setUpdateMessage("Package updated");
    const parseNumber = (value: string) => {
      if (!value.trim()) return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };
    const pounds = parseNumber(values.weight_lb) ?? 0;
    const ounces = parseNumber(values.weight_oz) ?? 0;
    const totalOunces = pounds * 16 + ounces;
    const payload: Partial<Shipment> = {
      weight_oz: totalOunces || null,
      length_in: parseNumber(values.length_in),
      width_in: parseNumber(values.width_in),
      height_in: parseNumber(values.height_in),
    };
    patchMutation.mutate(
      { shipmentId: editPackageShipment.id, payload },
      {
        onSuccess: () => {
          setEditPackageShipment(null);
        },
      },
    );
  };

  const openDeleteConfirm = (ids: string[]) => {
    setPendingDeleteIds(ids);
    setConfirmDeleteOpen(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Review & Edit</h1>
      <p className="mt-2 text-sm text-muted-foreground">Import: {importId}</p>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Import status</CardTitle>
            <p className="text-sm text-muted-foreground">
              Live progress updates while processing.
            </p>
          </div>
          {importQuery.isLoading ? (
            <Spinner />
          ) : importJob ? (
            <Badge variant="outline">{importJob.status}</Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {importQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading status…</div>
          ) : error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              <div>{error.message}</div>
              {import.meta.env.DEV && error.requestId ? (
                <div className="mt-1 text-xs text-destructive/80">
                  Request ID: {error.requestId}
                </div>
              ) : null}
            </div>
          ) : importJob ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {progressDone} of {progressTotal} rows processed
                </span>
                <span>{Math.round(progressValue)}%</span>
              </div>
              <Progress value={progressValue} />
              {importJob.error_summary ? (
                <div className="text-sm text-destructive">
                  {importJob.error_summary}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Import not found.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Shipments</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review and edit shipments before selecting services.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="ALL">All</TabsTrigger>
                <TabsTrigger value="READY">Ready</TabsTrigger>
                <TabsTrigger value="NEEDS_INFO">Needs info</TabsTrigger>
                <TabsTrigger value="INVALID">Invalid</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex w-full max-w-sm items-center gap-2">
              <Input
                placeholder="Search by order #, name, or address"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          </div>
          {selectedCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <div>
                {selectedCount} selected
                {shipmentsQuery.isFetching ? " • Updating…" : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" disabled>
                  Apply address preset
                </Button>
                <Button variant="outline" disabled>
                  Apply package preset
                </Button>
                <Button variant="outline" disabled>
                  Verify addresses
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openDeleteConfirm(Object.keys(selectedIds))}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
                <Button variant="ghost" onClick={clear}>
                  Clear
                </Button>
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border">
            <Table>
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
                  <TableHead>Package Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Address Check</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipmentsQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      {Array.from({ length: 8 }).map((__, cellIndex) => (
                        <TableCell key={`skeleton-cell-${index}-${cellIndex}`}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : shipments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No shipments yet. Upload a CSV to begin processing.
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map((shipment) => (
                    <TableRow
                      key={shipment.id}
                      className={
                        shipment.validation_status === "READY"
                          ? "bg-primary/5"
                          : shipment.validation_status === "INVALID" ||
                              shipment.validation_status === "NEEDS_INFO"
                            ? "bg-destructive/5"
                            : undefined
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={Boolean(selectedIds[shipment.id])}
                          onCheckedChange={() => toggle(shipment.id)}
                          aria-label={`Select shipment ${shipment.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        {shipment.external_order_number?.trim()
                          ? shipment.external_order_number
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-0.5">
                          {formatAddress("from", shipment).map(
                            (line, index) => (
                              <div key={`from-${shipment.id}-${index}`}>
                                {line}
                              </div>
                            ),
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-0.5">
                          {formatAddress("to", shipment).map((line, index) => (
                            <div key={`to-${shipment.id}-${index}`}>{line}</div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatPackage(shipment)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={statusVariant(shipment.validation_status)}
                          >
                            {shipment.validation_status}
                          </Badge>
                          {shipment.validation_status !== "READY" ? (
                            <span className="text-xs text-muted-foreground">
                              Fix required
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {shipment.address_verification_status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditAddressShipment(shipment);
                              setEditAddressType("from");
                            }}
                          >
                            Edit address
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditPackageShipment(shipment)}
                          >
                            Edit package
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteConfirm([shipment.id])}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              {isFetchingShipments ? "Updating list…" : null}
              {!isFetchingShipments && totalCount > 0
                ? `Showing ${startIndex}-${endIndex} of ${totalCount}`
                : null}
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((prev) => Math.max(1, prev - 1));
                    }}
                    aria-disabled={page <= 1}
                    className={
                      page <= 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
                {pageOptions.map((pageNumber) => (
                  <PaginationItem key={`page-${pageNumber}`}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === page}
                      onClick={(event) => {
                        event.preventDefault();
                        setPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      setPage((prev) => Math.min(totalPages, prev + 1));
                    }}
                    aria-disabled={page >= totalPages}
                    className={
                      page >= totalPages ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <EditAddressDialog
        open={Boolean(editAddressShipment)}
        shipment={editAddressShipment}
        addressType={editAddressType}
        onAddressTypeChange={setEditAddressType}
        onClose={() => setEditAddressShipment(null)}
        onSave={handleSaveAddress}
        isSaving={patchMutation.isPending}
      />
      <EditPackageDialog
        open={Boolean(editPackageShipment)}
        shipment={editPackageShipment}
        onClose={() => setEditPackageShipment(null)}
        onSave={handleSavePackage}
        isSaving={patchMutation.isPending}
      />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete shipments?"
        description="This will permanently remove the selected shipments."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setPendingDeleteIds([]);
        }}
        onConfirm={() => {
          deleteMutation.mutate(pendingDeleteIds, {
            onSettled: () => {
              setConfirmDeleteOpen(false);
              setPendingDeleteIds([]);
            },
          });
        }}
      />
    </div>
  );
}
