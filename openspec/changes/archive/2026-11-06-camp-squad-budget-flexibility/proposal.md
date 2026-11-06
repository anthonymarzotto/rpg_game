# Proposal: Camp Squad Budget Flexibility

## Why

In Camp, units can advance levels and ascend archetype ranks, increasing their threat point value and potentially placing the active Vanguard over the stage deployment budget. Currently, `setCampActiveSquad` throws an unhandled exception whenever an active squad's threat exceeds the stage budget, which prevents players from using the Withdraw button or swapping units to resolve the budget deficit whenever an intermediate squad remains over budget.

## What Changes

- Decouple intermediate squad configuration changes in Camp from the hard threat budget throw in `setCampActiveSquad`.
- Allow players to withdraw, swap, and configure units in the Vanguard dock regardless of intermediate threat budget states.
- Rely on the Expedition War Room's deployment gate (`Enter Trial` CTA) to enforce the stage threat budget, keeping trial embarkation deactivated while the Vanguard is over budget or empty.
- Move the verbose over-budget warning text in `ExpeditionWarRoom.tsx` from an inline warning element to a tooltip (`title` attribute) on the disabled `✦ ENTER TRIAL` button, keeping the War Room interface clean and concise.
- Update `CampHub.tsx` handler logic (`handleBenchHero`, `handleSelectForSwap`, `handleDeployHero`) to provide consistent behavior without unhandled exceptions.
- Synchronize placed encounter units in `currentEncounter` on every valid squad change in Camp.

### Versioning Assessment
- **Target Version**: `0.12.1` (Patch)
- **Rationale**: This change fixes a defect/soft-lock in Camp squad management where withdrawing or swapping units was rejected if the resulting squad remained over the stage deployment budget, and polishes the War Room UI by moving the verbose overage warning to a tooltip on the Enter Trial button. It contains no breaking changes to saved campaign formats or public APIs.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `campaign-progression`: Update the `Camp Roster and Loadout Management` requirement to permit active squad configuration changes in Camp even if the squad exceeds the stage deployment budget, while enforcing the deployment budget constraint at trial embarkation.

## Impact

- **Affected Code**:
  - `src/core/campaign/transitions.ts`: Remove the hard budget throw from `setCampActiveSquad` to allow Camp squad modifications.
  - `src/ui/camp/CampHub.tsx`: Ensure `handleBenchHero`, `handleSelectForSwap`, and `handleDeployHero` operate smoothly with over-budget states.
  - `src/ui/camp/ExpeditionWarRoom.tsx`: Relocate inline over-budget warning text to the `✦ ENTER TRIAL` button's tooltip (`title` attribute) while maintaining disabled state.
  - `src/App.tsx`: Defense-in-depth budget check in `handleDeploySquad`.
  - Unit and integration tests in `transitions.test.ts`, `CampHub.test.tsx`, and `ExpeditionWarRoom.test.tsx`.
- **Dependencies**: No external dependency changes.
- **Save File Compatibility**: 100% backwards compatible with existing `CampaignState` data structures.
