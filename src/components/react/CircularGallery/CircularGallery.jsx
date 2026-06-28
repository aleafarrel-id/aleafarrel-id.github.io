import { Suspense, lazy, useEffect, useState } from 'react';
import './CircularGallery.css';

const CircularGalleryCore = lazy(() => import('./CircularGalleryCore'));

/**
 * @typedef {Object} CircularGalleryProps
 * @property {Array<{image: string, text: string}>} items
 * @property {number} [bend]
 * @property {string} [textColor]
 * @property {number} [borderRadius]
 * @property {string} [font]
 * @property {string} [fontUrl]
 * @property {number} [scrollSpeed]
 * @property {number} [scrollEase]
 * @property {{tap_to_interact?: string, done?: string, loading_flow?: string}} [strings]
 */

/**
 * @param {CircularGalleryProps} props
 */
export default function CircularGallery(props) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="circular-gallery-wrapper w-full h-full relative" style={{ minHeight: '400px' }}>
      <Suspense fallback={
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center gap-4 bg-[var(--clr-bg-deep)] rounded-xl relative z-10">
          <svg className="animate-spin h-10 w-10 text-[var(--clr-accent-blue)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs font-ui text-[var(--clr-text-secondary)] animate-pulse tracking-widest uppercase">
            {props.strings?.loading_flow || "Loading"}
          </span>
        </div>
      }>
        {isClient && <CircularGalleryCore {...props} />}
      </Suspense>
    </div>
  );
}
