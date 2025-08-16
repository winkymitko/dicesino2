import React from 'react';
import { Dice6 } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-yellow-500/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Dice6 className="h-4 w-4 text-yellow-500" />
            <span className="text-gray-400">© 2025 DiceSino</span>
          </div>
          <div className="flex items-center space-x-4 text-gray-400">
            <span>Provably Fair</span>
            <span>•</span>
            <span>Responsible Gaming</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;