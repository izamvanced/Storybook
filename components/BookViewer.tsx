import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { StoryPage, ReadingMode } from '../types';
import { ChevronLeft, ChevronRight, Volume2, Loader2, RotateCcw, Download } from 'lucide-react';
import { PdfPage } from './PdfPage';

interface Props {
  pages: StoryPage[];
  onRestart: () => void;
  mode: ReadingMode;
}

export const BookViewer: React.FC<Props> = ({ pages, onRestart, mode }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [playingAudioBuffer, setPlayingAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const currentPage = pages[currentPageIndex];

  // Stop audio when changing pages in slide mode
  useEffect(() => {
    if (mode === 'slide') {
      stopAudio();
    }
  }, [currentPageIndex, mode]);

  // General cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }
    setPlayingAudioBuffer(null);
  };

  const playAudio = async (buffer: AudioBuffer) => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    // Stop any currently playing audio before starting a new one
    stopAudio();

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);

    source.onended = () => {
      if (playingAudioBuffer === buffer) {
        setPlayingAudioBuffer(null);
      }
    };

    sourceNodeRef.current = source;
    source.start();
    setPlayingAudioBuffer(buffer);
  };

  const toggleAudio = (buffer?: AudioBuffer) => {
    if (!buffer) return;
    if (playingAudioBuffer === buffer) {
      stopAudio();
    } else {
      playAudio(buffer);
    }
  };

  const handleNext = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);

    const { jsPDF } = (window as any).jspdf;
    const html2canvas = (window as any).html2canvas;

    if (!jsPDF || !html2canvas) {
      console.error("PDF generation libraries not found.");
      setIsGeneratingPdf(false);
      return;
    }

    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'absolute';
    renderContainer.style.left = '-9999px';
    renderContainer.style.top = '0';
    document.body.appendChild(renderContainer);

    const doc = new jsPDF('p', 'px', [1024, 1024]);

    try {
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        if (!page.imageUrl) continue; // Skip pages where image hasn't loaded

        const pageWrapper = document.createElement('div');
        renderContainer.appendChild(pageWrapper);

        const root = ReactDOM.createRoot(pageWrapper);

        await new Promise<void>(resolve => {
          root.render(<PdfPage page={page} onImageLoad={resolve} />);
        });

        const canvas = await html2canvas(pageWrapper.firstChild as HTMLElement, {
          useCORS: true,
          scale: 1,
        });

        const imgData = canvas.toDataURL('image/png');

        if (i > 0) {
          doc.addPage([1024, 1024]);
        }
        doc.addImage(imgData, 'PNG', 0, 0, 1024, 1024);

        root.unmount();
        renderContainer.removeChild(pageWrapper);
      }
      doc.save('magical-storybook.pdf');
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      document.body.removeChild(renderContainer);
      setIsGeneratingPdf(false);
    }
  };

  const controlButtons = (
    <div className="flex items-center gap-2">
      <button
        onClick={onRestart}
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors bg-white rounded-full shadow-sm"
      >
        <RotateCcw size={18} />
        <span className="text-sm font-semibold">New Story</span>
      </button>
      <button
        onClick={handleDownloadPdf}
        disabled={isGeneratingPdf}
        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors bg-white rounded-full shadow-sm disabled:opacity-50 disabled:cursor-wait"
      >
        {isGeneratingPdf ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Download size={18} />
        )}
        <span className="text-sm font-semibold">{isGeneratingPdf ? 'Creating PDF...' : 'Download PDF'}</span>
      </button>
    </div>
  );

  if (mode === 'scroll') {
    return (
      <div className="flex flex-col items-center min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="w-full max-w-5xl flex justify-between items-center mb-6 bg-slate-100/80 backdrop-blur-sm sticky top-4 z-10 p-2 rounded-full shadow-md">
          {controlButtons}
          <div className="text-slate-500 font-semibold pr-4">Scroll to Read</div>
        </div>
        <div className="w-full max-w-5xl space-y-12">
          {pages.map((page) => (
            <div key={page.pageNumber} className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row ring-1 ring-slate-900/5">
              <div className="w-full h-72 sm:h-96 md:w-1/2 md:h-auto relative bg-indigo-50 group flex-shrink-0">
                {page.isLoadingAssets ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                      <p className="text-sm text-slate-400 font-medium">Painting the scene...</p>
                    </div>
                  </div>
                ) : (
                  <img src={page.imageUrl} alt={page.illustrationDescription} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 ring-1 ring-black/5 pointer-events-none"></div>
              </div>
              <div className="w-full md:w-1/2 flex-1 md:h-full p-6 md:p-12 lg:p-16 flex flex-col justify-center bg-amber-50/30">
                <div className="max-w-lg mx-auto w-full">
                  <p className="font-serif text-lg md:text-xl lg:text-2xl leading-relaxed text-slate-800 mb-8">
                    {page.storyText}
                  </p>
                  <button
                    onClick={() => toggleAudio(page.audioBuffer)}
                    disabled={page.isLoadingAssets || !page.audioBuffer}
                    className={`flex items-center gap-3 px-5 py-3 rounded-full transition-all w-fit
                      ${playingAudioBuffer === page.audioBuffer
                        ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {page.isLoadingAssets ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} className={playingAudioBuffer === page.audioBuffer ? 'animate-pulse' : ''} />}
                    <span className="font-semibold text-sm">{playingAudioBuffer === page.audioBuffer ? 'Playing...' : 'Read to Me'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const progress = ((currentPageIndex + 1) / pages.length) * 100;
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        {controlButtons}
        <div className="text-slate-500 font-mono text-sm">
          Page {currentPageIndex + 1} of {pages.length}
        </div>
      </div>
      <div className="relative w-full max-w-5xl md:aspect-[16/9] lg:aspect-[2/1] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row ring-1 ring-slate-900/5">
        <div className="w-full h-72 sm:h-96 md:w-1/2 md:h-full relative bg-indigo-50 group flex-shrink-0">
          {currentPage.isLoadingAssets ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                <p className="text-sm text-slate-400 font-medium">Painting the scene...</p>
              </div>
            </div>
          ) : (
            <img src={currentPage.imageUrl} alt={currentPage.illustrationDescription} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          )}
          <div className="absolute inset-0 ring-1 ring-black/5 pointer-events-none"></div>
        </div>
        <div className="w-full md:w-1/2 flex-1 md:h-full p-6 md:p-12 lg:p-16 flex flex-col justify-center bg-amber-50/30">
          <div className="max-w-lg mx-auto w-full">
            <p className="font-serif text-lg md:text-2xl lg:text-3xl leading-relaxed text-slate-800 mb-8">
              {currentPage.storyText}
            </p>
            <button
              onClick={() => toggleAudio(currentPage.audioBuffer)}
              disabled={currentPage.isLoadingAssets || !currentPage.audioBuffer}
              className={`flex items-center gap-3 px-5 py-3 rounded-full transition-all w-fit
                ${playingAudioBuffer === currentPage.audioBuffer
                  ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {currentPage.isLoadingAssets ? <Loader2 size={20} className="animate-spin" /> : <Volume2 size={20} className={playingAudioBuffer === currentPage.audioBuffer ? 'animate-pulse' : ''} />}
              <span className="font-semibold text-sm">{playingAudioBuffer === currentPage.audioBuffer ? 'Playing...' : 'Read to Me'}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="w-full max-w-5xl mt-8 flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          disabled={currentPageIndex === 0}
          className="p-4 rounded-full bg-white shadow-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-700 transition-all"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1 max-w-md h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <button
          onClick={handleNext}
          disabled={currentPageIndex === pages.length - 1}
          className="p-4 rounded-full bg-white shadow-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-700 transition-all"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};