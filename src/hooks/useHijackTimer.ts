
import { useState, useEffect } from 'react';

interface HijackTimerState {
  isHijackingAllowed: boolean;
  timeUntilAllowed: number;
  formattedTimeRemaining: string;
}

export const useHijackTimer = (): HijackTimerState => {
  const [timeUntilAllowed, setTimeUntilAllowed] = useState<number>(0);
  const [isHijackingAllowed, setIsHijackingAllowed] = useState<boolean>(false);

  useEffect(() => {
    // Target time: June 30, 2025 at 8:20 PM UTC
    const targetTime = new Date('2025-06-30T20:20:00Z');
    
    const updateTimer = () => {
      const now = new Date();
      const timeDiff = targetTime.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        // Target time has passed - hijacking is permanently allowed
        setIsHijackingAllowed(true);
        setTimeUntilAllowed(0);
        return;
      }
      
      setIsHijackingAllowed(false);
      setTimeUntilAllowed(timeDiff);
    };

    // Initial update
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return '';
    
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return {
    isHijackingAllowed,
    timeUntilAllowed,
    formattedTimeRemaining: formatTimeRemaining(timeUntilAllowed),
  };
};
