// @ts-nocheck

import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { getImport } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuccessPage() {
  const { importId } = useParams({ from: "/success/$importId" });
  const search = useSearch({ from: "/success/$importId" });
  const purchaseId = search.purchaseId as string | undefined;
  const labelUrl = search.labelUrl as string | undefined;
  const purchasedCount = Number(search.purchasedCount ?? 0);
  const skippedCount = Number(search.skippedCount ?? 0);

  const importQuery = useQuery({
    queryKey: ["importJob", importId],
    queryFn: () => getImport(importId),
  });

  const readyCount = importQuery.data?.ready_count ?? 0;
  const displayCount = purchasedCount || readyCount;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Success! Labels created.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Import: {importId}</p>
      </div>

      <Card className="w-full max-w-full">
        <CardHeader>
          <CardTitle>Purchase summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Labels created</p>
              <p className="text-lg font-semibold">{displayCount}</p>
            </div>
            {purchaseId ? (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Purchase ID</p>
                <p className="text-sm font-medium">{purchaseId}</p>
              </div>
            ) : null}
          </div>

          {skippedCount > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {skippedCount} shipment(s) were not eligible and can be fixed in
              Review.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {labelUrl ? (
              <Button asChild>
                <a href={labelUrl} target="_blank" rel="noreferrer">
                  Download labels
                </a>
              </Button>
            ) : (
              <Button disabled>Download labels</Button>
            )}
            <Button asChild variant="outline">
              <Link to="/upload">Start new upload</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to={`/review/${importId}`}>Back to review</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
