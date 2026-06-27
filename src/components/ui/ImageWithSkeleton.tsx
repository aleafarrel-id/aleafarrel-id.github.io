import React, { useState, useRef, useEffect } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const loadedImageCache = new Set<string>();

interface ImageWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  skeletonClassName?: string;
  skeletonBorderRadius?: string | number;
}

export const ImageWithSkeleton: React.FC<ImageWithSkeletonProps> = ({ 
  skeletonClassName = '', 
  skeletonBorderRadius = 0,
  className = '',
  alt = '',
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(() => {
    return props.src ? loadedImageCache.has(props.src) : false;
  });
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (props.src && loadedImageCache.has(props.src)) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
      if (imgRef.current && imgRef.current.complete) {
        setIsLoaded(true);
        if (props.src) loadedImageCache.add(props.src);
      }
    }
  }, [props.src]);

  return (
    <>
      {!isLoaded && (
        <div className={`absolute inset-0 pointer-events-none z-0 ${skeletonClassName}`}>
          <Skeleton 
            height="100%" 
            width="100%" 
            borderRadius={skeletonBorderRadius}
            baseColor="var(--clr-bg-raised)" 
            highlightColor="var(--shadow-light)" 
            style={{ position: 'absolute', inset: 0, display: 'block' }}
          />
        </div>
      )}
      <img
        {...props}
        ref={imgRef}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500 relative z-10`}
        onLoad={(e) => {
          setIsLoaded(true);
          if (props.src) loadedImageCache.add(props.src);
          if (props.onLoad) props.onLoad(e);
        }}
      />
    </>
  );
};
