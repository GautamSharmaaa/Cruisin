import type {ReactNode} from 'react';
import {CmsHomepage} from './cms-homepage';
import {EditorialCampaign} from './editorial-campaign';
import {DEPARTMENT_COPY as C} from '@/constants/department-copy';
import type {CmsSectionDto} from '@/types/dto.types';
export interface DepartmentGatewayProps {sections:CmsSectionDto[];}
export function DepartmentGateway({sections}:DepartmentGatewayProps):ReactNode{
 const hero=sections.find(section=>(section.active??section.isActive)&&section.status==='published'&&section.type==='hero_campaign');
 return <main className="department-gateway"><div className="department-gateway-entry"><h1 className="sr-only">{C.choose}</h1>{hero&&<EditorialCampaign section={hero} priority/>}</div><CmsHomepage sections={sections.filter(section=>section!==hero)}/></main>;
}
