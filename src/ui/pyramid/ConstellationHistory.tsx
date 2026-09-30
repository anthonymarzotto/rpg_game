import { CLASSES_BY_ID } from '../../data/classes';

export interface ConstellationHistoryProps {
  readonly constellation: readonly string[];
}

export function ConstellationHistory({ constellation }: ConstellationHistoryProps) {
  return (
    <div className="sim-controls flex-1">
      <div className="sim-section-label">
        Constellation Path ({constellation.length} Classes Unlocked)
      </div>
      <div className="constellation-timeline">
        {constellation.length === 0 ? (
          <div className="timeline-empty-msg">
            No classes unlocked yet. Ascend an archetype to unlock your first class.
          </div>
        ) : (
          constellation.map((id) => {
            const cls = CLASSES_BY_ID[id];
            if (!cls) return null;
            return (
              <div key={id} className="timeline-node">
                <span className="timeline-node-name">{cls.name}</span>
                <span className="timeline-node-level text-gold">
                  Level {cls.totalPoints}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
