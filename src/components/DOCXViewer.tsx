import { useState, useEffect } from "react";
import mammoth from "mammoth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DOCXViewerProps {
  file: File;
  onBack: () => void;
}

export const DOCXViewer = ({ file, onBack }: DOCXViewerProps) => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadDocx = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setContent(result.value);
        setLoading(false);
      } catch (error) {
        toast({
          title: "Error loading DOCX",
          description: "Failed to load the document. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    loadDocx();
  }, [file, toast]);

  const handleDownload = () => {
    const blob = new Blob([file], { type: file.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "Your document has been downloaded.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-card/80 backdrop-blur-md border-b border-border/50 shadow-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="hover:shadow-glow hover:border-primary/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{file.name}</h2>
            <p className="text-sm text-muted-foreground">DOCX Document</p>
          </div>
        </div>
        <Button
          onClick={handleDownload}
          className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>

      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto bg-card rounded-xl shadow-glow border border-border/50 p-12">
          <div
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Note: This is a preview of your DOCX document.</p>
          <p>Full editing capabilities are available for PDF files.</p>
        </div>
      </div>
    </div>
  );
};
