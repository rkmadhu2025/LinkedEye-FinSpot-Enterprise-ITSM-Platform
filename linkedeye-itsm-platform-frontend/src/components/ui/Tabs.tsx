import { createContext, useContext, useState, ReactNode } from 'react';
import clsx from 'clsx';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs component');
  }
  return context;
};

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export const Tabs = ({ defaultValue, value, onChange, children, className }: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue);

  const activeTab = value ?? internalValue;
  const setActiveTab = (tab: string) => {
    if (!value) {
      setInternalValue(tab);
    }
    onChange?.(tab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

export interface TabListProps {
  children: ReactNode;
  className?: string;
}

export const TabList = ({ children, className }: TabListProps) => (
  <div className={clsx('flex border-b border-gray-200', className)}>{children}</div>
);

export interface TabProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  badge?: number | string;
  className?: string;
}

export const Tab = ({ value, children, disabled, icon, badge, className }: TabProps) => {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
        isActive
          ? 'text-primary-600 border-primary-600'
          : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {badge !== undefined && (
        <span
          className={clsx(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
};

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabPanel = ({ value, children, className }: TabPanelProps) => {
  const { activeTab } = useTabsContext();

  if (activeTab !== value) return null;

  return <div className={clsx('py-4', className)}>{children}</div>;
};

export default Tabs;
