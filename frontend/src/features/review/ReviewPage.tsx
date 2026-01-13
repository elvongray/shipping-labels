import { useParams } from "@tanstack/react-router";

export default function ReviewPage() {
  const { importId } = useParams({ from: "/review/$importId" });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Review & Edit</h1>
      <p className="mt-2 text-sm text-muted-foreground">Import: {importId}</p>
    </div>
  );
}
