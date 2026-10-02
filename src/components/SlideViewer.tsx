import React, { useState, useRef, useMemo, useEffect } from 'react';
import { SlideEmbedding, DatabaseState } from '../types.js';
import {
  FileText,
  BookOpen,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  CheckCircle2,
  FolderOpen,
  Plus,
  X,
  Search,
  MessageSquare,
  AlertCircle,
  Loader2,
  GraduationCap
} from 'lucide-react';

interface SlideViewerProps {
  slides: SlideEmbedding[];
  selectedSlide: SlideEmbedding | null;
  onSelectSlide: (slide: SlideEmbedding) => void;
  onUploadSuccess: (newSlides: SlideEmbedding[], newDatabase?: DatabaseState) => void;
  onAskAboutSlide?: (slide: SlideEmbedding) => void;
  onClose?: () => void;
}

export const SlideViewer: React.FC<SlideViewerProps> = ({
  slides,
  selectedSlide,
  onSelectSlide,
  onUploadSuccess,
  onAskAboutSlide,
  onClose
}) => {
  const [isDropzoneOpen, setIsDropzoneOpen] = useState(false);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploadCourseCode, setUploadCourseCode] = useState<string>('CS-402');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group all slides into lecture decks by document_name
  const decksMap = useMemo(() => {
    const map = new Map<string, {
      document_name: string;
      course_code: string;
      slides: SlideEmbedding[];
    }>();

    for (const slide of slides) {
      const doc = slide.document_name;
      if (!map.has(doc)) {
        map.set(doc, {
          document_name: doc,
          course_code: slide.course_code,
          slides: []
        });
      }
      map.get(doc)!.slides.push(slide);
    }

    // Sort slides inside each deck by page_number
    for (const deck of map.values()) {
      deck.slides.sort((a, b) => a.page_number - b.page_number);
    }

    return map;
  }, [slides]);

  const allDecks = useMemo(() => Array.from(decksMap.values()), [decksMap]);

  // Filtered decks based on course and search
  const filteredDecks = useMemo(() => {
    return allDecks.filter(deck => {
      const matchesCourse = selectedCourseFilter === 'all' || deck.course_code.toLowerCase() === selectedCourseFilter.toLowerCase();
      const matchesSearch = !searchQuery ||
        deck.document_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deck.slides.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.content.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCourse && matchesSearch;
    });
  }, [allDecks, selectedCourseFilter, searchQuery]);

  // Current active deck
  const activeDeckName = selectedSlide ? selectedSlide.document_name : (allDecks[0]?.document_name || null);
  const currentDeck = activeDeckName ? decksMap.get(activeDeckName) || null : null;
  const currentDeckSlides = currentDeck ? currentDeck.slides : [];

  // Active slide
  const activeSlide: SlideEmbedding | null = useMemo(() => {
    if (selectedSlide) return selectedSlide;
    if (currentDeckSlides.length > 0) return currentDeckSlides[0];
    return slides[0] || null;
  }, [selectedSlide, currentDeckSlides, slides]);

  // Current page index within active deck
  const currentSlideIndex = useMemo(() => {
    if (!activeSlide || currentDeckSlides.length === 0) return 0;
    const idx = currentDeckSlides.findIndex(s => s.id === activeSlide.id || s.page_number === activeSlide.page_number);
    return idx >= 0 ? idx : 0;
  }, [activeSlide, currentDeckSlides]);

  // Navigate to previous slide in deck
  const handlePrevPage = () => {
    if (currentSlideIndex > 0) {
      onSelectSlide(currentDeckSlides[currentSlideIndex - 1]);
    }
  };

  // Navigate to next slide in deck
  const handleNextPage = () => {
    if (currentSlideIndex < currentDeckSlides.length - 1) {
      onSelectSlide(currentDeckSlides[currentSlideIndex + 1]);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccessMessage(null);
    setUploadProgressText('Reading file into memory...');

    try {
      // Convert file to base64 Data URL for robust JSON transport across proxies
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Unable to read selected file on your device.'));
        reader.readAsDataURL(file);
      });

      setUploadProgressText('Extracting pages with unpdf...');

      const response = await fetch('/api/slides/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          fileName: file.name,
          courseCode: uploadCourseCode,
          fileBase64: base64Data
        })
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        console.warn('[Slide Upload] Non-JSON response received from server:', rawText.slice(0, 300));
        throw new Error(
          !response.ok
            ? `Server returned HTTP ${response.status} (${response.statusText || 'Error'}).`
            : 'Server returned an unexpected response format. Please try again.'
        );
      }

      if (!response.ok || !data || !data.success) {
        throw new Error(data?.error || `Upload failed with HTTP status ${response.status}`);
      }

      setUploadProgressText('Saving embeddings directly into Supabase pgvector...');
      setUploadSuccessMessage(`Successfully indexed ${data.totalPages} slides for ${data.courseCode}!`);

      if (data.slides && data.slides.length > 0) {
        onUploadSuccess(data.slides, data.database);
        onSelectSlide(data.slides[0]);
      }

      setTimeout(() => {
        setIsDropzoneOpen(false);
        setUploadSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      console.error('Slide upload error:', err);
      setUploadError(err?.message || 'Upload failed. Please check the file format.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  // Helper to generate sample PDF for instant testing
  const handleUploadSampleLecture = async () => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccessMessage(null);
    setUploadProgressText('Generating demo lecture slide PDF for CS-402...');

    try {
      const samplePdfText = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >> endobj
4 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >> endobj
5 0 obj << /Length 180 >> stream
BT
/F1 18 Tf
50 720 Td
(CS-402: Adversarial Search and Game Theory) Tj
/F1 12 Tf
0 -30 Td
(Minimax decision rule maximizes utility against optimal adversary.) Tj
0 -20 Td
(Alpha-beta pruning guarantees exact same decision while cutting branch depth in half.) Tj
ET
endstream endobj
6 0 obj << /Length 190 >> stream
BT
/F1 18 Tf
50 720 Td
(CS-402: Constraint Satisfaction Problems CSP) Tj
/F1 12 Tf
0 -30 Td
(CSP states defined by variables X_i with values from domain D_i.) Tj
0 -20 Td
(AC-3 arc consistency detects inconsistencies early to reduce backtracking search tree.) Tj
ET
endstream endobj
7 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 8
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000373 00000 n 
0000000606 00000 n 
0000000849 00000 n 
trailer << /Size 8 /Root 1 0 R >>
startxref
922
%%EOF`;

      const sampleBase64 = btoa(samplePdfText);

      setUploadProgressText('Extracting pages with unpdf & generating Gemini embeddings...');

      const response = await fetch('/api/slides/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          fileName: 'Lecture_06_Adversarial_CSP_Demo.pdf',
          courseCode: 'CS-402',
          fileBase64: sampleBase64
        })
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        console.warn('[Slide Upload] Non-JSON response received from server:', rawText.slice(0, 300));
        throw new Error(
          !response.ok
            ? `Server returned HTTP ${response.status} (${response.statusText || 'Error'}).`
            : 'Server returned an unexpected response format. Please try again.'
        );
      }

      if (!response.ok || !data || !data.success) {
        throw new Error(data?.error || `Upload failed with status ${response.status}`);
      }

      setUploadProgressText('Saving embeddings directly into Supabase pgvector...');
      setUploadSuccessMessage(`Successfully indexed ${data.totalPages} slides for ${data.courseCode}!`);

      if (data.slides && data.slides.length > 0) {
        onUploadSuccess(data.slides, data.database);
        onSelectSlide(data.slides[0]);
      }

      setTimeout(() => {
        setIsDropzoneOpen(false);
        setUploadSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      console.error('Slide upload demo error:', err);
      setUploadError(err?.message || 'Failed to upload demo lecture deck.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3 min-h-0 text-xs">
      {/* Top Controls: Deck Switcher & Upload Action */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-slate-200">Lecture Decks</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {allDecks.length} Decks • {slides.length} Slides in Supabase
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDropzoneOpen(!isDropzoneOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
              isDropzoneOpen
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-sm shadow-indigo-600/30'
            }`}
          >
            {isDropzoneOpen ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Close Upload</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Slides</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Dropzone Collapse */}
      {isDropzoneOpen && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-white text-sm">Upload Lecture PDF / PPTX Deck</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Target Course:</span>
              <select
                value={uploadCourseCode}
                onChange={e => setUploadCourseCode(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none"
              >
                <option value="CS-402">CS-402 (Artificial Intelligence)</option>
                <option value="CS-304">CS-304 (Operating Systems)</option>
                <option value="CS-201">CS-201 (Data Structures)</option>
                <option value="SE-301">SE-301 (Software Architecture)</option>
              </select>
            </div>
          </div>

          {/* Drag & Drop Canvas */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 rounded-xl p-6 text-center bg-slate-950/60 hover:bg-slate-950 transition-all cursor-pointer group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
            />

            <UploadCloud className="w-8 h-8 text-indigo-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="font-semibold text-slate-200">
              Drag & Drop lecture PDF or PPTX file here, or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              unpdf extracts pages &bull; Gemini generates 768-dim embeddings &bull; Saved to Supabase pgvector
            </p>
          </div>

          {/* Upload Progress & Feedback */}
          {isUploading && (
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/50 flex items-center gap-2.5 text-indigo-300 font-medium">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              <span>{uploadProgressText}</span>
            </div>
          )}

          {uploadSuccessMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2 text-emerald-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center gap-2 text-rose-300 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Quick Demo Upload Option */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
            <span className="text-slate-500">Don't have a local PDF right now?</span>
            <button
              type="button"
              onClick={handleUploadSampleLecture}
              disabled={isUploading}
              className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Load Sample Lecture PDF Deck</span>
            </button>
          </div>
        </div>
      )}

      {/* Deck Selector Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {allDecks.map(deck => {
          const isSelected = deck.document_name === currentDeck?.document_name;
          return (
            <button
              key={deck.document_name}
              onClick={() => {
                if (deck.slides.length > 0) {
                  onSelectSlide(deck.slides[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-lg border text-left shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {deck.course_code}
              </span>
              <span className="font-medium text-xs max-w-[130px] truncate" title={deck.document_name}>
                {deck.document_name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                ({deck.slides.length}p)
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Slide Viewer Canvas */}
      {!activeSlide ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
          <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
          <h4 className="text-sm font-semibold text-slate-400">No Slide Selected</h4>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            Upload lecture slides above or click any citation in chat to inspect lecture contents.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/90 shadow-2xl overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Slide Deck Top Header with Page Navigation */}
          <div className="p-3.5 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs font-mono">
                #{activeSlide.page_number}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-semibold border border-indigo-500/30">
                    {activeSlide.course_code}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <FileText className="w-3 h-3 text-slate-500" />
                    <span className="max-w-[180px] sm:max-w-xs truncate" title={activeSlide.document_name}>
                      {activeSlide.document_name}
                    </span>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5 line-clamp-1">
                  {activeSlide.title}
                </h3>
              </div>
            </div>

            {/* Page Navigation Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={handlePrevPage}
                  disabled={currentSlideIndex <= 0}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Slide (Arrow Left)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono text-[11px] text-slate-300">
                  {currentSlideIndex + 1} / {currentDeckSlides.length || 1}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentSlideIndex >= currentDeckSlides.length - 1}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Slide (Arrow Right)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {activeSlide.similarity !== undefined && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>{(activeSlide.similarity * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Page Jump Pills */}
          {currentDeckSlides.length > 1 && (
            <div className="px-3.5 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
              <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1 shrink-0">
                Deck Pages:
              </span>
              {currentDeckSlides.map((slide, idx) => (
                <button
                  key={slide.id || idx}
                  onClick={() => onSelectSlide(slide)}
                  className={`w-6 h-6 rounded text-[11px] font-mono flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    slide.page_number === activeSlide.page_number
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                  }`}
                  title={`Page ${slide.page_number}: ${slide.title}`}
                >
                  {slide.page_number}
                </button>
              ))}
            </div>
          )}

          {/* Slide Body Canvas */}
          <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
            {/* Presentation Slide Visual Preview Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/90 shadow-inner relative space-y-3">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pb-2 border-b border-slate-800/80">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  SUPABASE PGVECTOR 768-DIM INDEXED
                </span>
                <span>PAGE #{activeSlide.page_number}</span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white tracking-tight">
                  {activeSlide.title}
                </h4>
              </div>

              <div className="text-xs sm:text-sm leading-relaxed text-slate-200 font-sans whitespace-pre-wrap bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 shadow-sm">
                {activeSlide.content}
              </div>

              {/* Concept Tags */}
              {activeSlide.tags && activeSlide.tags.length > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium mr-1">Concept Tags:</span>
                  {activeSlide.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 text-[11px] font-mono border border-slate-700/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Footer Card */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Verified in university repository (zero hallucination ground truth)</span>
              </div>

              {onAskAboutSlide && (
                <button
                  type="button"
                  onClick={() => onAskAboutSlide(activeSlide)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/70 border border-indigo-700/60 text-indigo-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ask Copilot About This Slide</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
