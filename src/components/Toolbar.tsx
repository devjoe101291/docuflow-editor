import { Button } from "@/components/ui/button";
import {
  MousePointer,
  Type,
  Highlighter,
  Pen,
  Square,
  Circle,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Tool } from "./PDFEditor";
import { ThemeToggle } from "./ThemeToggle";

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  color: string;
  onColorChange: (color: string) => void;
  onExport: () => void;
  onBack: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const tools: { type: Tool; icon: any; label: string }[] = [
  { type: "select", icon: MousePointer, label: "Select" },
  { type: "text", icon: Type, label: "Text" },
  { type: "highlight", icon: Highlighter, label: "Highlight" },
  { type: "draw", icon: Pen, label: "Draw" },
  { type: "rectangle", icon: Square, label: "Rectangle" },
  { type: "circle", icon: Circle, label: "Circle" },
];

const colors = [
  { value: "#00D9FF", name: "Cyan" },
  { value: "#B565FF", name: "Purple" },
  { value: "#00FF85", name: "Green" },
  { value: "#FF3366", name: "Red" },
  { value: "#FFD700", name: "Gold" },
];

export const Toolbar = ({
  tool,
  onToolChange,
  color,
  onColorChange,
  onExport,
  onBack,
  currentPage,
  totalPages,
  onPageChange,
}: ToolbarProps) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-card/80 backdrop-blur-md border-b border-border/50 shadow-lg">
      <div className="flex items-center gap-4">
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

        <div className="flex items-center gap-2">
          {colors.map((c) => (
            <button
              key={c.value}
              onClick={() => onColorChange(c.value)}
              title={c.name}
              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                color === c.value
                  ? "border-foreground ring-2 ring-primary shadow-glow"
                  : "border-border/50"
              }`}
              style={{ backgroundColor: c.value }}
            />
          ))}
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
