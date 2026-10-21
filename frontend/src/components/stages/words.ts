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

/**
 * Tint of a file-type chip by file kind (D-51: the one use of colour that is not state).
 * Diagrams blue, images yellow, text and documents green, anything else grey.
 */
export function fileKindTone(file: string): 'blue' | 'yellow' | 'green' | 'grey' {
  const ext = file.split('.').pop()?.toLowerCase() || '';
  if (['drawio', 'vsdx', 'vsd', 'lucid'].includes(ext)) return 'blue';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'yellow';
  if (['md', 'txt', 'html', 'htm', 'docx', 'doc', 'pdf'].includes(ext)) return 'green';
  return 'grey';
}

export const TONE_CHIP: Record<'blue' | 'yellow' | 'green' | 'grey' | 'red', string> = {
  blue: 'bg-state-blue text-state-blue-foreground',
  yellow: 'bg-state-yellow text-state-yellow-foreground',
  green: 'bg-state-green text-state-green-foreground',
  grey: 'bg-state-grey text-state-grey-foreground',
  red: 'bg-state-red text-state-red-foreground',
};

/** File size in plain words, e.g. "41 KB". */
export function sizeWords(bytes?: number): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
