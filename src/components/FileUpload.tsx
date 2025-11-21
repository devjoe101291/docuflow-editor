import { Upload, FileText } from "lucide-react";
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload = ({ onFileSelect }: FileUploadProps) => {
  const { toast } = useToast();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (!file) return;

      const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or DOCX file.",
          variant: "destructive",
        });
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect, toast]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative w-full max-w-2xl"
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.docx"
          onChange={handleFileInput}
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-full h-96 border-2 border-dashed border-primary/30 rounded-2xl cursor-pointer bg-card/30 backdrop-blur-sm hover:bg-card/50 hover:border-primary/50 transition-all hover:shadow-glow group"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 animate-float">
            <Upload className="w-16 h-16 mb-4 text-primary group-hover:text-secondary transition-colors" />
            <p className="mb-2 text-xl font-semibold text-foreground">
              Drop your file here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse
            </p>
            <div className="flex gap-4 mt-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">PDF</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/10 border border-secondary/30">
                <FileText className="w-5 h-5 text-secondary" />
                <span className="text-sm font-medium">DOCX</span>
              </div>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
};
