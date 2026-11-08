
'use client';
import type {ReactNode} from 'react';
import {WorkspaceDashboard,type WorkspaceMetric} from '@cruisin/ui';
import {ADMIN_NAVIGATION} from '@/components/dashboard/sidebar';
import {ADMIN_WORKSPACE_COPY as W} from '@/constants/workspace-copy';
import {COPY} from '@/constants/copy';
import {useAdminAnalytics,useAdminOverview,useAdminOrders,useAdminMe} from '@/hooks/useAdminResources';
import {useAdminLogout} from '@/hooks/useAdminAuth';
import {formatPrice} from '@/lib/utils';
export default function OverviewPage():ReactNode{
 const overview=useAdminOverview();const analytics=useAdminAnalytics(14);const orders=useAdminOrders();const me=useAdminMe();const logout=useAdminLogout();const data=overview.data;
 const metrics:WorkspaceMetric[]=[{id:'revenue',label:COPY.overview.revenue,value:formatPrice(data?.revenue??0),detail:W.revenueDetail,tone:'amber',href:'/analytics'},{id:'orders',label:COPY.overview.orders,value:String(data?.orders??0),detail:W.ordersDetail,tone:'blue',href:'/orders'},{id:'users',label:COPY.overview.users,value:String(data?.users??0),detail:W.usersDetail,tone:'rose',href:'/users'},{id:'products',label:COPY.overview.products,value:String(data?.products??0),detail:W.productsDetail,tone:'mint',href:'/products'}];
 return <WorkspaceDashboard role="admin" title={COPY.overview.title} subtitle={W.subtitle} name={me.data?.name??W.name} metrics={metrics} series={(analytics.data??[]).map(point=>({label:point.day.slice(5),value:point.orders}))} seriesTitle={W.series} activity={(orders.data??[]).slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,5).map(order=>({id:order._id??order.id,title:order.orderNumber??order.id,detail:formatPrice(order.total),status:order.orderStatus,href:'/orders/'+(order._id??order.id),tone:order.orderStatus==='delivered'?'mint':'blue'}))} modules={ADMIN_NAVIGATION.map(link=>({label:link.label,href:link.href}))} shortcuts={[...W.shortcuts]} urls={{admin:process.env.NEXT_PUBLIC_ADMIN_URL??'http://127.0.0.1:3193',employee:process.env.NEXT_PUBLIC_EMPLOYEE_URL??'http://127.0.0.1:3194',storefront:process.env.NEXT_PUBLIC_STOREFRONT_URL??'http://127.0.0.1:3192'}} loading={overview.isLoading||analytics.isLoading||orders.isLoading} error={overview.isError||analytics.isError||orders.isError} onRefresh={()=>{void overview.refetch();void analytics.refetch();void orders.refetch();}} onLogout={logout}/>;
}
