import { usePyramidProgression } from './pyramid/usePyramidProgression';
import { ConstellationSvg } from './pyramid/ConstellationSvg';
import {
  ClassInspectorOverlay,
  ClassInspectorSidebar
} from './pyramid/ClassInspector';
import './ConstellationChart.css';


export function ConstellationChart() {
  const {
    progression,
    mode,
    setMode,
    hoveredClassId,
    setHoveredClassId,
    unlockedSet,
    constellationPathD,
    activeClass,
    inspectedClass,
    handleLevelUp,
    applyPreset,
    handleReset
  } = usePyramidProgression();

  return (
    <div className="constellation-app">
      {/* Viewport for Star Chart */}
      <div className="viewport-container">
        <ClassInspectorOverlay
          inspectedClass={inspectedClass}
          progression={progression}
          unlockedSet={unlockedSet}
        />

        <ConstellationSvg
          mode={mode}
          progression={progression}
          unlockedSet={unlockedSet}
          hoveredClassId={hoveredClassId}
          constellationPathD={constellationPathD}
          onHoverNode={setHoveredClassId}
        />
      </div>

      {/* Sidebar Controls & HUD */}
      <ClassInspectorSidebar
        progression={progression}
        activeClass={activeClass}
        mode={mode}
        onToggleMode={setMode}
        onLevelUp={handleLevelUp}
        onApplyPreset={applyPreset}
        onReset={handleReset}
      />
    </div>
  );
}
