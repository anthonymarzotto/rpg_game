import { useState, useMemo } from 'react';
import { Archetype, ClassDefinition, UnitProgression } from '../../core/types/class';
import { CLASSES_BY_ID } from '../../data/classes';
import {
  advanceArchetypeLevel,
  advanceMultipleLevels,
  createInitialProgression
} from '../../core/progression/pyramid';
import { POINTS_BY_ID, ProjectionMode } from './geometry';

export function usePyramidProgression(initialUnitId = 'hero-1') {
  const [progression, setProgression] = useState<UnitProgression>(() =>
    createInitialProgression(initialUnitId)
  );
  const [mode, setMode] = useState<ProjectionMode>('triangle-mosaic');
  const [hoveredClassId, setHoveredClassId] = useState<string | null>(null);

  // Set of unlocked class IDs for fast lookup
  const unlockedSet = useMemo(
    () => new Set(progression.constellation),
    [progression.constellation]
  );

  // Generate constellation polyline points
  const constellationPathD = useMemo(() => {
    if (progression.constellation.length === 0) return '';
    return progression.constellation
      .map((id, index) => {
        const pt = POINTS_BY_ID.get(id);
        if (!pt) return '';
        return `${index === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [progression.constellation]);

  // Active Title / Capstone
  const activeClass: ClassDefinition | null = useMemo(() => {
    if (progression.constellation.length === 0) return null;
    const lastId = progression.constellation[progression.constellation.length - 1];
    return CLASSES_BY_ID[lastId] ?? null;
  }, [progression.constellation]);

  // Current hovered or active class details
  const inspectedClass: ClassDefinition | null = useMemo(() => {
    if (hoveredClassId) return CLASSES_BY_ID[hoveredClassId] ?? null;
    return activeClass;
  }, [hoveredClassId, activeClass]);

  const handleLevelUp = (archetype: Archetype) => {
    try {
      setProgression((prev) => advanceArchetypeLevel(prev, archetype));
    } catch (err) {
      console.warn(err);
    }
  };

  const applyPreset = (archetypes: readonly Archetype[]) => {
    const fresh = createInitialProgression(initialUnitId);
    const result = advanceMultipleLevels(fresh, archetypes);
    setProgression(result);
  };

  const handleReset = () => {
    setProgression(createInitialProgression(initialUnitId));
  };

  return {
    progression,
    setProgression,
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
  };
}
