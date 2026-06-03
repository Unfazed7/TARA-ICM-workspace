export interface Assessment {
  assessment_id: string;
  name: string;
  vehicle_type: string;
  domains: string[];
  status: 'active' | 'archived';
  completion_percentage: number;
  stages: Record<string, 'not_started' | 'pending' | 'running' | 'complete' | 'failed'>;
  created_at: string;
}

export interface PipelineRunStatus {
  stage_num: number;
  status: 'not_started' | 'pending' | 'running' | 'complete' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface CreateAssessmentBody {
  name: string;
  description?: string;
  vehicle_type: string;
  domains: string[];
}
