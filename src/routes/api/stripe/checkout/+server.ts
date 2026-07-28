import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { env } from '$env/dynamic/public';
import { apiError, getSupabaseAdmin, requireUser, writeAudit } from '$lib/server/supabase';
import { getStripe } from '$lib/server/stripe';
import { fulfilOrder } from '$lib/server/orders';

const schema=z.object({lines:z.array(z.object({slug:z.string().min(1),licence:z.enum(['standard','extended'])})).min(1).max(50)});
const orderNumber=()=>`AG-${new Intl.DateTimeFormat('en-GB',{year:'2-digit',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('/','')}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;

export async function POST({locals,request}:import('./$types').RequestEvent){
  let pendingOrderId:string|undefined;
  try{
    const user=await requireUser(locals);
    const body=schema.parse(await request.json());
    const unique=[...new Map(body.lines.map(line=>[line.slug,line])).values()];
    const admin=getSupabaseAdmin();
    const [{data:settings},{data:products,error:productsError}]=await Promise.all([
      admin.from('marketplace_settings').select('*').eq('id',1).single(),
      admin.from('products').select(`*,category:categories(commission_override),vendor:vendor_profiles!products_vendor_id_fkey(id,user_id,status,stripe_account_id,stripe_payouts_enabled,commission_percent),versions:product_versions(id,version,is_current,status)`).in('slug',unique.map(x=>x.slug)).eq('status','published')
    ]);
    if(productsError)throw productsError;
    if(settings?.maintenance_mode)return json({message:'Purchasing is temporarily paused.'},{status:503});
    if((products??[]).length!==unique.length)return json({message:'One or more basket items are no longer available.'},{status:409});

    const productMap=new Map((products as any[]).map(product=>[product.slug,product]));
    const items=unique.map(line=>{
      const product=productMap.get(line.slug)!;
      const version=(product.versions??[]).find((entry:any)=>entry.is_current&&entry.status==='approved')??(product.versions??[]).find((entry:any)=>entry.status==='approved');
      if(!version)throw new Error(`NO_APPROVED_VERSION:${product.title}`);
      if(product.vendor?.status!=='approved'||!product.vendor?.stripe_payouts_enabled)throw new Error(`VENDOR_NOT_READY:${product.title}`);
      const amount=line.licence==='extended'?(product.extended_price_pence??Math.round(product.price_pence*2.5)):product.price_pence;
      const commissionPercent=Number(product.category?.commission_override??product.vendor?.commission_percent??settings?.default_commission_percent??15);
      const commission=Math.round(amount*commissionPercent/100);
      return{line,product,version,amount,commission,net:amount-commission};
    });

    const subtotal=items.reduce((sum,item)=>sum+item.amount,0);
    const {data:order,error:orderError}=await admin.from('orders').insert({user_id:user.id,order_number:orderNumber(),status:'pending',currency:'gbp',subtotal_pence:subtotal,tax_pence:0,total_pence:subtotal,payment_method_summary:'Stripe'}).select('*').single();
    if(orderError)throw orderError;
    pendingOrderId=order.id;
    const {error:itemError}=await admin.from('order_items').insert(items.map(item=>({order_id:order.id,product_id:item.product.id,vendor_id:item.product.vendor.id,product_version_id:item.version.id,licence_type:item.line.licence,unit_amount_pence:item.amount,commission_pence:item.commission,vendor_net_pence:item.net,status:'pending'})));
    if(itemError)throw itemError;
    await writeAudit({actorId:user.id,actorRole:'buyer',action:'checkout.started',entityType:'order',entityId:order.id,metadata:{order_number:order.order_number,subtotal_pence:subtotal},request});

    const base=env.PUBLIC_SITE_URL||new URL(request.url).origin;
    if(subtotal===0){await fulfilOrder(order.id,null);pendingOrderId=undefined;return json({url:`${base}/checkout?order=${encodeURIComponent(order.order_number)}`});}

    const session=await getStripe().checkout.sessions.create({
      mode:'payment',customer_email:user.email??undefined,client_reference_id:order.id,
      success_url:`${base}/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${base}/basket?checkout=cancelled`,
      automatic_tax:{enabled:true},billing_address_collection:'required',allow_promotion_codes:true,
      line_items:items.map(item=>({quantity:1,price_data:{currency:'gbp',unit_amount:item.amount,product_data:{name:item.product.title,description:`${item.line.licence==='extended'?'Extended':'Standard'} licence · Version ${item.version.version}`,metadata:{assetguru_product_id:item.product.id,assetguru_order_item_product:item.product.slug}}}})),
      metadata:{assetguru_order_id:order.id,assetguru_order_number:order.order_number,assetguru_user_id:user.id},
      payment_intent_data:{transfer_group:`AG_ORDER_${order.id}`,metadata:{assetguru_order_id:order.id,assetguru_order_number:order.order_number}}
    });
    if(!session.url)throw new Error('Stripe did not return a checkout URL.');
    const {error:updateError}=await admin.from('orders').update({stripe_checkout_session_id:session.id}).eq('id',order.id);
    if(updateError)throw updateError;
    pendingOrderId=undefined;
    return json({url:session.url});
  }catch(error){
    console.error(error);
    if(pendingOrderId)await getSupabaseAdmin().from('orders').update({status:'failed'}).eq('id',pendingOrderId).eq('status','pending');
    if(error instanceof Error&&error.message.startsWith('NO_APPROVED_VERSION:'))return json({message:`${error.message.split(':')[1]} has no approved download package.`},{status:409});
    if(error instanceof Error&&error.message.startsWith('VENDOR_NOT_READY:'))return json({message:`${error.message.split(':')[1]} is temporarily unavailable for purchase.`},{status:409});
    const e=apiError(error);
    return json({message:error instanceof z.ZodError?'Your basket is invalid.':e.message},{status:error instanceof z.ZodError?400:e.status});
  }
}
