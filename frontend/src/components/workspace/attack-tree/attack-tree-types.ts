export type AttackTreeNodeType = 'root' | 'and-gate' | 'or-gate' | 'leaf';

export interface AttackTreeNodeData {
  label: string;
  type: AttackTreeNodeType;
  difficulty?: number; // 1-5 for leaf nodes
  detail?: string;
  calculatedScore?: number;
}
