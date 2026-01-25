import { useState, useEffect } from 'react';

export type TabId = string;

const STORAGE_KEY = 'source_hunter_active_tab';

/**
 * Custom hook for managing tab state with localStorage persistence.
 * Handles SSR compatibility and privacy mode gracefully.
 *
 * @param defaultTab - The default tab to show if no persisted value exists
 * @param availableTabs - Array of valid tab IDs to validate against
 * @returns [activeTab, setActiveTab] tuple like useState
 */
export function useTabPersistence(
  defaultTab: TabId,
  availableTabs: TabId[] = []
): [TabId, (tab: TabId) => void] {
  // Initialize state from localStorage or default
  const [activeTab, setActiveTabState] = useState<TabId>(() => {
    if (typeof window === 'undefined') {
      return defaultTab;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && availableTabs.length > 0) {
        // Validate that the stored tab is still available
        return availableTabs.includes(stored) ? stored : defaultTab;
      }
      return stored || defaultTab;
    } catch (error) {
      // Silently fail if localStorage is unavailable (privacy mode, quota exceeded, etc.)
      return defaultTab;
    }
  });

  // Custom setter that persists to localStorage
  const setActiveTab = (tab: TabId) => {
    setActiveTabState(tab);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, tab);
      } catch (error) {
        // Silently fail
      }
    }
  };

  // Sync with localStorage changes from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newTab = e.newValue;
        // Only update if the new tab is valid
        if (availableTabs.length === 0 || availableTabs.includes(newTab)) {
          setActiveTabState(newTab);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [availableTabs]);

  return [activeTab, setActiveTab];
}

/**
 * Clear the persisted tab state (useful for resetting to default)
 */
export function clearTabPersistence(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Silently fail
    }
  }
}
