# Tasks

## 1. Screen Flow & Navigation Scaffolding

- [x] 1.1 Create `src/ui/start/StartScreen.tsx` with `New Game` action, disabled `Continue` placeholder, and verify unit tests in `src/ui/start/StartScreen.test.tsx`
- [x] 1.2 Implement top-level view routing (`START`, `CAMP`, `ARENA`, `DEV_SANDBOX`) and unobtrusive developer mode toggle in `src/App.tsx`
- [x] 1.3 Update `src/ui/combat/CombatArena.tsx`, `BattleVictoryModal.tsx`, and `BattleDefeatModal.tsx` to accept optional campaign encounter and reconciliation hand-offs (`onVictory`, `onDefeat`), verifying return-to-camp transitions

## 2. Camp Hub Layout & Active Vanguard Dock

- [x] 2.1 Implement `src/ui/camp/HeroCard.tsx` displaying token sprites, vitals, archetype XP progress bars, and glowing `✦ LEVEL READY` alerts using `DESIGN.md` tokens
- [x] 2.2 Implement `src/ui/camp/ActiveSquadDock.tsx` rendering 1–3 active hero cards with `[ Bench ]`, `[ Swap ]`, and empty slot placeholders
- [x] 2.3 Implement `src/ui/camp/ExpeditionWarRoom.tsx` rendering stage intel, threat budget rating, detected enemy unit token chips, readiness summary, and `[ DEPLOY SQUAD ]` button

## 3. Reserve Barracks & Smart Swapping

- [x] 3.1 Implement `src/ui/camp/ReserveBarracksTray.tsx` with category filter chips (`All`, `Level Ready`, classes) and compact hero cards
- [x] 3.2 Wire Smart Two-Way Swapping in `CampHub.tsx`: 1-click deploy when squad has open slots ($< 3$), benching when squad $> 1$, and 1-click replacement when squad is full ($3/3$)
- [x] 3.3 Implement `[ + Recruit Novice ]` button in the reserve tray to generate a fresh Level-0 Novice into `campaignState.roster`

## 4. Deep Progression Drawer

- [x] 4.1 Implement `src/ui/camp/HeroProgressionDrawer.tsx` slide-over overlay for inspecting the selected hero without leaving Camp
- [x] 4.2 Embed `ConstellationChart` pyramid inside the drawer with interactive archetype spend controls calling `advanceUnitLevel`
- [x] 4.3 Embed wildcard ability and passive mastery slot pickers inside the drawer calling `configureUnitLoadout`

## 5. Integration Verification & Quality Gate

- [x] 5.1 Create comprehensive integration test suite `src/ui/camp/CampHub.test.tsx` validating squad deployment, swapping, novice recruitment, level advancement, and combat handoff
- [x] 5.2 Run full project typecheck (`tsc --noEmit`) and verify all Vitest tests pass cleanly
