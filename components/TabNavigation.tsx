import React from 'react';
import { Search, History, BarChart3 } from 'lucide-react';

export type TabId = 'search' | 'history' | 'analytics';

export interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  tabs?: TabConfig[];
  className?: string;
}

const DEFAULT_TABS: TabConfig[] = [
  { id: 'search', label: 'Search', icon: Search },
  { id: 'history', label: 'History', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

/**
 * TabNavigation Component
 *
 * A reusable tab-based navigation UI component with:
 * - Tab indicators showing the active tab
 * - Smooth CSS transitions
 * - Optional badge support for notifications/counts
 * - Proper TypeScript types
 */
const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  tabs = DEFAULT_TABS,
  className = ''
}) => {
  const activeIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className={`relative bg-gray-900 ${className}`}>
      {/* Navigation Bar */}
      <nav className="flex items-center justify-center">
        <div className="relative grid grid-cols-3 gap-1 bg-gray-800/50 rounded-xl p-1 w-full">
          {/* Sliding Indicator */}
          <div
            className="absolute inset-y-1 bg-gray-700 rounded-lg shadow-lg transition-all duration-300 ease-out z-0"
            style={{
              transform: `translateX(${activeIndex * 100}%)`,
              width: `calc(33.333% - 4px)`
            }}
          />

          {/* Tab Buttons */}
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                  text-sm font-medium transition-all duration-200 z-10
                  ${isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-inset
                  w-full
                `}
                aria-selected={isActive}
                role="tab"
              >
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`} />
                <span className="relative">
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-2 -right-3 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content Area - rendered by parent */}
    </div>
  );
};

export default TabNavigation;

/**
 * Hook to get the default tab configuration
 */
export function useDefaultTabs(): TabConfig[] {
  return DEFAULT_TABS;
}
