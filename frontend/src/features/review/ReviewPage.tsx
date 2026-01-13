import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { getImport, listShipments } from "@/api/endpoints";
import { ApiClientError } from "@/api/errors";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
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
    queryKey: ["shipments", importId, { status: "ALL", search: "", page: 1 }],
    queryFn: () => listShipments(importId),
    enabled: Boolean(importId),
    refetchInterval: () => {
      if (!importJob) return false;
      const shouldPoll =
        importJob.status === "PENDING" || importJob.status === "PROCESSING";
      return shouldPoll ? 4000 : false;
    },
  });

  const shipments = shipmentsQuery.data?.results ?? [];

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
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
