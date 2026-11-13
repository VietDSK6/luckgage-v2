import { useState } from 'react';

type ContentImageProps = {
  src: string;
  alt: string;
  className: string;
};

export function ContentImage({ src, alt, className }: ContentImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return <div aria-label={alt || 'Ảnh không có sẵn'} className={`${className} content-image--fallback`} role="img"><span aria-hidden="true">{alt || 'Ảnh không có sẵn'}</span></div>;
  }
  return <img alt={alt} className={className} onError={() => setFailedSrc(src)} src={src} />;
}
