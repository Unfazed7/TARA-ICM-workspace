import { BoundaryReview } from './BoundaryReview';

export function ItemDefinition({ assessmentId }: { assessmentId: string }) {
  return <BoundaryReview assessmentId={assessmentId} />;
}
