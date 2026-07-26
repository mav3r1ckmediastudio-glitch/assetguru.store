export type UserRole = 'buyer' | 'vendor' | 'admin';
export type VendorStatus = 'pending' | 'more_information' | 'approved' | 'suspended';
export type ProductStatus = 'draft' | 'in_review' | 'changes_requested' | 'published' | 'retired' | 'rejected';
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Replace with generated Supabase types via `npm run db:types` after linking the project.
// `any` keeps the starter deployable before a concrete project schema is generated.
export type Database = any;
