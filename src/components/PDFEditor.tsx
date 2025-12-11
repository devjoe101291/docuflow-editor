import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
}

interface TextEdit {
  original: TextItem;
  newText: string;
  pageNum: number;
}

export type Tool = "select" | "text" | "draw" | "rectangle" | "circle" | "eraser" | "edit-text";

export const PDFEditor = ({ file, onBack }: PDFEditorProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 });
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState("#000000");
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loadError, setLoadError] = useState<string>("");
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [editingText, setEditingText] = useState<TextItem | null>(null);
  const [editValue, setEditValue] = useState("");
  const [textEdits, setTextEdits] = useState<Map<number, TextEdit[]>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ states: string[]; currentIndex: number }>({ states: [], currentIndex: -1 });
  const pageAnnotationsRef = useRef<Map<number, string>>(new Map());
  const pdfDocRef = useRef<any>(null);
  const { toast } = useToast();

  // Create object URL for the PDF file
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Load PDF document for text extraction
  useEffect(() => {
    const loadPdfDoc = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        pdfDocRef.current = pdf;
        // Trigger text extraction after PDF loads
        if (pageSize.width > 0) {
          extractTextFromPage(currentPage);
        }
      } catch (error) {
        console.error("Error loading PDF for text extraction:", error);
      }
    };
    loadPdfDoc();
  }, [file]);

  const extractTextFromPage = async (pageNum: number) => {
    if (!pdfDocRef.current) return;
    
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: pageSize.width / page.getViewport({ scale: 1 }).width });
      
      const items: TextItem[] = textContent.items
        .filter((item: any) => item.str && item.str.trim())
        .map((item: any) => {
          const tx = pdfjs.Util.transform(viewport.transform, item.transform);
          const fontSize = Math.abs(item.transform[0]) * (pageSize.width / page.getViewport({ scale: 1 }).width);
          return {
            str: item.str,
            x: tx[4],
            y: pageSize.height - tx[5],
            width: item.width * (pageSize.width / page.getViewport({ scale: 1 }).width),
            height: fontSize * 1.2,
            fontSize: fontSize,
            fontFamily: item.fontName || 'Helvetica',
          };
        });
      
      setTextItems(items);
    } catch (error) {
      console.error("Error extracting text:", error);
    }
  };

  // Extract text items when page changes
  useEffect(() => {
    if (pageSize.width > 0 && pdfDocRef.current) {
      extractTextFromPage(currentPage);
    }
  }, [currentPage, pageSize]);

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

  const handleTextClick = (item: TextItem) => {
    if (tool !== "edit-text") return;
    
    // Check if this text was already edited
    const pageEdits = textEdits.get(currentPage) || [];
    const existingEdit = pageEdits.find(
      e => e.original.x === item.x && e.original.y === item.y
    );
    
    setEditingText(item);
    setEditValue(existingEdit ? existingEdit.newText : item.str);
  };

  const handleTextEditSave = () => {
    if (!editingText) return;
    
    const edit: TextEdit = {
      original: editingText,
      newText: editValue,
      pageNum: currentPage,
    };
    
    setTextEdits(prev => {
      const newMap = new Map(prev);
      const pageEdits = newMap.get(currentPage) || [];
      const existingIndex = pageEdits.findIndex(
        e => e.original.x === editingText.x && e.original.y === editingText.y
      );
      
      if (existingIndex >= 0) {
        pageEdits[existingIndex] = edit;
      } else {
        pageEdits.push(edit);
      }
      
      newMap.set(currentPage, pageEdits);
      return newMap;
    });
    
    setEditingText(null);
    setEditValue("");
    toast({ title: "Text updated", description: "Click Export to save changes" });
  };

  const handleTextEditCancel = () => {
    setEditingText(null);
    setEditValue("");
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
      // Save current page annotations first
      if (fabricCanvasRef.current) {
        const currentState = JSON.stringify(fabricCanvasRef.current.toJSON());
        pageAnnotationsRef.current.set(currentPage, currentState);
      }

      const existingPdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      toast({
        title: "Exporting PDF",
        description: "Your edited PDF is being prepared...",
      });

      // Process text edits for each page
      for (const [pageNum, edits] of textEdits.entries()) {
        const page = pdfDoc.getPage(pageNum - 1);
        const { width: pdfWidth, height: pdfHeight } = page.getSize();
        const scaleX = pdfWidth / pageSize.width;
        const scaleY = pdfHeight / pageSize.height;

        for (const edit of edits) {
          // Draw white rectangle to cover original text
          const rectX = edit.original.x * scaleX;
          const rectY = pdfHeight - (edit.original.y * scaleY) - (edit.original.height * scaleY);
          const rectWidth = Math.max(edit.original.width * scaleX, edit.newText.length * edit.original.fontSize * 0.6 * scaleX);
          const rectHeight = edit.original.height * scaleY * 1.2;

          page.drawRectangle({
            x: rectX - 2,
            y: rectY - 2,
            width: rectWidth + 4,
            height: rectHeight + 4,
            color: rgb(1, 1, 1),
          });

          // Draw new text
          const textSize = edit.original.fontSize * scaleX;
          page.drawText(edit.newText, {
            x: rectX,
            y: rectY + 2,
            size: textSize,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        }
      }

      // Process canvas annotations for each page
      const annotationEntries = Array.from(pageAnnotationsRef.current.entries());
      
      for (const [pageNum, annotationJson] of annotationEntries) {
        const page = pdfDoc.getPage(pageNum - 1);
        const { width: pdfWidth, height: pdfHeight } = page.getSize();
        
        const parsed = JSON.parse(annotationJson);
        if (!parsed.objects || parsed.objects.length === 0) {
          continue;
        }
        
        const scaleX = pdfWidth / pageSize.width;
        const scaleY = pdfHeight / pageSize.height;
        
        const tempCanvas = document.createElement('canvas');
        const scale = 2;
        tempCanvas.width = pdfWidth * scale;
        tempCanvas.height = pdfHeight * scale;
        
        const tempFabricCanvas = new FabricCanvas(tempCanvas, {
          backgroundColor: 'transparent',
          width: pdfWidth * scale,
          height: pdfHeight * scale,
        });
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const scaledObjects = parsed.objects.map((obj: any) => {
          const scaled: any = { ...obj };
          scaled.left = (obj.left || 0) * scaleX * scale;
          scaled.top = (obj.top || 0) * scaleY * scale;
          
          if (obj.type === 'path' && obj.path) {
            scaled.path = obj.path.map((cmd: any[]) => {
              return cmd.map((val, idx) => {
                if (idx === 0) return val;
                return typeof val === 'number' ? val * scaleX * scale : val;
              });
            });
            scaled.scaleX = 1;
            scaled.scaleY = 1;
            scaled.strokeWidth = (obj.strokeWidth || 1) * scale;
          } else {
            scaled.scaleX = (obj.scaleX || 1) * scaleX * scale;
            scaled.scaleY = (obj.scaleY || 1) * scaleY * scale;
            scaled.strokeWidth = (obj.strokeWidth || 1) * scale;
            
            if (obj.type === 'i-text' || obj.type === 'text') {
              scaled.fontSize = (obj.fontSize || 16) * scaleX * scale;
              scaled.scaleX = 1;
              scaled.scaleY = 1;
            }
          }
          
          return scaled;
        });
        
        const scaledJson = { ...parsed, objects: scaledObjects };
        
        await new Promise<void>((resolve) => {
          tempFabricCanvas.loadFromJSON(JSON.stringify(scaledJson), () => {
            tempFabricCanvas.renderAll();
            resolve();
          });
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));

        const dataUrl = tempFabricCanvas.toDataURL({
          format: 'png',
          multiplier: 1,
        });

        const base64Data = dataUrl.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const pngImage = await pdfDoc.embedPng(imageBytes);
        
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: pdfWidth,
          height: pdfHeight,
        });
        
        tempFabricCanvas.dispose();
      }

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
      console.error("Export error:", error);
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

  // Get edited text display value
  const getDisplayText = (item: TextItem) => {
    const pageEdits = textEdits.get(currentPage) || [];
    const edit = pageEdits.find(e => e.original.x === item.x && e.original.y === item.y);
    return edit ? edit.newText : item.str;
  };

  const isTextEdited = (item: TextItem) => {
    const pageEdits = textEdits.get(currentPage) || [];
    return pageEdits.some(e => e.original.x === item.x && e.original.y === item.y);
  };

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
            <div 
              className="relative shadow-glow rounded-lg overflow-hidden"
              style={{ width: pageSize.width, height: pageSize.height }}
            >
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
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-2xl"
                    onLoadSuccess={onPageLoadSuccess}
                  />
                </Document>
              )}
              
              {/* Text edit overlay - clickable text items */}
              {tool === "edit-text" && (
                <div 
                  className="absolute top-0 left-0 z-30"
                  style={{ width: pageSize.width, height: pageSize.height }}
                >
                  {textItems.length === 0 && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-100 p-4 rounded shadow">
                      Loading text elements...
                    </div>
                  )}
                  {textItems.map((item, index) => {
                    const isEditing = editingText && editingText.x === item.x && editingText.y === item.y;
                    const edited = isTextEdited(item);
                    
                    if (isEditing) {
                      return (
                        <input
                          key={index}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleTextEditSave}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTextEditSave();
                            if (e.key === 'Escape') handleTextEditCancel();
                          }}
                          autoFocus
                          className="absolute bg-white border-2 border-blue-500 outline-none px-1"
                          style={{
                            left: item.x,
                            top: item.y - 2,
                            fontSize: item.fontSize,
                            fontFamily: 'Arial, sans-serif',
                            color: '#000',
                            minWidth: Math.max(item.width, 100),
                            height: item.height + 6,
                          }}
                        />
                      );
                    }
                    
                    return (
                      <div
                        key={index}
                        className={`absolute cursor-text transition-all ${
                          edited 
                            ? "bg-yellow-200 border border-yellow-500" 
                            : "bg-blue-100/50 hover:bg-blue-200/80 border border-transparent hover:border-blue-400"
                        }`}
                        style={{
                          left: item.x,
                          top: item.y - 2,
                          minWidth: Math.max(item.width, 20),
                          height: item.height + 4,
                          fontSize: item.fontSize,
                          fontFamily: 'Arial, sans-serif',
                          color: '#000',
                          lineHeight: `${item.height}px`,
                          padding: '2px 4px',
                        }}
                        onClick={() => handleTextClick(item)}
                      >
                        {edited ? getDisplayText(item) : item.str}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Edited text display overlay */}
              {tool !== "edit-text" && (
                <div 
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{ width: pageSize.width, height: pageSize.height }}
                >
                  {(textEdits.get(currentPage) || []).map((edit, index) => (
                    <div
                      key={index}
                      className="absolute bg-white px-1"
                      style={{
                        left: edit.original.x,
                        top: edit.original.y,
                        fontSize: edit.original.fontSize,
                        fontFamily: edit.original.fontFamily,
                        color: '#000',
                        lineHeight: `${edit.original.height}px`,
                      }}
                    >
                      {edit.newText}
                    </div>
                  ))}
                </div>
              )}

              <div 
                className={`absolute top-0 left-0 z-10 ${tool === "edit-text" ? "pointer-events-none" : ""}`}
                style={{ width: pageSize.width, height: pageSize.height }}
              >
                <canvas
                  ref={canvasRef}
                  style={{ 
                    cursor: tool === "select" ? "default" : tool === "edit-text" ? "text" : "crosshair",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
