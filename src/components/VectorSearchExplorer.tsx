import React, { useState } from 'react';
import { Course, SlideEmbedding } from '../types.js';
import { safeFetchJson } from '../api.js';
import { Search, Sparkles, Filter, Layers, BookOpen, ChevronRight } from 'lucide-react';

interface VectorSearchExplorerProps {
  courses: Course[];
  slides: SlideEmbedding[];
  onSelectSlide: (slide: SlideEmbedding) => void;
  selectedSlideId?: number;
}

export const VectorSearchExplorer: React.FC<VectorSearchExplorerProps> = ({
  courses,
  slides,
  onSelectSlide,
  selectedSlideId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('CS-402');
  const [startBound, setStartBound] = useState('');
  const [endBound, setEndBound] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SlideEmbedding[]>(slides);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    try {
      const data = await safeFetchJson('/api/vector-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery || 'lecture concepts and algorithms',
          course_code: selectedCourse,
          match_count: 6,
          start_page: startBound ? parseInt(startBound, 10) : undefined,
          end_page: endBound ? parseInt(endBound, 10) : undefined
        })
      });
      if (data && data.matches) {
        setResults(data.matches);
        if (data.matches.length > 0) {
          onSelectSlide(data.matches[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3 text-xs">
      {/* Search Bar & Filters */}
      <form onSubmit={handleSearch} className="space-y-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Supabase pgvector Slide Search</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">text-embedding-004</span>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search concepts (e.g. 'Binary Search trace', 'TLB page fault', 'A* heuristics')..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 text-xs"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Course Scope</label>
            <select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md p-1.5 text-slate-200 text-xs font-mono"
            >
              {courses.map(c => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">Start Slide</label>
            <input
              type="number"
              value={startBound}
              placeholder="e.g. 3"
              onChange={e => setStartBound(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md p-1.5 text-slate-200 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-500 block mb-0.5">End Slide</label>
            <input
              type="number"
              value={endBound}
              placeholder="e.g. 8"
              onChange={e => setEndBound(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-md p-1.5 text-slate-200 text-xs font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Search className="w-3 h-3" />
          <span>{isSearching ? 'Computing Vector Distances...' : 'Execute Vector Search'}</span>
        </button>
      </form>

      {/* Slide Results List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between px-1">
          <span>Found {results.length} Indexed Slide Chunks</span>
          <span>Click to Inspect in Slide Viewer</span>
        </div>

        {results.map(slide => {
          const isSelected = selectedSlideId === slide.id;
          return (
            <button
              key={slide.id}
              onClick={() => onSelectSlide(slide)}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 font-bold font-mono text-[10px] flex items-center justify-center border border-indigo-500/20">
                    #{slide.page_number}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-slate-200">
                    {slide.course_code}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {slide.document_name}
                  </span>
                </div>

                {slide.similarity !== undefined && (
                  <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    {(slide.similarity * 100).toFixed(1)}% Match
                  </span>
                )}
              </div>

              <h4 className="text-xs font-semibold text-white mt-1.5 line-clamp-1">
                {slide.title}
              </h4>

              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {slide.content}
              </p>

              <div className="mt-2 flex flex-wrap gap-1">
                {slide.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
