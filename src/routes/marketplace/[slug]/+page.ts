import type { PageLoad } from './$types';

export const load:PageLoad=async ({fetch,params})=>{
  const response=await fetch(`/api/catalogue/${encodeURIComponent(params.slug)}`);
  if(!response.ok)return {asset:null,creator:null,related:[]};
  return response.json();
};
