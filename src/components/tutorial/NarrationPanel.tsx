/**
 * NarrationPanel.tsx — Fixed-height text panel for on-screen narration.
 *
 * Requirements:
 * - Constant height (zero layout shift).
 * - Lines appear one at a time.
 * - Previous lines in the current scene remain visible, dimmed (`opacity-50`).
 * - Clears automatically on scene change.
 */

import { type NarrationLine, formatNarrationText } from '../../lib/tutorialScript';

interface NarrationPanelProps {
  lines: NarrationLine[];
  currentTimeMs: number;
}

export function NarrationPanel({ lines, currentTimeMs }: NarrationPanelProps) {
  // Find all lines that should be visible up to currentTimeMs
  const visibleLines = lines.filter((l) => l.t <= currentTimeMs);

  return (
    <div className="bg-panel border border-border rounded-xl p-5 h-36 flex flex-col justify-end overflow-hidden shadow-inner relative">
      <div className="space-y-2 max-h-full overflow-y-auto pr-2 scrollbar-none">
        {visibleLines.map((line, idx) => {
          const isLatest = idx === visibleLines.length - 1;
          return (
            <div
              key={idx}
              className={`text-sm leading-relaxed transition-opacity duration-300 ${
                isLatest ? 'text-bright font-medium' : 'text-subtle opacity-50'
              }`}
              dangerouslySetInnerHTML={{
                __html: formatNarrationText(line.text),
              }}
            />
          );
        })}

        {visibleLines.length === 0 && (
          <div className="text-xs text-muted/40 italic">
            Preparing narration...
          </div>
        )}
      </div>
    </div>
  );
}
