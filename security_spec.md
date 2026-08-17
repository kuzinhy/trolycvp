# Security Specification: Granular RBAC

## 1. Role Definitions
- **super_admin**: Full access (Read/Write/Delete).
- **admin**: Full access to operational data; restricted from system settings.
- **editor**: Read/Write for task/journal collections; No Delete.
- **viewer**: Read-only access to operational data.

## 2. Updated Helper Functions
We must enhance `isAdmin()` and introduce `hasRole(roleList)`.

```javascript
function getRole() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
}

function hasRole(allowed) {
  return isAuthenticated() && getRole() in allowed;
}
```

## 3. Targeted Collections
The following collections need RBAC review:
- `task_journals`
- `party_documents`
- `pending_knowledge`
- `tasks`

## 4. The "Dirty Dozen" Payloads (Examples)
1. Viewer attempts to delete task. (Should REJECT)
2. Editor attempts to delete task. (Should REJECT)
3. Editor attempts to create journal. (Should ALLOW)
4. Admin attempts to delete system_errors. (Should ALLOW)

5. Roles Enforcement Logic:
- `match /task_journals/{journalId}`
  - `allow list/get`: `hasRole(['super_admin', 'admin', 'editor', 'viewer'])`
  - `allow create/update`: `hasRole(['super_admin', 'admin', 'editor'])`
  - `allow delete`: `hasRole(['super_admin', 'admin'])`
