import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { getImport, listShipments } from "@/api/endpoints";
import { ApiClientError } from "@/api/errors";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function ReviewPage() {
  const { importId } = useParams({ from: "/review/$importId" });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 30;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedSearch]);

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
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Order #</TableHead>
                  <TableHead>Ship From</TableHead>
                  <TableHead>Ship To</TableHead>
                  <TableHead>Package</TableHead>
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
                    <TableRow key={shipment.id}>
                      <TableCell />
                      <TableCell>
                        {shipment.external_order_number?.trim()
                          ? shipment.external_order_number
                          : "—"}
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>{shipment.validation_status}</TableCell>
                      <TableCell>
                        {shipment.address_verification_status}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        Edit
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
    </div>
  );
}
