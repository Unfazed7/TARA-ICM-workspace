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

export interface StageDefinition {
  stage_num: number;
  key: string;
  name: string;
  description: string;
  dependencies: number[];
  outputs: string[];
  checkpoint: string | null;
  available: boolean;
}

export interface AssetRegisterImportResult {
  filename: string;
  asset_count: number;
  stage_num: 3;
  status: 'complete';
}

export interface CreateAssessmentBody {
  name: string;
  description?: string;
  vehicle_type: string;
  domains: string[];
}
