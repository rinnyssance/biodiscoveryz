import { Tag } from '../Common/Common';

/** Preliminary screening is never shown as a diagnosis. */
export function ScreeningStatus({ preliminary, validated }: { preliminary: boolean; validated: boolean }) {
  if (validated) return <Tag kind="source">Validated flag</Tag>;
  if (preliminary) return <Tag kind="changed">Preliminary flag</Tag>;
  return <span className="small muted">Not flagged</span>;
}
