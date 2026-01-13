import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { uploadImport } from "@/api/endpoints";
import { ApiClientError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: uploadImport,
    onSuccess: (data) => {
      toast.success("Upload started", {
        description: import.meta.env.DEV ? `Import ID: ${data.id}` : undefined,
      });
      navigate({ to: `/review/${data.id}` });
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        toast.error(error.message, {
          description:
            import.meta.env.DEV && error.requestId
              ? `Request ID: ${error.requestId}`
              : undefined,
        });
        return;
      }
      toast.error("Upload failed");
    },
  });

  const errorMessage = useMemo(() => {
    const error = uploadMutation.error;
    if (!error) return null;
    if (error instanceof ApiClientError) {
      return {
        message: error.message,
        requestId: error.requestId,
      };
    }
    return { message: "Upload failed", requestId: undefined };
  }, [uploadMutation.error]);

  const handleFile = (nextFile?: File | null) => {
    setFile(nextFile ?? null);
  };

  const handleUpload = () => {
    if (!file || uploadMutation.isPending) return;
    uploadMutation.mutate(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload your CSV</CardTitle>
          <p className="text-sm text-muted-foreground">
            Import shipments from a CSV file to start the label workflow.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition ${
              isDragging ? "border-primary bg-primary/5" : "border-muted"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              const droppedFile = event.dataTransfer.files?.[0];
              if (droppedFile) handleFile(droppedFile);
            }}
          >
            <p className="text-sm font-medium">Drag & drop your CSV here</p>
            <p className="text-xs text-muted-foreground">
              or choose a file from your computer
            </p>
            <div>
              <Input
                type="file"
                accept=".csv"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </div>
            {file ? (
              <p className="text-xs text-muted-foreground">
                Selected: {file.name}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleUpload}
              disabled={!file || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Uploading
                </span>
              ) : (
                "Start upload"
              )}
            </Button>
            <a
              className="text-sm font-medium text-primary hover:text-primary/80"
              href="/template.csv"
            >
              Download CSV template
            </a>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <div>{errorMessage.message}</div>
              {import.meta.env.DEV && errorMessage.requestId ? (
                <div className="text-xs text-destructive/80">
                  Request ID: {errorMessage.requestId}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
