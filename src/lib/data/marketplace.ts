import { get } from 'svelte/store';
import {
  catalogueAssets,
  catalogueCategories,
  catalogueCreators,
  featuredCatalogueAssets,
  topCatalogueCreators
} from '$lib/stores/catalogue';

export type Accent = 'cyan' | 'magenta' | 'violet' | 'amber' | 'green' | 'blue' | 'red';
export type LicenceKey = 'standard' | 'extended';

export type Asset = {
  id?: string;
  currentVersionId?: string;
  slug: string;
  title: string;
  category: string;
  subcategory: string;
  creator: string;
  creatorSlug: string;
  creatorAvatar: string;
  image: string;
  gallery: string[];
  showcaseVideoUrl?: string;
  price: number;
  oldPrice?: number;
  extendedPrice?: number;
  rating: number;
  reviews: number;
  sales: number;
  badge?: 'New' | 'Bestseller' | 'Top rated' | 'Featured' | 'Sale' | 'Free';
  accent: Accent;
  compatibility: string;
  maxVersion: '2024+' | '2025+' | '2026+' | 'Any MAX build';
  sourceFiles: boolean;
  dependencies: string;
  downloadSize: string;
  performance: 'Lightweight' | 'Mid-range' | 'High detail';
  updated: string;
  version: string;
  summary: string;
  description: string;
  features: string[];
  contents: string[];
  tags: string[];
  formats: string[];
  licence: string;
  recentReviews: { buyer:string; rating:number; title:string; text:string; date:string }[];
};

export type Category = {
  id?: string;
  slug?: string;
  name: string;
  count: string;
  icon: string;
  description: string;
  accent: Accent;
};

export type Creator = {
  id?: string;
  slug: string;
  name: string;
  avatar: string;
  banner: string;
  tagline: string;
  bio: string;
  rating: number;
  reviews: number;
  sales: number;
  followers: number;
  joined: string;
  responseTime: string;
  location: string;
  specialties: string[];
  verified: boolean;
  recentReviews: { rating:number; title:string; text:string; date:string }[];
  supportPromise: string;
  updateCommitment: string;
  licenceNotes: string;
};

export const assets = catalogueAssets;
export const categories = catalogueCategories;
export const creators = catalogueCreators;
export const featuredAssets = featuredCatalogueAssets;
export const topCreators = topCatalogueCreators;

export function getAsset(slug: string) {
  return get(catalogueAssets).find((asset) => asset.slug === slug);
}

export function getCreator(slug: string) {
  return get(catalogueCreators).find((creator) => creator.slug === slug);
}

export function assetPrice(asset: Asset, licence: LicenceKey = 'standard') {
  return licence === 'extended' ? (asset.extendedPrice ?? asset.price * 2.5) : asset.price;
}
