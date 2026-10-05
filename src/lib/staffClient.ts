/**
 * Cliente tipado de las acciones de staff. Args y resultado salen del contrato
 * de `actions.ts` (solo el tipo: nada del servidor llega al bundle).
 */
import { actionsOf } from '@coongro/plugin-sdk';

import type { StaffActions } from '../actions.js';

export const staffClient = actionsOf<StaffActions>('staff.members');
