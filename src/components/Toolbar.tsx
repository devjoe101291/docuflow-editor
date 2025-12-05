import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MousePointer,
  Type,
  Pen,
  Square,
  Circle,
  Eraser,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Undo,
  Redo,
  Trash2,
  Edit3,
} from "lucide-react";
import { Tool } from "./PDFEditor";
import { ThemeToggle } from "./ThemeToggle";

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  color: string;
  onColorChange: (color: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  fontFamily: string;
  onFontFamilyChange: (family: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onExport: () => void;
  onBack: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const tools: { type: Tool; icon: any; label: string }[] = [
  { type: "select", icon: MousePointer, label: "Select" },
  { type: "edit-text", icon: Edit3, label: "Edit Text" },
  { type: "text", icon: Type, label: "Add Text" },
  { type: "draw", icon: Pen, label: "Draw" },
  { type: "rectangle", icon: Square, label: "Rectangle" },
  { type: "circle", icon: Circle, label: "Circle" },
  { type: "eraser", icon: Eraser, label: "Eraser" },
];

const colors = [
  { value: "#000000", name: "Black" },
  { value: "#FFFFFF", name: "White" },
  { value: "#00D9FF", name: "Cyan" },
  { value: "#B565FF", name: "Purple" },
  { value: "#00FF85", name: "Green" },
  { value: "#FF3366", name: "Red" },
  { value: "#FFD700", name: "Gold" },
];

const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64];
const fontFamilies = ["Arial", "Times New Roman", "Courier New", "Georgia", "Verdana", "Helvetica"];

export const Toolbar = ({
  tool,
  onToolChange,
  color,
  onColorChange,
  fontSize,
  onFontSizeChange,
  fontFamily,
  onFontFamilyChange,
  onUndo,
  onRedo,
  onDelete,
  onExport,
  onBack,
  currentPage,
  totalPages,
  onPageChange,
}: ToolbarProps) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-card/80 backdrop-blur-md border-b border-border/50 shadow-lg flex-wrap gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          className="hover:shadow-glow hover:border-primary/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {tools.map(({ type, icon: Icon, label }) => (
            <Button
              key={type}
              variant={tool === type ? "default" : "ghost"}
              size="icon"
              onClick={() => onToolChange(type)}
              title={label}
              className={
                tool === type
                  ? "bg-gradient-primary shadow-glow"
                  : "hover:bg-muted"
              }
            >
              <Icon className="w-5 h-5" />
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            title="Delete (Del)"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {colors.map((c) => (
            <button
              key={c.value}
              onClick={() => onColorChange(c.value)}
              title={c.name}
              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                color === c.value
                  ? "border-foreground ring-2 ring-primary shadow-glow"
                  : "border-muted-foreground/50"
              } ${c.value === "#FFFFFF" ? "border-muted-foreground" : ""}`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Select value={fontSize.toString()} onValueChange={(v) => onFontSizeChange(Number(v))}>
            <SelectTrigger className="w-20 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={fontFamily} onValueChange={onFontFamilyChange}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fontFamilies.map((family) => (
                <SelectItem key={family} value={family}>
                  {family}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <ThemeToggle />

        <Button
          onClick={onExport}
          className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
        >
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>
    </div>
  );
};
