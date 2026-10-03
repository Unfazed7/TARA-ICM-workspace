export interface Assessment {
  assessment_id: string;
  name: string;
  vehicle_type: string;
  domains: string[];
  status: 'active' | 'archived';
  completion_percentage: number;
  stages: Record<string, 'not_started' | 'pending' | 'running' | 'paused' | 'cancelled' | 'complete' | 'failed'>;
  created_at: string;
  updated_at: string;
  description?: string | null;
}

export interface PipelineRunStatus {
  stage_num: number;
  status: 'not_started' | 'pending' | 'running' | 'paused' | 'cancelled' | 'complete' | 'failed';
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

export interface AssetRegisterUploadStatus {
  uploaded: boolean;
  filename: string | null;
  asset_count: number;
}

export interface CreateAssessmentBody {
  name: string;
  description?: string;
  vehicle_type: string;
  domains: string[];
}

export interface UpdateAssessmentBody {
  name?: string;
  description?: string;
  status?: 'active' | 'archived';
}

export interface Checkpoint {
  checkpoint_id: string;
  assessment_id?: string;
  stage_num: number;
  stage_name: string;
  status: 'pending_review' | 'approved' | 'rejected';
  reviewer_id?: string | null;
  notes?: string | null;
  created_at: string;
  reviewed_at?: string | null;
}
