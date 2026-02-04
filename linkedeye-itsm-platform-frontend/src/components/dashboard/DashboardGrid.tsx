import { useState, useCallback, useRef, ReactNode } from 'react';
import { Responsive, useContainerWidth, Layout, ResponsiveLayouts } from 'react-grid-layout';
import { GripVertical, Lock, Unlock, RotateCcw } from 'lucide-react';
import 'react-grid-layout/css/styles.css';

const STORAGE_KEY = 'dashboard-layouts';

interface WidgetDef {
  id: string;
  title: string;
  content: ReactNode;
  defaultLayout: { x: number; y: number; w: number; h: number; minW?: number; minH?: number };
}

interface DashboardGridProps {
  widgets: WidgetDef[];
  isDark: boolean;
  enabled: boolean;
}

function loadLayouts(): ResponsiveLayouts | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLayouts(layouts: ResponsiveLayouts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch { /* quota exceeded */ }
}

const DashboardGrid = ({ widgets, isDark, enabled }: DashboardGridProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useContainerWidth(containerRef);

  const defaultLayouts: ResponsiveLayouts = {
    lg: widgets.map((w) => ({ i: w.id, ...w.defaultLayout })),
  };

  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => loadLayouts() || defaultLayouts);

  const handleLayoutChange = useCallback((_current: Layout[], allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
    saveLayouts(allLayouts);
  }, []);

  const handleReset = useCallback(() => {
    setLayouts(defaultLayouts);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  if (!enabled) {
    return <>{widgets.map((w) => <div key={w.id}>{w.content}</div>)}</>;
  }

  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setIsEditing((p) => !p)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: isEditing ? 'var(--color-primary)' : isDark ? 'rgba(255,255,255,0.06)' : '#f4f6f9',
            color: isEditing ? '#fff' : textSecondary,
            border: `1px solid ${isEditing ? 'transparent' : borderColor}`,
          }}
        >
          {isEditing ? <Unlock size={13} /> : <Lock size={13} />}
          {isEditing ? 'Done' : 'Customize'}
        </button>
        {isEditing && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : '#f4f6f9',
              color: textSecondary,
              border: `1px solid ${borderColor}`,
            }}
          >
            <RotateCcw size={13} />
            Reset
          </button>
        )}
      </div>

      {width > 0 && (
        <Responsive
          className="layout"
          width={width}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
          rowHeight={60}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          containerPadding={[0, 0]}
          margin={[16, 16]}
        >
          {widgets.map((w) => (
            <div key={w.id} className="relative">
              {isEditing && (
                <div
                  className="drag-handle absolute top-2 right-2 z-10 cursor-grab active:cursor-grabbing p-1 rounded"
                  style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                >
                  <GripVertical size={14} style={{ color: textSecondary }} />
                </div>
              )}
              {w.content}
            </div>
          ))}
        </Responsive>
      )}
    </div>
  );
};

export default DashboardGrid;
