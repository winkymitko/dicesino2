import React, { useState } from 'react';
import { Bug } from 'lucide-react';

const FloatingReportButton: React.FC = () => {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      {/* Floating Report Button */}
      <button
        onClick={() => setShowReportModal(true)}
        className="fixed bottom-6 right-6 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110 z-40"
        title="Report Bug"
      >
        <Bug className="h-5 w-5" />
      </button>

      {/* Report Problem Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl border border-white/20 p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">🐛 Report Bug/Problem</h3>
            <p className="text-gray-400 text-sm mb-4">
              Found a bug or having issues? Let us know what happened and we'll fix it ASAP.
            </p>
            <div className="flex space-x-3">
              <a
                href="mailto:support@dicesino.com?subject=Bug Report - DiceSino&body=Describe the problem you encountered:"
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-center"
              >
                Report Bug
              </a>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingReportButton;