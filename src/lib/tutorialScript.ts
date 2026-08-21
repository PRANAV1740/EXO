/**
 * TUTORIAL_SCRIPT.ts — Scene manifest and narration text for the 11-scene tutorial walkthrough.
 *
 * SOURCE OF TRUTH: docs/TUTORIAL_SCRIPT.md
 * If narration text changes, edit docs/TUTORIAL_SCRIPT.md first!
 *
 * Requirements & Pacing Rules:
 * - Fixed seeds for curve generation (TUTORIAL_SEED = 161).
 * - Timed narration: ~2.5 words per sec, minimum 2.0s per line.
 * - Each paragraph in docs/TUTORIAL_SCRIPT.md maps to 1 narration line.
 * - `holdAtEnd: true` on each scene manifest.
 */

export const TUTORIAL_SEED = 161;
export const TUTORIAL_BINARY_SEED = 8888888;

export interface NarrationLine {
  t: number; // millisecond timestamp relative to scene start
  text: string;
}

export interface SceneManifest {
  id: string;
  title: string;
  durationMs: number;
  lines: NarrationLine[];
  holdAtEnd: boolean;
}

export const TUTORIAL_SCENES: SceneManifest[] = [
  // Scene 1: What this is
  {
    id: 'scene-01',
    title: '1. What this is',
    durationMs: 18500,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "You're about to go looking for planets around other stars.",
      },
      {
        t: 5500,
        text: "You won't use a telescope, and you'll never see a planet directly. Nobody does. What you get instead is a graph — and everything you conclude has to come out of it.",
      },
      {
        t: 16500,
        text: "Here's how to read one.",
      },
    ],
  },

  // Scene 2: The star and the graph
  {
    id: 'scene-02',
    title: '2. The star and the graph',
    durationMs: 36100,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "This is a star. We're measuring how bright it looks, and plotting that on the right.",
      },
      {
        t: 7700,
        text: "Nothing's happening yet, so the line is flat.",
      },
      {
        t: 12300,
        text: "Now watch. A planet crosses in front of it. It blocks a tiny fraction of the light — and the line dips.",
      },
      {
        t: 21100,
        text: "The planet passes, and the brightness comes back.",
      },
      {
        t: 25900,
        text: "That dip is called a **transit**. It's the only evidence you get. The planet itself stays invisible the whole time.",
      },
    ],
  },

  // Scene 3: Reading a light curve
  {
    id: 'scene-03',
    title: '3. Reading a light curve',
    durationMs: 31700,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "Time runs along the bottom. Brightness runs up the side.",
      },
      {
        t: 5100,
        text: "This flat part is the star on its own. We call that the **baseline**.",
      },
      {
        t: 10300,
        text: "This is the dip. How far it drops — the **transit depth** — tells you how big the planet is. A deeper dip means more light blocked, so a bigger planet.",
      },
      {
        t: 22700,
        text: "And the gap between one dip and the next is the **orbital period**: how long the planet takes to go around once. Its year.",
      },
      {
        t: 33500,
        text: "Two numbers, straight off the graph.",
      },
    ],
  },

  // Scene 4: The five suspects
  {
    id: 'scene-04',
    title: '4. The five suspects',
    durationMs: 50100,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "Here's the catch. A dip doesn't automatically mean a planet. Five different things can produce one, and telling them apart is the whole game.",
      },
      {
        t: 10500,
        text: "A planet. Shallow, flat-bottomed, and it comes back on a strict schedule.",
      },
      {
        t: 15300,
        text: "A second star orbiting the first. Same rhythm, but far too deep — a star blocks much more light than a planet ever could.",
      },
      {
        t: 25700,
        text: "A star that flickers on its own. The brightness wanders up and down, but there's no sharp edge anywhere and no strict period.",
      },
      {
        t: 36100,
        text: "Instrument noise. Random scatter, the odd spike, nothing that repeats.",
      },
      {
        t: 40900,
        text: "And a single dip that never comes back. It might have been a planet. With only one event, you can't tell — and saying so is a legitimate answer.",
      },
    ],
  },

  // Scene 5: Telling them apart
  {
    id: 'scene-05',
    title: '5. Telling them apart',
    durationMs: 57500,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "The hardest pair to separate is a planet and a pair of eclipsing stars. Both repeat perfectly. Both look convincing.",
      },
      {
        t: 9500,
        text: "So look at the shape. A planet moves fully in front of the star and sits there — so the dip has a flat bottom, with sharp edges either side.",
      },
      {
        t: 22500,
        text: "A grazing star gives you a V. In and straight back out, no flat section.",
      },
      {
        t: 29500,
        text: "Then there's the giveaway that catches people out. Look at these dips in order. The first is deeper than the second. The third is deeper than the fourth.",
      },
      {
        t: 41700,
        text: "That alternation means two stars taking turns passing in front of each other. A planet can't do that — every transit is identical.",
      },
      {
        t: 51900,
        text: "Remember this one. You'll need it at the end.",
      },
    ],
  },

  // Scene 6: How you answer
  {
    id: 'scene-06',
    title: '6. How you answer',
    durationMs: 29100,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "You won't be typing numbers you got from somewhere else. You answer by pointing at your own data.",
      },
      {
        t: 8700,
        text: "Click a dip, and you've marked it. Click it again to remove it.",
      },
      {
        t: 14900,
        text: "Drag a line to set the baseline. Drag another to the bottom of a transit. The depth appears on its own.",
      },
      {
        t: 24300,
        text: "The measurements are yours. That's the point.",
      },
    ],
  },

  // Scene 7: Round 1: Detection
  {
    id: 'scene-07',
    title: '7. Round 1: Detection',
    durationMs: 25300,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "Round one is the warm-up. Eight light curves, one at a time.",
      },
      {
        t: 6300,
        text: "Mark any dips you can see. Then say whether there's a transit here, whether there isn't, or whether you genuinely can't tell.",
      },
      {
        t: 16100,
        text: "Add one line saying why. It doesn't have to be long — it has to be a reason.",
      },
    ],
  },

  // Scene 8: Round 2: Validation
  {
    id: 'scene-08',
    title: '8. Round 2: Validation',
    durationMs: 41700,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "Round two is harder. Now every curve has a dip in it, and your job is to work out what caused it.",
      },
      {
        t: 10300,
        text: "Click the specific feature that decided it for you. Here, the alternating depth — that's what rules out a planet.",
      },
      {
        t: 19300,
        text: "Then classify it, and explain what you saw.",
      },
      {
        t: 23500,
        text: "The marks are mostly for the explanation. Getting the right label with no reasoning behind it scores very little.",
      },
      {
        t: 32100,
        text: "And if you choose insufficient data, you'll be asked what's missing. It isn't a safe option to hide behind.",
      },
    ],
  },

  // Scene 9: Round 3: Data Room
  {
    id: 'scene-09',
    title: '9. Round 3: Data Room',
    durationMs: 60700,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "Round three is measurement.",
      },
      {
        t: 3500,
        text: "Drag the baseline to where the star sits normally. Drag the second line to the bottom of the transit. The gap between them is your transit depth.",
      },
      {
        t: 15300,
        text: "Click two consecutive dips, and you've got the orbital period.",
      },
      {
        t: 20300,
        text: "Now the arithmetic. Transit depth is roughly the planet's radius divided by the star's, squared. So take the square root of your depth, and you have the ratio directly.",
      },
      {
        t: 32900,
        text: "Say the star dimmed by one percent. The square root of one percent is a tenth. So the planet is a tenth as wide as its star — which, for a Sun-like star, is something about the size of Jupiter.",
      },
      {
        t: 49900,
        text: "Multiply by the star's radius to get the planet in Earth radii, and you can say what kind of planet you've found.",
      },
    ],
  },

  // Scene 10: Round 4: The Confirmation
  {
    id: 'scene-10',
    title: '10. Round 4: The Confirmation',
    durationMs: 40900,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "The final round. One candidate, and seven pieces of evidence.",
      },
      {
        t: 5500,
        text: "Two light curves. The star's details. The transit measurements. A set of **false positive** checks. And the notes from the astronomer who flagged it.",
      },
      {
        t: 16100,
        text: "Mark each one as trusted or rejected as you work through them.",
      },
      {
        t: 21900,
        text: "One word of warning. One of these seven has been written to lead you to the wrong conclusion. It will look reliable. It isn't.",
      },
      {
        t: 32500,
        text: "Working out which evidence deserves your trust — that's the real test here. Not the verdict.",
      },
    ],
  },

  // Scene 11: The report and scoring
  {
    id: 'scene-11',
    title: '11. The report and scoring',
    durationMs: 49500,
    holdAtEnd: true,
    lines: [
      {
        t: 500,
        text: "You finish by filing an investigation report.",
      },
      {
        t: 4300,
        text: "Your verdict. The planet's numbers. Which evidence you used, and why. Which evidence you set aside, and why. What you'd observe next. And how confident you are.",
      },
      {
        t: 16100,
        text: "That fourth section matters more than you'd expect. Naming what you threw out is what separates someone who investigated from someone who guessed.",
      },
      {
        t: 26300,
        text: "One last thing about scoring. Look at how the weight shifts across the four rounds. At the start, getting the answer right carries the most marks. By the final round, your reasoning does.",
      },
      {
        t: 40500,
        text: "A right answer you can't justify will not win this.",
      },
      {
        t: 45500,
        text: "Good luck.",
      },
    ],
  },
];

/** Format text with bold key terms */
export function formatNarrationText(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-bright font-semibold">$1</strong>');
}
