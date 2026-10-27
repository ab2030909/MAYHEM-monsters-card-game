import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { GameProvider } from './state/GameContext';
import App from './App';
import './index.css';
import './fx.css';

createRoot(document.getElementById('root')!).render(
  <MotionConfig reducedMotion="user">
    <GameProvider>
      <App />
    </GameProvider>
  </MotionConfig>,
);
