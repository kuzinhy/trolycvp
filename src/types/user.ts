/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'vice_chief' | 'staff' | 'user' | 'super_admin';

/**
 * Interface for user/leader information.
 */
export interface UserInfo {
  /** Unique identifier for the user (UID) */
  id: string;
  /** Name displayed in the UI */
  displayName: string;
  /** URL to the user's profile picture */
  photoURL?: string;
  /** User's role in the system */
  role: UserRole;
  /** ID of the department/unit the user belongs to */
  departmentId: string;
  /** Email address of the user */
  email?: string;
  /** Compatibility field for UID */
  uid?: string;
  /** Compatibility field for unit ID */
  unitId?: string;
  /** Last login timestamp (number or Firestore FieldValue) */
  lastLogin?: any;
  /** Creation timestamp (number or Firestore FieldValue) */
  createdAt?: any;
}
