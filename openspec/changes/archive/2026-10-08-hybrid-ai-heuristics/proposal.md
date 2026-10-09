# Proposal

## Why

All five Tier 3 dual-archetype hybrid class packages (Cavalier, Berserker, Highwayman, Warlock, Witch) are fully implemented and player-operable, but the headless AI decision engine lacks specialized tactical heuristics and validation for their distinct kits. Without dedicated scoring logic, AI-controlled hybrid combatants make generic or suboptimal decisions—such as Warlocks entering close melee instead of maintaining standoff distance, Highwaymen neglecting armor-shred primers before executing burst attacks, and Witches failing to accelerate allied frontline conduits with talisman haste.

Addressing this now completes Phase 5.6 of the development roadmap, ensuring that enemy squads and autonomous companions exhibit intelligent, class-authentic tactical behaviors ahead of the Stage 5+ campaign encounter expansion (Phase 5.7).

## What Changes

- **Ally-Targeted Move-and-Act Candidate Generation**: Extend the composite move-and-act evaluation loop in `decisionEngine.ts` to evaluate `targetType: 'ALLY'` and non-damaging buff abilities after repositioning, enabling support units like Witches to maneuver into range to buff teammates.
- **Support & Tempo Buff Heuristics**: Add scoring in `heuristics.ts` for `INITIATIVE_BOOST` and `SPEED` buffs (e.g. `Witch's Talisman`), prioritizing frontline allies with low CTB gauges or impending turns.
- **Tactical Primer & Combo Evaluation**:
  - Enhance `SKIRMISHER` evaluations so Highwaymen prioritize armor shred and CTB delay (`Stand and Deliver!`) on armored targets before follow-up attacks like `Point-Blank Buckshot`.
  - Enhance `BRAWLER` evaluations so Cavaliers value taunting (`Flamboyant Flourish`) high-threat targets when engaging frontline clusters.
  - Enhance `SNIPER` evaluations so Warlocks maintain range 2–3, prefer `Eldritch Blast` knockback against encroaching melee threats, and switch to `Pact Blade` when cornered by armored enemies.
  - Enhance `SUPPORT` evaluations so Witches prioritize cursing high-threat enemies (`Baleful Hex`) and spinning melee enemies away from vulnerable allies (`Poppet Needle`).
- **Comprehensive Decision Engine Integration Tests**: Add automated test suites in `decisionEngine.test.ts` covering full-turn execution for Cavalier, Berserker, Highwayman, Warlock, and Witch across diverse combat scenarios.

## Capabilities

### New Capabilities
- `hybrid-ai-heuristics`: Defines autonomous AI decision-making, behavioral profile execution, tactical primer scoring, and composite move-and-act heuristics for Tier 3 hybrid classes.

### Modified Capabilities
*None.*

## Impact

- **Affected Systems**: `src/core/ai/heuristics.ts`, `src/core/ai/decisionEngine.ts`, `src/core/ai/decisionEngine.test.ts`, and `src/core/ai/types.ts`.
- **API / Protocol Compatibility**: Fully backwards compatible with existing `AIProfile`, `AIAction`, and `decideNextAction()` signatures. Zero breaking changes to combat resolver, loadouts, or UI.
