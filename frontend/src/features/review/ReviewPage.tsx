import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { getImport } from "@/api/endpoints";
import { ApiClientError } from "@/api/errors";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

export default function ReviewPage() {
  const { importId } = useParams({ from: "/review/$importId" });
  const importQuery = useQuery({
    queryKey: ["importJob", importId],
    queryFn: () => getImport(importId),
    refetchInterval: (data) => {
      if (!data) return 1500;
      return data.status === "PENDING" || data.status === "PROCESSING"
        ? 1500
        : false;
    },
  });

  const error =
    importQuery.error instanceof ApiClientError ? importQuery.error : null;
  const importJob = importQuery.data;
  const progressTotal = importJob?.progress_total ?? 0;
  const progressDone = importJob?.progress_done ?? 0;
  const progressValue =
    progressTotal > 0 ? Math.min(100, (progressDone / progressTotal) * 100) : 0;

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
    </div>
  );
}
