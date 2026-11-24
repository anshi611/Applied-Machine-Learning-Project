import React, { createContext, useContext, useState, useEffect } from "react";

const ViewModeContext = createContext();

export function ViewModeProvider({ children }) {
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("mydel_view_mode") || "manager";
  });

  useEffect(() => {
    localStorage.setItem("mydel_view_mode", viewMode);
  }, [viewMode]);

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext) || { viewMode: "manager", setViewMode: () => {} };
}
