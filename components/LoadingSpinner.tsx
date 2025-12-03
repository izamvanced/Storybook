import React from 'react';
import { Sparkles, BookOpen } from 'lucide-react';

interface Props {
  message: string;
  subMessage?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ message, subMessage }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
      <div className="relative mb-6">
        <BookOpen className="w-16 h-16 text-indigo-600 animate-pulse" />
        <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-bounce" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2 font-serif">{message}</h2>
      {subMessage && <p className="text-gray-500 max-w-md animate-pulse">{subMessage}</p>}
      
      <div className="mt-8 w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 animate-loading-bar"></div>
      </div>
    </div>
  );
};