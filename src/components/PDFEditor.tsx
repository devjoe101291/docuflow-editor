import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
import { Toolbar } from "./Toolbar";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Canvas as FabricCanvas, IText, Rect, Circle, PencilBrush } from "fabric";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFEditorProps {
  file: File;
  onBack: () => void;
}

export type Tool = "select" | "text" | "draw" | "rectangle" | "circle" | "eraser";

export const PDFEditor = ({ file, onBack }: PDFEditorProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 });
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#00D9FF");
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ states: string[]; currentIndex: number }>({ states: [], currentIndex: -1 });
  const pageAnnotationsRef = useRef<Map<number, string>>(new Map());
  const { toast } = useToast();

  // Create object URL for the PDF file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoadError("");
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setLoadError("Failed to load PDF. Please try a different file.");
    toast({
      title: "Error loading PDF",
      description: error.message,
      variant: "destructive",
    });
  };

  const onPageLoadSuccess = (page: any) => {
    const { width, height } = page;
    setPageSize({ width, height });
  };

  const saveHistory = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const json = JSON.stringify(fabricCanvasRef.current.toJSON());
    const { states, currentIndex } = historyRef.current;
    const newStates = states.slice(0, currentIndex + 1);
    newStates.push(json);
    historyRef.current = { states: newStates, currentIndex: newStates.length - 1 };
  }, []);

  const handleUndo = useCallback(() => {
    const { states, currentIndex } = historyRef.current;
    if (currentIndex > 0 && fabricCanvasRef.current) {
      const newIndex = currentIndex - 1;
      fabricCanvasRef.current.loadFromJSON(states[newIndex], () => {
        fabricCanvasRef.current?.renderAll();
        historyRef.current.currentIndex = newIndex;
      });
    }
  }, []);

  const handleRedo = useCallback(() => {
    const { states, currentIndex } = historyRef.current;
    if (currentIndex < states.length - 1 && fabricCanvasRef.current) {
      const newIndex = currentIndex + 1;
      fabricCanvasRef.current.loadFromJSON(states[newIndex], () => {
        fabricCanvasRef.current?.renderAll();
        historyRef.current.currentIndex = newIndex;
      });
    }
  }, []);

  const handleToolChange = useCallback((newTool: Tool) => {
    setTool(newTool);
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    
    if (newTool === "draw") {
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.color = color;
      brush.width = 3;
      canvas.freeDrawingBrush = brush;
    } else if (newTool === "eraser") {
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.color = "#FFFFFF";
      brush.width = 20;
      canvas.freeDrawingBrush = brush;
    } else {
      canvas.isDrawingMode = false;
      
      if (newTool === "text") {
        const text = new IText("Click to edit text", {
          left: 100,
          top: 100,
          fill: color,
          fontSize: fontSize,
          fontFamily: fontFamily,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        saveHistory();
      } else if (newTool === "rectangle") {
        const rect = new Rect({
          left: 100,
          top: 100,
          fill: color + "40",
          stroke: color,
          strokeWidth: 2,
          width: 100,
          height: 100,
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
        saveHistory();
      } else if (newTool === "circle") {
        const circle = new Circle({
          left: 100,
          top: 100,
          fill: color + "40",
          stroke: color,
          strokeWidth: 2,
          radius: 50,
        });
        canvas.add(circle);
        canvas.setActiveObject(circle);
        saveHistory();
      }
    }
  }, [color, fontSize, fontFamily, saveHistory]);

  const handleColorChange = useCallback((newColor: string) => {
    setColor(newColor);
    if (!fabricCanvasRef.current) return;
    
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject) {
      if (activeObject.type === "i-text" || activeObject.type === "text") {
        activeObject.set("fill", newColor);
      } else {
        activeObject.set("stroke", newColor);
        activeObject.set("fill", newColor + "40");
      }
      fabricCanvasRef.current.renderAll();
      saveHistory();
    }
  }, [saveHistory]);

  const handleFontSizeChange = useCallback((size: number) => {
    setFontSize(size);
    if (!fabricCanvasRef.current) return;
    
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject && (activeObject.type === "i-text" || activeObject.type === "text")) {
      activeObject.set("fontSize", size);
      fabricCanvasRef.current.renderAll();
      saveHistory();
    }
  }, [saveHistory]);

  const handleFontFamilyChange = useCallback((family: string) => {
    setFontFamily(family);
    if (!fabricCanvasRef.current) return;
    
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject && (activeObject.type === "i-text" || activeObject.type === "text")) {
      activeObject.set("fontFamily", family);
      fabricCanvasRef.current.renderAll();
      saveHistory();
    }
  }, [saveHistory]);

  const handleDeleteSelected = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    activeObjects.forEach(obj => fabricCanvasRef.current?.remove(obj));
    fabricCanvasRef.current.discardActiveObject();
    fabricCanvasRef.current.renderAll();
    saveHistory();
  }, [saveHistory]);

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

  // Initialize fabric canvas only once
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // If canvas already exists, don't recreate
    if (fabricCanvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: pageSize.width,
      height: pageSize.height,
      backgroundColor: "transparent",
      selection: true,
    });

    fabricCanvasRef.current = canvas;

    const handleHistorySave = () => {
      const json = JSON.stringify(canvas.toJSON());
      const { states, currentIndex } = historyRef.current;
      const newStates = states.slice(0, currentIndex + 1);
      newStates.push(json);
      historyRef.current = { states: newStates, currentIndex: newStates.length - 1 };
    };

    canvas.on("object:modified", handleHistorySave);
    canvas.on("object:added", handleHistorySave);
    canvas.on("path:created", handleHistorySave);
    
    // Initial history state
    handleHistorySave();

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  // Update canvas dimensions when page size changes
  useEffect(() => {
    if (fabricCanvasRef.current && pageSize.width > 0 && pageSize.height > 0) {
      fabricCanvasRef.current.setDimensions({ width: pageSize.width, height: pageSize.height });
      fabricCanvasRef.current.renderAll();
    }
  }, [pageSize]);

  // Save annotations when leaving a page
  const prevPageRef = useRef<number>(currentPage);
  
  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    
    // Save annotations for previous page before switching
    if (prevPageRef.current !== currentPage) {
      const currentState = JSON.stringify(fabricCanvasRef.current.toJSON());
      pageAnnotationsRef.current.set(prevPageRef.current, currentState);
      
      // Load annotations for new page
      const savedState = pageAnnotationsRef.current.get(currentPage);
      if (savedState) {
        fabricCanvasRef.current.loadFromJSON(savedState, () => {
          fabricCanvasRef.current?.renderAll();
        });
      } else {
        fabricCanvasRef.current.clear();
        fabricCanvasRef.current.backgroundColor = "transparent";
        fabricCanvasRef.current.renderAll();
      }
      
      // Reset history for new page
      historyRef.current = { states: [], currentIndex: -1 };
      saveHistory();
      
      prevPageRef.current = currentPage;
    }
  }, [currentPage, saveHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && fabricCanvasRef.current) {
        const activeObject = fabricCanvasRef.current.getActiveObject();
        if (activeObject && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleDeleteSelected]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Toolbar
        tool={tool}
        onToolChange={handleToolChange}
        color={color}
        onColorChange={handleColorChange}
        fontSize={fontSize}
        onFontSizeChange={handleFontSizeChange}
        fontFamily={fontFamily}
        onFontFamilyChange={handleFontFamilyChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDelete={handleDeleteSelected}
        onExport={handleExport}
        onBack={onBack}
        currentPage={currentPage}
        totalPages={numPages}
        onPageChange={setCurrentPage}
      />

      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/30 p-8">
        <div className="flex justify-center">
          {loadError ? (
            <div className="flex flex-col items-center justify-center h-96 bg-card rounded-lg p-8">
              <p className="text-destructive mb-4">{loadError}</p>
              <button 
                onClick={onBack}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              >
                Go Back
              </button>
            </div>
          ) : (
            <div className="relative inline-block shadow-glow rounded-lg overflow-hidden">
              {pdfUrl && (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex items-center justify-center h-96 bg-card" style={{ width: pageSize.width }}>
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  }
                >
                  <Page
                    pageNumber={currentPage}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    className="shadow-2xl"
                    onLoadSuccess={onPageLoadSuccess}
                  />
                </Document>
              )}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 pointer-events-auto"
                style={{ 
                  cursor: tool === "select" ? "default" : "crosshair",
                  width: pageSize.width,
                  height: pageSize.height,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
