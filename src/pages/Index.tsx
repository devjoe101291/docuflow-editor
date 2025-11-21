import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { PDFEditor } from "@/components/PDFEditor";
import { DOCXViewer } from "@/components/DOCXViewer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FileText, Zap } from "lucide-react";

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"pdf" | "docx" | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    
    if (file.type === "application/pdf") {
      setFileType("pdf");
    } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      setFileType("docx");
    }
  };

  const handleBack = () => {
    setSelectedFile(null);
    setFileType(null);
  };

  if (selectedFile && fileType === "pdf") {
    return <PDFEditor file={selectedFile} onBack={handleBack} />;
  }

  if (selectedFile && fileType === "docx") {
    return <DOCXViewer file={selectedFile} onBack={handleBack} />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-glow animation-delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl animate-pulse-glow animation-delay-2000" />
      </div>

      <div className="relative z-10">
        <header className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                DocuEdit
              </h1>
              <p className="text-xs text-muted-foreground">Futuristic Document Editor</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="container mx-auto px-8">
          <div className="text-center mb-12 mt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full mb-6 animate-float">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Powered by AI</span>
            </div>
            <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Edit Documents Like Never Before
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload your PDF or DOCX files and start editing with our advanced annotation tools
            </p>
          </div>

          <FileUpload onFileSelect={handleFileSelect} />

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-12">
            <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:border-primary/50 transition-all hover:shadow-glow group">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">PDF Annotations</h3>
              <p className="text-sm text-muted-foreground">
                Add text, highlights, shapes, and drawings to your PDF documents
              </p>
            </div>

            <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:border-secondary/50 transition-all hover:shadow-glow group">
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Detection</h3>
              <p className="text-sm text-muted-foreground">
                Automatically detects file types and provides the right tools
              </p>
            </div>

            <div className="p-6 bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 hover:border-accent/50 transition-all hover:shadow-glow group">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">DOCX Preview</h3>
              <p className="text-sm text-muted-foreground">
                View and read DOCX documents with preserved formatting
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
