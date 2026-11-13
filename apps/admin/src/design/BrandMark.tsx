type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className={compact ? 'brand brand--compact' : 'brand'} aria-label="luckgage">
      <span className="brand__mark" aria-hidden="true">L</span>
      <span className="brand__copy">
        <strong>luckgage</strong>
        {!compact ? <small>Quản trị</small> : null}
      </span>
    </div>
  );
}
