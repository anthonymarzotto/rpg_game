import { ArchetypePoints, ClassDefinition } from '../types/class';

export function toCoordKey(points: ArchetypePoints): string {
  return `${points.fighter},${points.rogue},${points.mage}`;
}

export interface ClassRegistry {
  getClassAtCoord(points: ArchetypePoints): ClassDefinition | null;
  getClassById(id: string): ClassDefinition | null;
  getAllClasses(): readonly ClassDefinition[];
}

export function createClassRegistry(classes: readonly ClassDefinition[]): ClassRegistry {
  const byCoord = new Map(classes.map((cls) => [toCoordKey(cls.requirements), cls]));
  const byId = new Map(classes.map((cls) => [cls.id, cls]));
  return {
    getClassAtCoord: (points: ArchetypePoints) => byCoord.get(toCoordKey(points)) ?? null,
    getClassById: (id: string) => byId.get(id) ?? null,
    getAllClasses: () => classes
  };
}
