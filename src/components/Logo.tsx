import React from 'react';
import { Bot } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center">
      <div className="relative flex items-center">
        <Bot className="h-7 w-7 text-orange-500" />
        <Bot className="h-7 w-7 text-sky-500 -ml-2" />
      </div>
      <span className="ml-2 text-xl font-bold bg-gradient-to-r from-orange-500 to-sky-500 text-transparent bg-clip-text">
        AI2AI-Chat
      </span>
      <span className="ml-2 text-sm text-gray-600">Research Platform</span>
    </div>
  );
}
