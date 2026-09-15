import { useState } from 'react';
import { ConstellationChart } from './ui/ConstellationChart';
import { CombatArena } from './ui/combat/CombatArena';

export function App() {
  const [activeTab, setActiveTab] = useState<'constellation' | 'arena'>('arena');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Functional top tab navigation (temporary scaffolding) */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.35rem 0.75rem',
          backgroundColor: '#0a0d14',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 100
        }}
      >
        <button
          onClick={() => setActiveTab('arena')}
          style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: activeTab === 'arena' ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'arena' ? '#000' : '#cbd5e1',
            fontWeight: activeTab === 'arena' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          ⚔️ Tactical Arena (Milestone 5)
        </button>
        <button
          onClick={() => setActiveTab('constellation')}
          style={{
            padding: '0.3rem 0.75rem',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: activeTab === 'constellation' ? '#f59e0b' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'constellation' ? '#000' : '#cbd5e1',
            fontWeight: activeTab === 'constellation' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          ✦ Class Constellation (Pyramid)
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'arena' ? <CombatArena /> : <ConstellationChart />}
      </div>
    </div>
  );
}
