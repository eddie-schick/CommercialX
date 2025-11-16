/**
 * User and Organization Types
 * Based on "01. Organization" schema
 */

export interface UserProfile {
  user_id: string;
  organization_id: number;
  organization_name: string;
  organization_type: 'dealer' | 'upfitter' | 'fleet_operator' | 'oem' | 'charging_provider';
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'suspended' | 'removed';
  email_notifications: boolean;
  sms_notifications: boolean;
  is_verified: boolean;
}

export interface Organization {
  id: number;
  organization_type_id: number;
  organization_name: string;
  display_name?: string;
  slug: string;
  primary_email: string;
  primary_phone?: string;
  city?: string;
  state_province?: string;
  country: string;
  website_url?: string;
  logo_url?: string;
  is_verified: boolean;
  status: 'active' | 'suspended' | 'inactive' | 'pending_verification' | 'rejected';
  subscription_tier: 'free' | 'basic' | 'premium' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface OrganizationUser {
  id: number;
  organization_id: number;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions?: Record<string, boolean>;
  invited_by?: string;
  invited_at?: string;
  joined_at?: string;
  status: 'pending' | 'active' | 'suspended' | 'removed';
  email_notifications: boolean;
  sms_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignupData {
  email: string;
  password: string;
  organizationId?: number;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
  invitedBy?: string;
}

export interface UserPermissions {
  canCreateListings: boolean;
  canManageOrganization: boolean;
  canInviteUsers: boolean;
  canManageUsers: boolean;
  isAdmin: boolean;
  isOwner: boolean;
}

