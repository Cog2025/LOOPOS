//components/utils/rbac.ts
import { Role, User, Plant } from '../../types';

const overlap = (a?: string[], b?: string[]) =>
  !!(a && b && a.some(x => b.includes(x)));

export const canViewUser = (actor: User, target: User) => {
  const ar = actor.role, tr = target.role;
  if (ar === Role.ADMIN) return true;
  if (ar === Role.OPERATOR) return true;
  if (ar === Role.COORDINATOR) {
    if (tr === Role.ADMIN) return false;
    if ([Role.SUPERVISOR,Role.TECHNICIAN,Role.ASSISTANT].includes(tr))
      return overlap(actor.plantIds, target.plantIds);
    return true;
  }
  if (ar === Role.SUPERVISOR) {
    if ([Role.ADMIN,Role.COORDINATOR].includes(tr)) return false;
    if ([Role.TECHNICIAN,Role.ASSISTANT].includes(tr))
      return overlap(actor.plantIds, target.plantIds);
    return (tr === Role.SUPERVISOR && actor.id === target.id);
  }
  if (ar === Role.TECHNICIAN) {
    if (tr === Role.ASSISTANT) return overlap(actor.plantIds, target.plantIds);
    return (tr === Role.TECHNICIAN && actor.id === target.id);
  }
  if (ar === Role.ASSISTANT) {
    return tr === Role.TECHNICIAN && overlap(actor.plantIds, target.plantIds);
  }
  return false;
};

export const canEditUser = (actor: User, target: User) => {
  const ar = actor.role, tr = target.role;
  if (ar === Role.ADMIN) return true;
  if (ar === Role.OPERATOR) return [Role.OPERATOR,Role.TECHNICIAN,Role.ASSISTANT].includes(tr);
  if (ar === Role.COORDINATOR)
    return tr !== Role.ADMIN && [Role.SUPERVISOR,Role.TECHNICIAN,Role.ASSISTANT].includes(tr)
           && overlap(actor.plantIds, target.plantIds);
  if (ar === Role.SUPERVISOR)
    return ![Role.ADMIN,Role.COORDINATOR].includes(tr)
           && [Role.TECHNICIAN,Role.ASSISTANT].includes(tr)
           && overlap(actor.plantIds, target.plantIds);
  if (ar === Role.TECHNICIAN)
    return tr === Role.ASSISTANT && overlap(actor.plantIds, target.plantIds);
  return false;
};

export const canViewPlant = (actor: User, plant: Plant) =>
  actor.role === Role.ADMIN || actor.role === Role.OPERATOR || (actor.plantIds || []).includes(plant.id);

export const canEditPlant = (actor: User, plant: Plant) =>
  actor.role === Role.ADMIN || actor.role === Role.OPERATOR ||
  ([Role.COORDINATOR,Role.SUPERVISOR].includes(actor.role) && (actor.plantIds || []).includes(plant.id));