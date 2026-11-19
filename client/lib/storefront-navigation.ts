import type {NavigationItemDto} from '@/types/dto.types';
export const storefrontDepartments=[{label:'Men',href:'/men'},{label:'Women',href:'/women'},{label:'Collections',href:'/collections'},{label:'Sale',href:'/sale'}] as const;
export function storefrontNavigation(items:NavigationItemDto[]):NavigationItemDto[]{
 const visible=items.filter(item=>item.isVisible).sort((a,b)=>a.sortOrder-b.sortOrder);
 return items.length?visible:storefrontDepartments.map((department,index)=>({id:'department-'+index,slug:department.href.slice(1),...department,type:'simple_link',sortOrder:index,isVisible:true,isMegaMenuEnabled:false,columns:[]}));
}
