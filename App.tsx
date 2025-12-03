import React, { useState, useEffect } from 'react';
import { Sparkles, Wand2, Palette, BookOpen, Book, ScrollText } from 'lucide-react';
import { IllustrationStyle, AppState, StoryPage, ReadingMode } from './types';
import { generateStoryText, generateIllustration, generateNarration } from './services/geminiService';
import { BookViewer } from './components/BookViewer';
import { LoadingSpinner } from './components/LoadingSpinner';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('input');
  const [topic, setTopic] = useState('');
  const [style, setStyle] = useState<IllustrationStyle>(IllustrationStyle.Watercolor);
  const [readingMode, setReadingMode] = useState<ReadingMode>('slide');
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('Generating Story...');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setAppState('generating_text');
    setError(null);
    setLoadingMessage('Weaving your story text with Gemini...');

    try {
      // 1. Generate Text Structure
      const storyPages = await generateStoryText(topic, style);
      
      if (storyPages.length === 0) {
        throw new Error("Failed to generate valid story structure.");
      }

      setPages(storyPages);
      setAppState('generating_assets');
      setLoadingMessage('Painting illustrations and recording voices...');

      // 2. Generate Assets (Images & Audio) 
      // We start reading immediately, but assets load in background
      generateAssetsInBackground(storyPages, style);
      
      // Move to reading view once we have the structure. 
      // The images will pop in as they finish.
      setAppState('reading');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong while creating your story.');
      setAppState('error');
    }
  };

  const generateAssetsInBackground = async (storyPages: StoryPage[], selectedStyle: IllustrationStyle) => {
    // Process pages one by one (or in small batches) to avoid rate limits
    // Creating a copy of pages to update state immutably
    
    // We will update the state page by page
    const updatePage = (index: number, updates: Partial<StoryPage>) => {
      setPages(prev => {
        const newPages = [...prev];
        if (!newPages[index]) return newPages; // Guard against race conditions on reset
        newPages[index] = { ...newPages[index], ...updates };
        // If both image and audio (or failure) are done, turn off loading
        if (newPages[index].imageUrl && newPages[index].audioBuffer !== undefined) {
             newPages[index].isLoadingAssets = false;
        }
        return newPages;
      });
    };

    for (let i = 0; i < storyPages.length; i++) {
        const page = storyPages[i];
        
        // Parallel execution for Image and Audio for the CURRENT page
        // We do sequential page processing, but parallel asset generation per page
        try {
            // FIX: Use page.storyText instead of page.voiceText so audio matches the text on screen exactly
            const [imageUrl, audioBuffer] = await Promise.all([
                generateIllustration(page.illustrationDescription, selectedStyle),
                generateNarration(page.storyText) 
            ]);

            updatePage(i, { 
                imageUrl, 
                audioBuffer: audioBuffer || undefined,
                isLoadingAssets: false 
            });
        } catch (e) {
            console.error(`Error generating assets for page ${i+1}`, e);
            updatePage(i, { 
                isLoadingAssets: false // Stop loading even if failed
            });
        }
    }
  };

  const resetApp = () => {
    setAppState('input');
    setTopic('');
    setPages([]);
    setError(null);
  };

  if (appState === 'generating_text' || appState === 'generating_assets') {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
             <LoadingSpinner message={loadingMessage} subMessage="This utilizes Gemini's Thinking, Vision, and Speech capabilities." />
        </div>
    );
  }

  if (appState === 'reading') {
    return <BookViewer pages={pages} onRestart={resetApp} mode={readingMode} />;
  }

  if (appState === 'error') {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md text-center">
          <div className="text-red-500 font-bold text-xl mb-4">Oh no! The magic fizzled.</div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={resetApp}
            className="bg-indigo-600 text-white px-6 py-3 rounded-full hover:bg-indigo-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Input State
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/50">
        
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
             <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,white_2px,transparent_2px)] bg-[length:24px_24px]"></div>
          </div>
          <Sparkles className="inline-block w-10 h-10 text-yellow-300 mb-4 animate-bounce" />
          <h1 className="text-4xl font-bold text-white font-serif mb-2">Storybook Generator</h1>
          <p className="text-indigo-200">Create magical stories with AI illustrations and narration.</p>
        </div>

        <div className="p-8 md:p-12 space-y-8">
          
          {/* Topic Input */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
              What is your story about?
            </label>
            <div className="relative">
              <BookOpen className="absolute left-4 top-4 text-gray-400" size={20} />
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., A lonely robot who finds a flower on Mars..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-0 transition-all text-lg"
              />
            </div>
          </div>

          {/* Style Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Palette size={16} /> Choose an Art Style
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(IllustrationStyle).map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3
                    ${style === s 
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' 
                      : 'border-gray-100 bg-white text-gray-600 hover:border-indigo-200 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${style === s ? 'border-indigo-500' : 'border-gray-300'}
                  `}>
                    {style === s && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </div>
                  <span className="font-medium">{s}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Reading Mode Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <BookOpen size={16} /> Choose a Reading Style
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setReadingMode('slide')}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3
                  ${readingMode === 'slide' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' 
                    : 'border-gray-100 bg-white text-gray-600 hover:border-indigo-200 hover:bg-gray-50'
                  }
                `}
              >
                <Book size={20} />
                <span className="font-medium">Page by Page</span>
              </button>
              <button
                onClick={() => setReadingMode('scroll')}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3
                  ${readingMode === 'scroll' 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md' 
                    : 'border-gray-100 bg-white text-gray-600 hover:border-indigo-200 hover:bg-gray-50'
                  }
                `}
              >
                <ScrollText size={20} />
                <span className="font-medium">Full Scroll</span>
              </button>
            </div>
          </div>


          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={!topic.trim()}
            className="w-full group relative flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xl font-bold py-5 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            <Wand2 className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            <span>Generate Storybook</span>
          </button>

          <p className="text-center text-xs text-gray-400">
            Powered by Gemini 2.5 Flash, Vision, and TTS.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
