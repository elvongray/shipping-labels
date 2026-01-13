import { useParams } from "@tanstack/react-router";

export default function SuccessPage() {
  const { importId } = useParams({ from: "/success/$importId" });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Purchase Complete</h1>
      <p className="mt-2 text-sm text-muted-foreground">Import: {importId}</p>
    </div>
  );
}
