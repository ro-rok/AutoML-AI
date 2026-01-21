// src/components/OptimizedImage.tsx
import { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  fallback?: string; // Fallback image if WebP fails
}

/**
 * Optimized image component with lazy loading and WebP support
 * Automatically lazy loads images below the fold
 * Provides fallback for browsers that don't support WebP
 */
export default function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  loading = 'lazy',
  fallback,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Determine if image should be lazy loaded
  const shouldLazyLoad = loading === 'lazy';

  // Get the appropriate src (use fallback if error and fallback provided)
  const imageSrc = hasError && fallback ? fallback : src;

  useEffect(() => {
    if (!shouldLazyLoad) {
      return;
    }

    // Use Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && imgRef.current) {
            const img = imgRef.current;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [shouldLazyLoad]);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Loading placeholder */}
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-gray-800 animate-pulse rounded"
          style={{ width, height }}
        />
      )}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={shouldLazyLoad ? undefined : imageSrc}
        data-src={shouldLazyLoad ? imageSrc : undefined}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        width={width}
        height={height}
        loading={loading}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          if (!fallback) {
            setIsLoaded(true); // Show broken image if no fallback
          }
        }}
      />
    </div>
  );
}
