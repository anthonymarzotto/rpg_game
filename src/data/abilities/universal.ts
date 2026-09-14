import { Ability } from '../../core/types/ability';

export const MOVE_ACTION: Ability = {
  id: 'move',
  name: 'Move',
  description: 'Traverse up to your Move distance in hexes.',
  apCost: 1,
  range: 0,
  targetType: 'HEX',
  defenseTarget: 'NONE',
  damageType: 'NONE'
};

export const WAIT_ACTION: Ability = {
  id: 'wait',
  name: 'Wait',
  description: 'Conclude your turn, recovering 20 initiative gauge points per unspent AP.',
  apCost: 0,
  range: 0,
  targetType: 'SELF',
  defenseTarget: 'NONE',
  damageType: 'NONE'
};

export const UNIVERSAL_ACTIONS: readonly Ability[] = [
  MOVE_ACTION,
  WAIT_ACTION
];
