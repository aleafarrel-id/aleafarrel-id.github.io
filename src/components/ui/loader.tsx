import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

export const LoaderOne = ({ phrases = [] }: { phrases?: string[] }) => {
  const [progress, setProgress] = useState(0);
  const [phrase, setPhrase] = useState(phrases[0] || "Loading...");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleProgress = (e: any) => {
      setProgress(e.detail.pct);
      if (e.detail.phrase) {
        setPhrase(e.detail.phrase);
      }
    };
    const handleDone = () => {
      setVisible(false);
    };

    window.addEventListener("loader-progress", handleProgress);
    document.addEventListener("preloader-done", handleDone);

    return () => {
      window.removeEventListener("loader-progress", handleProgress);
      document.removeEventListener("preloader-done", handleDone);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          id="preloader"
          data-phrases={JSON.stringify(phrases)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            "fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-[#1A1A1A] px-6"
          )}
        >
          <div className="w-[85%] sm:w-3/4 max-w-sm flex flex-col gap-3">
            
            {/* Text & Percentage Header */}
            <div className="flex justify-between items-end w-full gap-2">
              <div className="h-auto overflow-visible relative grid items-center flex-1 min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={phrase}
                    initial={{ opacity: 0, filter: "blur(4px)", y: 5 }}
                    animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    exit={{ opacity: 0, filter: "blur(4px)", y: -5 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="col-start-1 row-start-1 font-ui text-[10px] sm:text-xs md:text-sm font-medium text-gray-400 tracking-wider md:tracking-widest uppercase leading-tight"
                  >
                    {phrase}
                  </motion.span>
                </AnimatePresence>
              </div>
              <motion.span 
                className="font-ui text-sm font-bold text-[#00E5FF] tracking-widest"
              >
                {progress}%
              </motion.span>
            </div>

            {/* Sleek Minimalist Bar */}
            <div className="w-full h-[2px] bg-[#222222] rounded-full overflow-hidden relative">
              <motion.div
                className="absolute top-0 left-0 h-full bg-[#00E5FF] rounded-full"
                style={{ 
                  boxShadow: "0 0 12px rgba(0, 229, 255, 0.6)" 
                }}
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            </div>
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
