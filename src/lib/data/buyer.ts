import type { LicenceKey } from '$lib/data/marketplace';

export type BuyerProfile = {
  name: string;
  email: string;
  initials: string;
  country: string;
  studio: string;
  joined: string;
  avatarTone: 'cyan' | 'violet' | 'magenta';
  marketing: boolean;
  updateEmails: boolean;
};

export type BuyerOrderItem = {
  id?: string;
  versionId?: string;
  slug: string;
  licence: LicenceKey;
  price: number;
  version: string;
  refunded?: boolean;
  refundStatus?: 'Requested' | 'Approved' | 'Declined';
};

export type BuyerOrder = {
  id: string;
  databaseId?: string;
  date: string;
  timestamp: number;
  status: 'Pending' | 'Complete' | 'Partially refunded' | 'Refunded' | 'Failed';
  payment: string;
  subtotal: number;
  vat: number;
  total: number;
  items: BuyerOrderItem[];
};

export type BuyerReview = { id?: string; slug: string; rating: number; title: string; text: string; submitted: string; };
export type SupportTicket = {
  databaseId?: string;
  id: string;
  subject: string;
  category: 'Asset support' | 'Order & billing' | 'Refund request' | 'Account';
  status: 'Open' | 'Waiting on creator' | 'Resolved';
  updated: string;
  productSlug?: string;
  orderId?: string;
  message: string;
};
export type DownloadEvent = { slug: string; version: string; downloadedAt: string; };

export const defaultBuyerProfile: BuyerProfile = {
  name: '', email: '', initials: 'AG', country: 'United Kingdom', studio: '', joined: '',
  avatarTone: 'cyan', marketing: false, updateEmails: true
};
