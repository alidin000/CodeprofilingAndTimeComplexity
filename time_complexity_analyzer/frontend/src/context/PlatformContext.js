import React, { createContext, useContext } from 'react';

const PlatformContext = createContext(null);

export function PlatformProvider({ value, children }) {
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used within PlatformProvider');
  }
  return ctx;
}
