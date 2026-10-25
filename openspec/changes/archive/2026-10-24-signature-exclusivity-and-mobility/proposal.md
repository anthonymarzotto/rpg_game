# Proposal: Signature Ability Exclusivity & Mobility Refactor

## Why

In Astral Tactics, class packages are designed around the "1 Unique Signature Ability + 2 Domain Pool Abilities + 1 Innate Passive Trait" architecture. Signature Abilities are intended to represent the exclusive mechanical hallmark of their class package, while Domain Pool abilities represent the shared cross-class repertoire available to wayfarers who walk that constellation path.

However, an early implementation oversight in `src/core/units/loadout.ts` and `HeroProgressionDrawer.tsx` erroneously added Signature Abilities (`pkg.signatureAbility.id`) to the available wildcard pool. This created cross-class balance anomalies (e.g. Infiltrators and Cat-Burglars equipping Thief's `Sneak Attack` instead of domain skills) and contradicted every subsequent Tier 2 and Tier 3 OpenSpec package specification.

Simultaneously, tactical playtesting in item **2.1** revealed that Cat-Burglar's Tier 3 signature ability `Rooftop Vault` lacked distinct utility because Thief's Tier 1 domain ability `Shadow Step` could teleport across cliffs with identical vertical freedom and identical 2-hex range. Differentiating these abilities—constraining `Shadow Step` to same-elevation corridor phasing ($\Delta h = 0$) while elevating `Rooftop Vault` to a full 3-hex vertical 3D leap—restores clear tactical niches and eliminates redundancy.

## What Changes

- **Strict Signature Ability Exclusivity**:
  - **BREAKING (Loadouts)**: Remove Signature Abilities from the eligible Resonant/Wildcard ability pool in `src/core/units/loadout.ts` and `src/ui/camp/HeroProgressionDrawer.tsx`. Units may only equip Domain Pool abilities (or off-node milestone abilities) as wildcards.
  - Reject any loadout attempting to equip a Signature Ability in a wildcard slot during `validateUnitLoadout`.
  - Audit existing simulation configurations (`squadSimulation.ts`) and encounter definitions (`noviceSandbox.ts`) to replace illegal wildcard signature skills (such as `sneak_attack`) with valid domain skills (such as `skirmish`).
- **Shadow Step Flat Phase Restriction**:
  - Restrict `Shadow Step` to target hexes at the exact same elevation as the caster ($\Delta h = 0$). It cannot teleport up cliffs, onto battlements, or plunge down ledges (preventing fall damage avoidance).
- **Rooftop Vault 3D Acrobatics Buff**:
  - Increase `Rooftop Vault` base range from **2** to **3** hexes, matching full sprint distance while retaining full 3D verticality (scaling any cliff height and leaping across chasms) and granting $+2$ Evasion for 1 turn upon landing.
- **AI Decision Engine Alignment**:
  - Update `decisionEngine.ts` to respect same-elevation limits for `Shadow Step`, and leverage the expanded 3-hex leap radius for Cat-Burglar's 3-AP Solo Heist combo (`Flash Powder` $\rightarrow$ `Rooftop Vault` $\rightarrow$ `Pilfer`).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `campaign-progression`: Update loadout validation requirements to mandate that only Domain Pool abilities and off-node unlocked abilities are eligible for wildcard slots; Signature Abilities are strictly exclusive to the active class.
- `tier-3-cat-burglar`: Update `Rooftop Vault Signature Ability` requirement to specify base range 3 with unrestricted 3D verticality.
- `tier-1-thief`: Specify `Shadow Step` domain ability execution requirements, enforcing strict same-elevation targeting ($\Delta h = 0$).

## Impact

- **Core Engine**: `src/core/units/loadout.ts`, `src/core/combat/validator.ts`, `src/data/packages/thief.ts`, `src/data/packages/catBurglar.ts`.
- **UI & Camp**: `src/ui/camp/HeroProgressionDrawer.tsx` (wildcard options dropdown filtering).
- **AI Engine**: `src/core/ai/decisionEngine.ts` (teleport candidate elevation evaluation).
- **Simulations & Tests**: `src/core/combat/squadSimulation.ts`, `src/data/encounters/noviceSandbox.ts`, `src/core/units/loadout.test.ts`, `src/core/combat/catBurglarIntegration.test.ts`, `src/core/combat/abilities12.test.ts`, `src/core/ai/decisionEngine.test.ts`.
