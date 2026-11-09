import Link from 'next/link';
import type {ReactNode} from 'react';
import {EditorialCampaign} from './editorial-campaign';
import {DEPARTMENT_COPY as C} from '@/constants/department-copy';
import type {CmsSectionDto} from '@/types/dto.types';
export interface DepartmentGatewayProps {sections:CmsSectionDto[];}
export function DepartmentGateway({sections}:DepartmentGatewayProps):ReactNode{
 const hero=sections.find(section=>(section.active??section.isActive)&&section.status==='published'&&section.type==='hero_campaign');
 return <main className="department-gateway"><h1 className="sr-only">{C.choose}</h1>{hero&&<EditorialCampaign section={hero}/>}<nav aria-label={C.choose} className="department-gateway-choices"><Link href="/men">{C.men}</Link><span aria-hidden="true"/><Link href="/women">{C.women}</Link></nav></main>;
}
