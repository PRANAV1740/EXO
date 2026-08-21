import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { GameProvider } from './lib/gameState';
import { Header } from './components/Header';
import { HandbookOverlay } from './components/HandbookOverlay';
import Landing from './pages/Landing';
import TeamSetup from './pages/TeamSetup';
import HowToPlay from './pages/HowToPlay';
import Handbook from './pages/Handbook';
import Round1 from './pages/Round1';
import Round2 from './pages/Round2';
import Round3 from './pages/Round3';
import Round4 from './pages/Round4';
import RoundTransition from './components/RoundTransition';
import Report from './pages/Report';
import Results from './pages/Results';
import Admin from './pages/Admin';
import TestCurves from './pages/TestCurves';

function AppContent() {
  const [isHandbookOverlayOpen, setIsHandbookOverlayOpen] = useState(false);
  const location = useLocation();

  // Close overlay on route change
  useEffect(() => {
    setIsHandbookOverlayOpen(false);
  }, [location.pathname]);

  // Keyboard shortcut Esc to close overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHandbookOverlayOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-void text-text flex flex-col font-sans select-none">
      <Header />
      <HandbookOverlay
        isOpen={isHandbookOverlayOpen}
        onClose={() => setIsHandbookOverlayOpen(false)}
      />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/setup" element={<TeamSetup />} />
          <Route path="/how-to-play" element={<HowToPlay />} />
          <Route path="/handbook" element={<Handbook />} />
          <Route path="/round/1" element={<Round1 />} />
          <Route path="/round/2" element={<Round2 />} />
          <Route path="/round/3" element={<Round3 />} />
          <Route path="/round/4" element={<Round4 />} />
          <Route path="/transition/:nextRound" element={<RoundTransition />} />
          <Route path="/report" element={<Report />} />
          <Route path="/results" element={<Results />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/test-curves" element={<TestCurves />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
