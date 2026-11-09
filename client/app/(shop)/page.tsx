// Governed by .rules v1.0
import {DepartmentGateway} from '@/components/home/department-gateway';
import type { ReactNode } from 'react';
import { serverApi } from '@/lib/server-api';
import type { ApiEnvelope } from '@/types/api.types';
import type { CmsExperienceDto } from '@/types/dto.types';

export const dynamic = "force-dynamic";

async function loadCmsHome(): Promise<CmsExperienceDto | null> {
  try {
    const response = await serverApi.get<ApiEnvelope<CmsExperienceDto>>('/cms/home');
    return response.data.data;
  } catch (_error: unknown) {
    return null;
  }
}

export default async function HomePage(): Promise<ReactNode> {
  const cms = await loadCmsHome();
  return <DepartmentGateway sections={cms?.sections??[]}/>;
}
