export function App() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div id="game-canvas-container" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', pointerEvents: 'none' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#646cff' }}>Hex Tactics RPG</h1>
        <p style={{ color: '#999', fontSize: '1rem' }}>Scaffolding Ready • Systems Design in Progress</p>
      </div>
    </div>
  );
}
