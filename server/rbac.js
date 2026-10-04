"use strict";
// Minimal, extensible RBAC. ADMIN permissions are separate from FOUNDER identity: an account can be
// both, but neither implies the other. OWNER is the operator account (operator-config ownerAccount).
const PERMISSIONS = Object.freeze(["VIEW_USERS", "EDIT_USER_PROGRESS", "GRANT_CONTENT", "REVOKE_CONTENT", "MODIFY_CURRENCY",
  "TEST_CONTENT", "MANAGE_EVENTS", "MANAGE_CHAMPIONS", "VIEW_AUDIT_LOG", "MANAGE_CONFIG", "MANAGE_ROLES"]);
const ROLES = Object.freeze({
  OWNER: PERMISSIONS,
  ADMIN: PERMISSIONS.filter(p => p !== "MANAGE_ROLES"),
  SUPPORT: ["VIEW_USERS", "VIEW_AUDIT_LOG", "GRANT_CONTENT"],
  TESTER: ["TEST_CONTENT"]
});
const ASSIGNABLE = Object.freeze(Object.keys(ROLES).filter(r => r !== "OWNER"));
// ops.roles = {"<userId>": ["ADMIN", ...]} (stored server-side in GM operations state).
// isOwner.configRoles(user), when present, adds roles from operator-config "roles" (resolved to stable
// account ids at startup). Neither source can ever grant OWNER.
function rolesOf(user, ops, isOwner){
  if(!user) return [];
  const fromConfig = typeof isOwner.configRoles === "function" ? isOwner.configRoles(user) || [] : [];
  const assigned = [...new Set([...((ops && ops.roles && ops.roles[user.id]) || []), ...fromConfig])].filter(r => ASSIGNABLE.includes(r));
  return isOwner(user) ? ["OWNER", ...assigned.filter(r => r !== "OWNER")] : assigned;
}
function permissionsOf(roles){ return [...new Set(roles.flatMap(r => ROLES[r] || []))]; }
function can(user, ops, isOwner, permission){ return permissionsOf(rolesOf(user, ops, isOwner)).includes(permission); }
module.exports = {PERMISSIONS, ROLES, ASSIGNABLE, rolesOf, permissionsOf, can};
