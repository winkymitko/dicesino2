import React, { useState } from 'react';
import { Bug, X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FloatingReportButton: React.FC = () => {
  const { user } = useAuth();
  const [showReportModal, setShowReportModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      alert('Please fill in both subject and message');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
        })
      });

      if (response.ok) {
        setSuccess(true);
        setSubject('');
        setMessage('');
        setTimeout(() => {
          setSuccess(false);
          setShowReportModal(false);
        }, 2000);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit bug report');
      }
    } catch (error) {
      console.error('Bug report submission error:', error);
      alert('Failed to submit bug report');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setMessage('');
    setSuccess(false);
  };

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

      {/* Report Bug Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-white/20 p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <Bug className="h-5 w-5 text-red-400" />
                <span>Report Bug</span>
              </h3>
              <button 
                onClick={() => {
                  setShowReportModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="text-green-400 text-4xl mb-4">✓</div>
                <h4 className="text-lg font-bold text-green-400 mb-2">Report Submitted!</h4>
                <p className="text-gray-400 text-sm">
                  Thank you for your feedback. We'll look into this issue.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors"
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors resize-none"
                    placeholder="Describe what happened, what you expected, and steps to reproduce..."
                    required
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingReportButton;