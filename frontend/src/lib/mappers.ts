import type { Assessment } from '@/types/api';
import type { Project, VehicleType, ProjectDomain } from '@/types/tara';

export function assessmentToProject(a: Assessment): Project {
  return {
    id: a.assessment_id,
    name: a.name,
    vehicleType: a.vehicle_type as VehicleType,
    catalogVersion: 'iso21434-2021',
    domains: a.domains as ProjectDomain[],
    scope: 'vehicle',
    workflowMode: 'ai-assisted',
    status: 'active',
    createdAt: a.created_at,
    updatedAt: a.created_at,
    completionPercentage: a.completion_percentage,
    threatCount: 0,
    riskCount: 0,
  };
}
