/**
 * Tutorial.tsx — Page wrapper for the /tutorial route.
 */

import { TutorialPlayer } from '../components/tutorial/TutorialPlayer';

export default function Tutorial() {
  return (
    <div className="min-h-screen bg-void py-6">
      <TutorialPlayer />
    </div>
  );
}
