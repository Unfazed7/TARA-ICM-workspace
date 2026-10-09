/** Plain words for the stage screens: document types, asset types, topics (specs 23, 24). */

import type { DocGroup, ScopeStatus, Topic } from '@/types/stages';

/** The dropdown lists. They must match checkpoint_api/document_types.py LABELS. */
export const DOC_LABELS: Record<DocGroup, string[]> = {
  components: [
    'Architecture diagram',
    'Component diagram',
    'Infrastructure or sizing document',
    'Cloud configuration export',
    'Existing item definition',
    'Asset list',
  ],
  behaviour: [
    'Functional description',
    'SRS',
    'Spec book',
    'API specification',
    'User manual',
    'Client answers (Q&A)',
  ],
};

export const GROUP_TITLE: Record<DocGroup, string> = {
  components: "Documents describing the system's components/architecture",
  behaviour: 'Documents describing what the system does',
};

/** Label shown for an uploaded document whose upload carried no label (older uploads). */
const TYPE_WORDS: Record<string, string> = {
  diagram: 'Architecture diagram',
  infra: 'Infrastructure or sizing document',
  config_export: 'Cloud configuration export',
  existing_item_definition: 'Existing item definition',
  asset_list: 'Asset list',
  functional: 'Functional description',
  srs: 'SRS',
  api_spec: 'API specification',
  manual: 'User manual',
  qa: 'Client answers (Q&A)',
  other: 'Other',
};

export const typeWords = (docType: string, label?: string) => label || TYPE_WORDS[docType] || docType;

/** Group a document counts for when the upload did not say (mirrors the server). */
export function groupOfType(docType: string): DocGroup | null {
  if (['diagram', 'infra', 'config_export', 'existing_item_definition', 'asset_list'].includes(docType)) return 'components';
  if (['functional', 'srs', 'api_spec', 'manual', 'qa'].includes(docType)) return 'behaviour';
  return null;
}

const ASSET_WORDS: Record<string, string> = {
  ecs_service: 'ECS service',
  kms_key: 'KMS key',
  cdn: 'CDN',
  api_gateway: 'API gateway',
  ci_cd_pipeline: 'CI/CD pipeline',
  sso: 'SSO',
  unknown_kind: 'Not covered yet',
};

/** "load_balancer" becomes "Load balancer"; known acronyms keep their case. */
export function assetWords(assetType: string, label?: string): string {
  if (assetType === 'unknown_kind' && label) return `${label} (not covered yet)`;
  if (ASSET_WORDS[assetType]) return ASSET_WORDS[assetType];
  const words = assetType.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const TOPIC_ORDER: Topic[] = ['exposure', 'sign_in', 'scope', 'environment', 'data', 'naming', 'reading'];
export const TOPIC_WORDS: Record<Topic, string> = {
  exposure: 'Exposure',
  sign_in: 'Sign-in',
  scope: 'Scope',
  environment: 'Environment',
  data: 'Data',
  naming: 'Naming',
  reading: 'Reading notes',
};

export const SCOPE_WORDS: Record<ScopeStatus, string> = {
  in_scope: 'In scope',
  interface: 'Interface',
  out_of_scope: 'Out of scope',
  ambiguous: 'Not decided',
};

export const ACTOR_TYPES = new Set(['human_actor', 'system_to_system_client']);
export const EXTERNAL_ZONES = new Set(['internet_external', 'corporate_it', 'third_party_saas', 'vehicle_field_device']);
