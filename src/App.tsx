import { useState } from 'react';
import { ConstellationChart } from './ui/ConstellationChart';
import { CombatArena } from './ui/combat/CombatArena';
import './App.css';

export function App() {
  const [activeTab, setActiveTab] = useState<'constellation' | 'arena'>('arena');

  return (
    <div className="app-root">
      {/* Functional top tab navigation (temporary scaffolding) */}
      <div className="app-nav-bar">
        <button
          onClick={() => setActiveTab('arena')}
          className={`app-nav-btn ${activeTab === 'arena' ? 'active' : ''}`}
        >
          ⚔️ Tactical Arena (Milestone 5)
        </button>
        <button
          onClick={() => setActiveTab('constellation')}
          className={`app-nav-btn ${activeTab === 'constellation' ? 'active' : ''}`}
        >
          ✦ Class Constellation (Pyramid)
        </button>
      </div>

      <div className="app-viewport">
        {activeTab === 'arena' ? <CombatArena /> : <ConstellationChart />}
      </div>
    </div>
  );
}

