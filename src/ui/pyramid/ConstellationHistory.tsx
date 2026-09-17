import { CLASSES_BY_ID } from '../../data/classes';

export interface ConstellationHistoryProps {
  readonly constellation: readonly string[];
}

export function ConstellationHistory({ constellation }: ConstellationHistoryProps) {
  return (
    <div className="sim-controls" style={{ flex: 1 }}>
      <div className="sim-section-label">
        Constellation Path ({constellation.length} Stars Unlocked)
      </div>
      <div className="constellation-timeline">
        {constellation.length === 0 ? (
          <div
            style={{
              fontSize: '0.78rem',
              color: '#6b7280',
              fontStyle: 'italic',
              padding: '0.5rem 0'
            }}
          >
            No stars unlocked yet. Advance an archetype to ignite your first star.
          </div>
        ) : (
          constellation.map((id) => {
            const cls = CLASSES_BY_ID[id];
            if (!cls) return null;
            return (
              <div key={id} className="timeline-node">
                <span style={{ fontWeight: 600 }}>{cls.name}</span>
                <span style={{ color: 'var(--color-gold)', fontSize: '0.7rem' }}>
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
