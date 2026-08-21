/**
 * HandbookOverlay — Modal drawer containing the Handbook content,
 * openable at any time during gameplay without losing state or timer progress.
 */

import Handbook from '../pages/Handbook';

export function HandbookOverlay({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-void/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-deep border border-border rounded-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="bg-panel px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <h2 className="text-lg font-bold text-bright">Mission Handbook Overlay</h2>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-surface border border-border text-subtle text-xs rounded-lg hover:text-bright hover:border-accent transition-colors"
          >
            Close (Esc) ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">
          <Handbook />
        </div>
      </div>
    </div>
  );
}
