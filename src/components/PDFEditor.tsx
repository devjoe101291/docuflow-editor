import { useState, useRef, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
import { Toolbar } from "./Toolbar";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFEditorProps {
  file: File;
  onBack: () => void;
}

export type Tool = "select" | "text" | "highlight" | "draw" | "rectangle" | "circle";

interface Annotation {
  type: Tool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  page: number;
}

export const PDFEditor = ({ file, onBack }: PDFEditorProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#00D9FF");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === "select") return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });

    if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        setAnnotations([
          ...annotations,
          { type: "text", x, y, text, color, page: currentPage },
        ]);
      }
      setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === "select" || tool === "text") return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    if (tool === "draw") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      setStartPos({ x, y });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === "highlight" || tool === "rectangle" || tool === "circle") {
      const width = x - startPos.x;
      const height = y - startPos.y;

      setAnnotations([
        ...annotations,
        {
          type: tool,
          x: startPos.x,
          y: startPos.y,
          width,
          height,
          color,
          page: currentPage,
        },
      ]);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.fillStyle = color + "40";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        if (tool === "circle") {
          const radius = Math.sqrt(width ** 2 + height ** 2) / 2;
          ctx.beginPath();
          ctx.arc(startPos.x + width / 2, startPos.y + height / 2, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(startPos.x, startPos.y, width, height);
          ctx.strokeRect(startPos.x, startPos.y, width, height);
        }
      }
    }

    setIsDrawing(false);
  };

  const handleExport = async () => {
    try {
      const existingPdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      toast({
        title: "Exporting PDF",
        description: "Your annotated PDF is being prepared...",
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edited_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success!",
        description: "Your PDF has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your PDF.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and redraw annotations for current page
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations
      .filter((ann) => ann.page === currentPage)
      .forEach((ann) => {
        ctx.fillStyle = ann.color + "40";
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 2;

        if (ann.type === "text" && ann.text) {
          ctx.fillStyle = ann.color;
          ctx.font = "16px Arial";
          ctx.fillText(ann.text, ann.x, ann.y);
        } else if (ann.type === "circle" && ann.width && ann.height) {
          const radius = Math.sqrt(ann.width ** 2 + ann.height ** 2) / 2;
          ctx.beginPath();
          ctx.arc(ann.x + ann.width / 2, ann.y + ann.height / 2, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if ((ann.type === "highlight" || ann.type === "rectangle") && ann.width && ann.height) {
          ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
          ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        }
      });
  }, [annotations, currentPage]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Toolbar
        tool={tool}
        onToolChange={setTool}
        color={color}
        onColorChange={setColor}
        onExport={handleExport}
        onBack={onBack}
        currentPage={currentPage}
        totalPages={numPages}
        onPageChange={setCurrentPage}
      />

      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/30 p-8">
        <div className="flex justify-center">
          <div className="relative inline-block shadow-glow rounded-lg overflow-hidden">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-96 bg-card">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-2xl"
              />
            </Document>
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 cursor-crosshair"
              width={595}
              height={842}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{ pointerEvents: tool === "select" ? "none" : "auto" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
