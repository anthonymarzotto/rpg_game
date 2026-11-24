# token-assets Specification Delta

## ADDED Requirements

### Requirement: Exact-Case Pixel Token Asset Parity
Every pixel token identifier registered in `AVAILABLE_PIXEL_TOKENS` (including Tier-4 Theurge `79_human_male`) SHALL have matching exact-case asset directories and rotation PNG files on disk at `public/assets/tokens/pixel/<tokenId>/Idle/rotations/<direction>.png` for all 8 standard directions (`east`, `north-east`, `north`, `north-west`, `west`, `south-west`, `south-east`, `south`), ensuring consistent rendering across both Windows development servers and case-sensitive production hosts.

#### Scenario: Theurge pixel token resolves to exact-case Idle asset files on disk
- **WHEN** `resolveTokenAssetPath` is called for a unit whose active class is Theurge
- **THEN** the resolved URL `/assets/tokens/pixel/79_human_male/Idle/rotations/<direction>.png` matches an exact-case `Idle` subdirectory and existing PNG file on disk

#### Scenario: All whitelisted pixel tokens pass exact-case disk parity validation
- **WHEN** the pixel token asset test suite inspects every entry in `AVAILABLE_PIXEL_TOKENS`
- **THEN** every token folder contains an exact-case `Idle` directory (not lowercase `idle`) with all 8 rotation PNG files present
