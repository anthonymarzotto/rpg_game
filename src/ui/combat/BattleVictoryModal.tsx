import { useState, useMemo, useEffect } from 'react';
import { PostBattleReconciliationResult } from '../../core/progression/postBattle';
import { Archetype } from '../../core/types/class';
import { Unit } from '../../core/types/unit';
import { UnitLoadout } from '../../core/types/loadout';
import { Ability } from '../../core/types/ability';
import { PassiveTrait } from '../../core/types/passive';
import {
  getClassPackage,
  getAbilityById,
  MOMENTUM
} from '../../data/packages';
import './BattleVictoryModal.css';

export interface BattleVictoryModalProps {
  readonly isOpen: boolean;
  readonly reconciliationResult: PostBattleReconciliationResult | null;
  readonly playerUnit: Unit | undefined;
  readonly squadMembers?: readonly {
    readonly unit: Unit;
    readonly result: PostBattleReconciliationResult;
  }[];
  readonly activeSquadUnitId?: string;
  readonly onSelectSquadUnit?: (unitId: string) => void;
  readonly onSelectArchetypeChoice: (archetype: Archetype) => void;
  readonly onRematch: (configuredLoadout?: UnitLoadout) => void;
  readonly onDismiss: () => void;
}

export function BattleVictoryModal({
  isOpen,
  reconciliationResult,
  playerUnit,
  squadMembers,
  activeSquadUnitId,
  onSelectSquadUnit,
  onSelectArchetypeChoice,
  onRematch,
  onDismiss
}: BattleVictoryModalProps) {
  const currentSquadMember = useMemo(() => {
    if (!squadMembers || squadMembers.length === 0) return undefined;
    return squadMembers.find((s) => s.unit.id === activeSquadUnitId) ?? squadMembers[0];
  }, [squadMembers, activeSquadUnitId]);

  const activeUnit = currentSquadMember?.unit ?? playerUnit;
  const activeResult = currentSquadMember?.result ?? reconciliationResult;

  const [selectedClassId, setSelectedClassId] = useState<string>('novice');
  const [wildcardAbility1, setWildcardAbility1] = useState<string>('');
  const [wildcardAbility2, setWildcardAbility2] = useState<string>('');
  const [wildcardPassive, setWildcardPassive] = useState<string>('');

  const constellation = activeResult?.updatedProgression.constellation;

  // Unlocked classes available for Active Class selection
  const unlockedClasses = useMemo(() => {
    const list = ['novice', ...(constellation ?? [])];
    return Array.from(new Set(list));
  }, [constellation]);

  // Resolve core abilities and innate passive for selected class
  const { coreAbilities, innatePassive } = useMemo(() => {
    if (selectedClassId === 'novice') {
      const starterAbilities = (activeUnit?.starterAbilityIds ?? [])
        .map((id) => getAbilityById(id))
        .filter((a): a is Ability => a !== undefined);
      return { coreAbilities: starterAbilities, innatePassive: MOMENTUM };
    }
    const pkg = getClassPackage(selectedClassId);
    if (!pkg) {
      return { coreAbilities: [], innatePassive: MOMENTUM };
    }
    return {
      coreAbilities: [pkg.signatureAbility, ...pkg.domainAbilities],
      innatePassive: pkg.passive
    };
  }, [selectedClassId, activeUnit]);

  // Core ability ID set
  const coreAbilityIdSet = useMemo(
    () => new Set(coreAbilities.map((a) => a.id)),
    [coreAbilities]
  );

  // Synchronize initial loadout when modal opens or activeUnit/unlocked class changes
  useEffect(() => {
    if (activeResult?.unlockedClass) {
      setSelectedClassId(activeResult.unlockedClass.id);
    } else if (activeUnit?.loadout?.activeClassId) {
      setSelectedClassId(activeUnit.loadout.activeClassId);
    }
    const currentWildcards = activeUnit?.loadout?.wildcardAbilityIds ?? [];
    setWildcardAbility1(currentWildcards[0] ?? '');
    setWildcardAbility2(currentWildcards[1] ?? '');
    setWildcardPassive(activeUnit?.loadout?.wildcardPassiveIds?.[0] ?? '');
  }, [activeResult, activeUnit]);

  // Clean up selected wildcards if they conflict with newly selected active class core abilities/passives
  useEffect(() => {
    if (coreAbilityIdSet.has(wildcardAbility1)) setWildcardAbility1('');
    if (coreAbilityIdSet.has(wildcardAbility2)) setWildcardAbility2('');
    if (wildcardPassive === innatePassive?.id) setWildcardPassive('');
  }, [coreAbilityIdSet, innatePassive, wildcardAbility1, wildcardAbility2, wildcardPassive]);

  // All unlocked abilities across starter kit and unlocked constellation classes
  const allUnlockedAbilities = useMemo(() => {
    const abilities: Ability[] = [];
    const seen = new Set<string>();

    for (const id of activeUnit?.starterAbilityIds ?? []) {
      const a = getAbilityById(id);
      if (a && !seen.has(a.id)) {
        seen.add(a.id);
        abilities.push(a);
      }
    }

    for (const cid of constellation ?? []) {
      const pkg = getClassPackage(cid);
      if (pkg) {
        if (!seen.has(pkg.signatureAbility.id)) {
          seen.add(pkg.signatureAbility.id);
          abilities.push(pkg.signatureAbility);
        }
        for (const dom of pkg.domainAbilities) {
          if (!seen.has(dom.id)) {
            seen.add(dom.id);
            abilities.push(dom);
          }
        }
      }
    }

    return abilities;
  }, [constellation, activeUnit]);

  // Eligible wildcard abilities: unlocked minus active class core abilities
  const eligibleWildcardAbilities = useMemo(() => {
    return allUnlockedAbilities.filter((a) => !coreAbilityIdSet.has(a.id));
  }, [allUnlockedAbilities, coreAbilityIdSet]);

  // All unlocked passives
  const allUnlockedPassives = useMemo(() => {
    const passives: PassiveTrait[] = [MOMENTUM];
    const seen = new Set<string>([MOMENTUM.id]);

    for (const cid of constellation ?? []) {
      const pkg = getClassPackage(cid);
      if (pkg && !seen.has(pkg.passive.id)) {
        seen.add(pkg.passive.id);
        passives.push(pkg.passive);
      }
    }
    return passives;
  }, [constellation]);

  // Eligible wildcard passives: unlocked minus active class innate passive
  const eligibleWildcardPassives = useMemo(() => {
    return allUnlockedPassives.filter((p) => p.id !== innatePassive?.id);
  }, [allUnlockedPassives, innatePassive]);

  if (!isOpen || !activeResult) {
    return null;
  }

  const {
    earnedXp,
    carryoverXp,
    unlockedClass,
    requiresChoice,
    qualifyingArchetypes,
    updatedVitals,
    updatedAttributes
  } = activeResult;

  const handleConfirmRematch = () => {
    const wildcardAbilityIds = [wildcardAbility1, wildcardAbility2].filter(Boolean);
    const wildcardPassiveIds = wildcardPassive ? [wildcardPassive] : [];

    onRematch({
      activeClassId: selectedClassId,
      wildcardAbilityIds,
      wildcardPassiveIds
    });
  };

  const selectedClassName =
    selectedClassId === 'novice'
      ? 'Novice'
      : selectedClassId.charAt(0).toUpperCase() + selectedClassId.slice(1);

  return (
    <div className="victory-modal-backdrop" role="dialog" aria-modal="true">
      <div className="victory-modal-card">
        {/* Header */}
        <div className="victory-header">
          <span className="victory-title-badge">🏆 Objective Complete</span>
          <h2>Trial Victory!</h2>
          <p>You have satisfied the combat trial milestone.</p>
        </div>

        {/* Squad Member Selection Tabs */}
        {squadMembers && squadMembers.length > 1 && (
          <div className="victory-squad-tabs">
            {squadMembers.map((member) => {
              const isSelected = member.unit.id === activeUnit?.id;
              const totalXp =
                member.result.earnedXp.fighter +
                member.result.earnedXp.rogue +
                member.result.earnedXp.mage;
              return (
                <button
                  key={member.unit.id}
                  className={`victory-squad-tab-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectSquadUnit?.(member.unit.id)}
                >
                  <span className="tab-unit-name">{member.unit.name.split(' ')[0]}</span>
                  <span className="tab-unit-xp">+{totalXp} XP</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Archetype XP Breakdown */}
        <div>
          <div className="victory-section-title">Archetype XP Earned ({activeUnit?.name})</div>
          <div className="xp-breakdown-row">
            <div className="xp-stat-box fighter">
              <div className="xp-stat-label">⚔️ Fighter</div>
              <div className="xp-stat-value">+{earnedXp.fighter} XP</div>
              <div className="xp-stat-sub">Carryover: {carryoverXp.fighter} XP</div>
            </div>
            <div className="xp-stat-box rogue">
              <div className="xp-stat-label">🗡️ Rogue</div>
              <div className="xp-stat-value">+{earnedXp.rogue} XP</div>
              <div className="xp-stat-sub">Carryover: {carryoverXp.rogue} XP</div>
            </div>
            <div className="xp-stat-box mage">
              <div className="xp-stat-label">🔮 Mage</div>
              <div className="xp-stat-value">+{earnedXp.mage} XP</div>
              <div className="xp-stat-sub">Carryover: {carryoverXp.mage} XP</div>
            </div>
          </div>
        </div>

        {/* Choice Prompt if Multiple Qualified */}
        {requiresChoice && (
          <div className="choice-prompt-card">
            <div className="victory-section-title text-gold">
              ✦ Multiple Paths Available!
            </div>
            <p className="choice-prompt-desc">
              Your actions qualified for multiple archetypes. Choose which path to advance first:
            </p>
            <div className="choice-buttons-grid">
              {qualifyingArchetypes.map((archetype) => (
                <button
                  key={archetype}
                  className="btn-choice"
                  onClick={() => onSelectArchetypeChoice(archetype)}
                >
                  {archetype === 'FIGHTER' && '⚔️ Advance Warrior (Fighter)'}
                  {archetype === 'ROGUE' && '🗡️ Advance Thief (Rogue)'}
                  {archetype === 'MAGE' && '🔮 Advance Wizard (Mage)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Unlocked Class & Stat Growth Celebration */}
        {unlockedClass && (
          <div className="level-unlock-card">
            <div className="level-unlock-header">
              <div className="class-title-glow">
                🌟 Unlocked: {unlockedClass.name}
              </div>
              <span className="level-tier-badge">Tier {unlockedClass.totalPoints} • Level 1</span>
            </div>

            <div className="unlock-stats-grid">
              <div>
                Health: <strong>{updatedVitals.maxHp} HP</strong>
              </div>
              <div>
                Force: <strong>{updatedAttributes.force}</strong> | Finesse: <strong>{updatedAttributes.finesse}</strong> | Focus: <strong>{updatedAttributes.focus}</strong>
              </div>
              <div>
                Mitigation: <strong>{updatedVitals.armor} Armor</strong> / <strong>{updatedVitals.ward} Ward</strong>
              </div>
              <div>
                Initiative: <strong>{updatedVitals.speed} Speed</strong> / <strong>{updatedVitals.move} Move</strong>
              </div>
            </div>
          </div>
        )}

        {/* Loadout Customizer Section */}
        <div className="loadout-customizer-section">
          <div className="victory-section-title">Configure Active Class & Loadout</div>

          {/* Active Class Selector */}
          <div className="customizer-row">
            <label className="customizer-label">Active Class:</label>
            <div className="class-selector-pills">
              {unlockedClasses.map((cid) => {
                const label =
                  cid === 'novice'
                    ? 'Novice'
                    : cid.charAt(0).toUpperCase() + cid.slice(1);
                const isSelected = selectedClassId === cid;
                const icon =
                  cid === 'warrior'
                    ? '⚔️'
                    : cid === 'thief'
                    ? '🗡️'
                    : cid === 'wizard'
                    ? '🔮'
                    : '🛡️';

                return (
                  <button
                    key={cid}
                    type="button"
                    className={`btn-class-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedClassId(cid)}
                  >
                    <span>{icon}</span> {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Deck Preview */}
          <div className="core-deck-preview">
            <div className="core-deck-title">
              <span>Core Class Deck (Locked to {selectedClassName})</span>
              <span className="core-passive-tag">
                Innate: <b>{innatePassive?.name}</b>
              </span>
            </div>
            <div className="core-abilities-chips">
              {coreAbilities.map((ability) => (
                <div key={ability.id} className="core-ability-chip" title={ability.description}>
                  <span className="core-chip-name">{ability.name}</span>
                  <span className="core-chip-cost">{ability.apCost} AP</span>
                </div>
              ))}
            </div>
          </div>

          {/* Wildcard Ability Slots */}
          <div className="wildcard-slots-container">
            <div className="wildcard-slot-box">
              <label className="customizer-label">Wildcard Ability 1:</label>
              <select
                className="customizer-select"
                value={wildcardAbility1}
                onChange={(e) => setWildcardAbility1(e.target.value)}
              >
                <option value="">(Empty Slot)</option>
                {eligibleWildcardAbilities
                  .filter((a) => a.id !== wildcardAbility2)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.apCost} AP)
                    </option>
                  ))}
              </select>
            </div>

            <div className="wildcard-slot-box">
              <label className="customizer-label">Wildcard Ability 2:</label>
              <select
                className="customizer-select"
                value={wildcardAbility2}
                onChange={(e) => setWildcardAbility2(e.target.value)}
              >
                <option value="">(Empty Slot)</option>
                {eligibleWildcardAbilities
                  .filter((a) => a.id !== wildcardAbility1)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.apCost} AP)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Wildcard Passive Slot */}
          <div className="wildcard-passive-container">
            <label className="customizer-label">Wildcard Passive Trait:</label>
            <select
              className="customizer-select"
              value={wildcardPassive}
              onChange={(e) => setWildcardPassive(e.target.value)}
            >
              <option value="">(No Wildcard Passive)</option>
              {eligibleWildcardPassives.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="victory-modal-actions">
          <button className="btn-rematch-action" onClick={handleConfirmRematch}>
            ⚔️ Continue / Rematch as {selectedClassName}
          </button>
          <button className="btn-dismiss-action" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
