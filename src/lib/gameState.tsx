/**
 * Game state management — React context + localStorage persistence.
 *
 * Manages: team info, current round, timer state, scores, submissions.
 * Everything persists in localStorage and rehydrates on load.
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { DipMarker } from '../components/LightCurveViewer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamInfo {
  name: string;
  member1: string;
  member2: string;
  seed: number; // derived from hash of team name
}

export type RoundNumber = 1 | 2 | 3 | 4;

export interface RoundTimerState {
  startedAt: number | null; // timestamp ms
  elapsedMs: number; // accumulated elapsed
  isRunning: boolean;
}

// Round 1 submission per curve
export interface Round1CurveSubmission {
  curveIndex: number;
  classification: 'TRANSIT' | 'NO TRANSIT' | 'UNCERTAIN' | null;
  reasoning: string;
  dipMarkers: DipMarker[];
}

// Round 2 submission per case
export interface Round2CaseSubmission {
  caseIndex: number;
  classification: 'PLANET CANDIDATE' | 'FALSE POSITIVE' | 'INSUFFICIENT DATA' | null;
  reasoning: string;
  featureMarkers: DipMarker[];
  missingObservation?: string; // required if INSUFFICIENT DATA
}

// Round 3 submission
export interface Round3Submission {
  depthPercent: string;
  rpOverRs: string;
  planetRadiusEarth: string;
  sizeClass: 'Earth' | 'Neptune' | 'Jupiter' | '';
  orbitalPeriod: string;
  transitDuration: string;
  // Raw measurements from viewer
  baselineFlux: number | null;
  transitFlux: number | null;
  transitStart: number | null;
  transitEnd: number | null;
  periodMarker1: number | null;
  periodMarker2: number | null;
}

// Round 4 evidence trust/reject
export interface EvidenceTrust {
  cardIndex: number;
  label: string;
  trusted: boolean | null; // null = not decided
}

// Final report
export interface FinalReport {
  verdict: 'CONFIRMED' | 'FALSE_POSITIVE' | 'INSUFFICIENT' | null;
  depthPercent: string;
  rpOverRs: string;
  planetRadiusEarth: string;
  orbitalPeriod: string;
  sizeClass: string;
  evidenceUsed: number[]; // indices of trusted cards
  evidenceUsedText: string;
  evidenceRejected: number[]; // indices of rejected cards
  evidenceRejectedText: string;
  nextAction: string;
  nextActionReason: string;
  confidence: number; // 0–100
  confidenceReason: string;
}

// Score breakdown
export interface RoundScore {
  accuracy: number; // 0–100
  dataAnalysis: number; // 0–100
  reasoning: number; // -1 = pending judge review
  time: number; // 0–100
  total: number; // weighted
  weight: { accuracy: number; dataAnalysis: number; reasoning: number; time: number };
}

export interface GameState {
  team: TeamInfo | null;
  currentRound: RoundNumber | null;
  roundTimers: Record<RoundNumber, RoundTimerState>;
  round1Submissions: Round1CurveSubmission[];
  round2Submissions: Round2CaseSubmission[];
  round3Submission: Round3Submission | null;
  evidenceTrust: EvidenceTrust[];
  finalReport: FinalReport | null;
  scores: Partial<Record<RoundNumber, RoundScore>>;
  isQualified: boolean; // qualification toggle for Round 4
  completedRounds: RoundNumber[];
  gameStartedAt: number | null;
}

const INITIAL_TIMER: RoundTimerState = {
  startedAt: null,
  elapsedMs: 0,
  isRunning: false,
};

const INITIAL_STATE: GameState = {
  team: null,
  currentRound: null,
  roundTimers: {
    1: { ...INITIAL_TIMER },
    2: { ...INITIAL_TIMER },
    3: { ...INITIAL_TIMER },
    4: { ...INITIAL_TIMER },
  },
  round1Submissions: [],
  round2Submissions: [],
  round3Submission: null,
  evidenceTrust: [],
  finalReport: null,
  scores: {},
  isQualified: true, // default to qualified in prototype
  completedRounds: [],
  gameStartedAt: null,
};

const STORAGE_KEY = 'exoplanet-watch-state';

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type GameAction =
  | { type: 'SET_TEAM'; team: TeamInfo }
  | { type: 'SET_ROUND'; round: RoundNumber }
  | { type: 'START_TIMER'; round: RoundNumber }
  | { type: 'STOP_TIMER'; round: RoundNumber }
  | { type: 'TICK_TIMER'; round: RoundNumber; now: number }
  | { type: 'SET_ROUND1_SUBMISSIONS'; submissions: Round1CurveSubmission[] }
  | { type: 'SET_ROUND2_SUBMISSIONS'; submissions: Round2CaseSubmission[] }
  | { type: 'SET_ROUND3_SUBMISSION'; submission: Round3Submission }
  | { type: 'SET_EVIDENCE_TRUST'; trust: EvidenceTrust[] }
  | { type: 'SET_FINAL_REPORT'; report: FinalReport }
  | { type: 'SET_SCORE'; round: RoundNumber; score: RoundScore }
  | { type: 'COMPLETE_ROUND'; round: RoundNumber }
  | { type: 'SET_QUALIFIED'; qualified: boolean }
  | { type: 'RESET_GAME' }
  | { type: 'LOAD_STATE'; state: GameState };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_TEAM':
      return { ...state, team: action.team, gameStartedAt: Date.now() };

    case 'SET_ROUND':
      return { ...state, currentRound: action.round };

    case 'START_TIMER': {
      const timer = state.roundTimers[action.round];
      return {
        ...state,
        roundTimers: {
          ...state.roundTimers,
          [action.round]: {
            ...timer,
            startedAt: Date.now(),
            isRunning: true,
          },
        },
      };
    }

    case 'STOP_TIMER': {
      const timer = state.roundTimers[action.round];
      const now = Date.now();
      const additionalMs = timer.startedAt ? now - timer.startedAt : 0;
      return {
        ...state,
        roundTimers: {
          ...state.roundTimers,
          [action.round]: {
            startedAt: null,
            elapsedMs: timer.elapsedMs + additionalMs,
            isRunning: false,
          },
        },
      };
    }

    case 'TICK_TIMER': {
      // Used for display updates — doesn't modify elapsed, just ensures re-render
      return { ...state };
    }

    case 'SET_ROUND1_SUBMISSIONS':
      return { ...state, round1Submissions: action.submissions };

    case 'SET_ROUND2_SUBMISSIONS':
      return { ...state, round2Submissions: action.submissions };

    case 'SET_ROUND3_SUBMISSION':
      return { ...state, round3Submission: action.submission };

    case 'SET_EVIDENCE_TRUST':
      return { ...state, evidenceTrust: action.trust };

    case 'SET_FINAL_REPORT':
      return { ...state, finalReport: action.report };

    case 'SET_SCORE':
      return {
        ...state,
        scores: { ...state.scores, [action.round]: action.score },
      };

    case 'COMPLETE_ROUND':
      return {
        ...state,
        completedRounds: [...new Set([...state.completedRounds, action.round])],
      };

    case 'SET_QUALIFIED':
      return { ...state, isQualified: action.qualified };

    case 'RESET_GAME':
      localStorage.removeItem(STORAGE_KEY);
      return { ...INITIAL_STATE };

    case 'LOAD_STATE':
      return action.state;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  getElapsedMs: (round: RoundNumber) => number;
  formatTimer: (ms: number) => string;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE, () => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameState;
        // Stop any running timers (page was reloaded)
        const timers = { ...parsed.roundTimers };
        for (const r of [1, 2, 3, 4] as RoundNumber[]) {
          if (timers[r]?.isRunning) {
            const now = Date.now();
            const additional = timers[r].startedAt ? now - timers[r].startedAt : 0;
            timers[r] = {
              startedAt: null,
              elapsedMs: (timers[r].elapsedMs || 0) + additional,
              isRunning: false,
            };
          }
        }
        return { ...parsed, roundTimers: timers };
      }
    } catch {
      // ignore
    }
    return INITIAL_STATE;
  });

  // Persist to localStorage on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage full — ignore
    }
  }, [state]);

  const getElapsedMs = useCallback(
    (round: RoundNumber) => {
      const timer = state.roundTimers[round];
      if (!timer) return 0;
      const base = timer.elapsedMs || 0;
      if (timer.isRunning && timer.startedAt) {
        return base + (Date.now() - timer.startedAt);
      }
      return base;
    },
    [state.roundTimers]
  );

  const formatTimer = useCallback((ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch, getElapsedMs, formatTimer }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Round time limits (suggested, not hard-locked)
// ---------------------------------------------------------------------------

export const ROUND_TIME_LIMITS: Record<RoundNumber, number> = {
  1: 25 * 60 * 1000, // 25 min
  2: 75 * 60 * 1000, // 75 min
  3: 60 * 60 * 1000, // 60 min
  4: 90 * 60 * 1000, // 90 min
};

export const ROUND_NAMES: Record<RoundNumber, string> = {
  1: 'Detection',
  2: 'Validation',
  3: 'Data Room',
  4: 'The Confirmation',
};
