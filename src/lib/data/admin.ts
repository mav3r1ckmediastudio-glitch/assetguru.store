export type ModerationStatus = 'Queued' | 'In review' | 'Changes requested' | 'Approved' | 'Rejected';
export type VendorStatus = 'Pending' | 'Approved' | 'More information' | 'Suspended';
export type CaseStatus = 'Open' | 'Investigating' | 'Resolved' | 'Declined';
export type ModerationItem = { id:string; databaseId?:string; title:string; vendor:string; category:string; submitted:string; version:string; type:string; risk:'Low'|'Medium'|'High'; status:ModerationStatus; files:string; notes?:string; };
export type VendorApplication = { id:string; databaseId?:string; name:string; owner:string; handle:string; email:string; country:string; submitted:string; appliedAt:string; approvedAt?:string; portfolio:string; products:string; status:VendorStatus; stripe:string; commission:number; risk:'Low'|'Medium'|'High'; reason?:string; };
export type AdminCase = { id:string; databaseId?:string; type:string; product:string; vendor:string; buyer:string; amount:number; opened:string; priority:'Normal'|'High'|'Urgent'; status:CaseStatus; summary:string; orderId?:string; paymentState?:string; downloadCount:number; };
export type CatalogueCategory = { id:string; name:string; slug:string; products:number; published:number; pending:number; featured:boolean; visible:boolean; commissionOverride?:number; };
export type PlatformSettings = {
  marketplaceName:string; supportEmail:string; defaultCommission:number; minimumPrice:number; payoutDelay:number;
  autoApproveUpdates:boolean; requireHumanReview:boolean; allowFreeAssets:boolean; allowAiAssisted:boolean;
  maintenanceMode:boolean; matureContent:string; buyerReviewDelay:number; refundWindow:number; featuredLabel:string;
};

export type AdminMetrics = {
  gmv:number; orders:number; marketplaceRevenue:number; averageOrder:number; refundRate:number;
  averageRating:number; activeVendors:number; publishedProducts:number; paidItems:number;
};
export type AdminCategoryReport = { name:string; gmv:number; orders:number; share:number; };
export const emptyAdminMetrics: AdminMetrics = { gmv:0,orders:0,marketplaceRevenue:0,averageOrder:0,refundRate:0,averageRating:0,activeVendors:0,publishedProducts:0,paidItems:0 };

export type AuditEvent = { id:string; actor:string; role:string; action:string; target:string; time:string; tone:'good'|'warn'|'neutral'; };
export const defaultPlatformSettings: PlatformSettings = {
  marketplaceName:'AssetGuru', supportEmail:'', defaultCommission:15, minimumPrice:2.99, payoutDelay:14,
  autoApproveUpdates:false, requireHumanReview:true, allowFreeAssets:true, allowAiAssisted:true,
  maintenanceMode:false, matureContent:'Tagged and moderated', buyerReviewDelay:3, refundWindow:14, featuredLabel:'Guru Pick'
};
