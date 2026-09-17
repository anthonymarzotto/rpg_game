import { ArchetypePoints, ClassDefinition } from '../types/class';

/**
 * Returns the string coordinate key formatted as 'fighter,rogue,mage'.
 */
export function toCoordKey(points: ArchetypePoints): string {
  return `${points.fighter},${points.rogue},${points.mage}`;
}

/**
 * Read-only catalog query interface for class nodes.
 */
export interface ClassRegistry {
  getClassAtCoord(points: ArchetypePoints): ClassDefinition | null;
  getClassById(id: string): ClassDefinition | null;
  getAllClasses(): readonly ClassDefinition[];
}

/**
 * Creates a pure, immutable ClassRegistry from an array of ClassDefinitions.
 */
export function createClassRegistry(classes: readonly ClassDefinition[]): ClassRegistry {
  const byCoord = new Map<string, ClassDefinition>();
  const byId = new Map<string, ClassDefinition>();

  for (const cls of classes) {
    byCoord.set(toCoordKey(cls.requirements), cls);
    byId.set(cls.id, cls);
  }

  return {
    getClassAtCoord: (points: ArchetypePoints): ClassDefinition | null => {
      return byCoord.get(toCoordKey(points)) ?? null;
    },
    getClassById: (id: string): ClassDefinition | null => {
      return byId.get(id) ?? null;
    },
    getAllClasses: (): readonly ClassDefinition[] => {
      return classes;
    }
  };
}
