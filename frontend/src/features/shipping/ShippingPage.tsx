import { useParams } from "@tanstack/react-router";

export default function ShippingPage() {
  const { importId } = useParams({ from: "/shipping/$importId" });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Select Shipping</h1>
      <p className="mt-2 text-sm text-muted-foreground">Import: {importId}</p>
    </div>
  );
}
