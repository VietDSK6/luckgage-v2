type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={compact ? 'brand brand--compact' : 'brand'} aria-label="luckgage">
      <span className="brand__tag" aria-hidden="true">
        <span className="brand__hole" />
        <span className="brand__route" />
      </span>
      <span className="brand__copy">
        <strong>luckgage</strong>
        {!compact ? <small>control desk</small> : null}
      </span>
    </div>
  );
}
