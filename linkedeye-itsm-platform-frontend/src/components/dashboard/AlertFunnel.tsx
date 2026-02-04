import { ArrowDown } from 'lucide-react';

interface FunnelStage {
  label: string;
  count: number;
  color: string;
}

interface AlertFunnelProps {
  stages: FunnelStage[];
  isDark: boolean;
}

const AlertFunnel = ({ stages, isDark }: AlertFunnelProps) => {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-1">
      {stages.map((stage, i) => {
        const widthPct = Math.max(30, (stage.count / maxCount) * 100);
        return (
          <div key={stage.label}>
            <div className="flex items-center gap-3">
              <div
                className="rounded-md py-2 px-4 flex items-center justify-between transition-all"
                style={{
                  width: `${widthPct}%`,
                  background: `${stage.color}${isDark ? '25' : '12'}`,
                  border: `1px solid ${stage.color}40`,
                  minWidth: 120,
                }}
              >
                <span className="text-xs font-medium" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                  {stage.label}
                </span>
                <span className="text-sm font-bold ml-2" style={{ color: stage.color }}>
                  {stage.count}
                </span>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="flex items-center pl-4 py-0.5">
                <ArrowDown size={14} style={{ color: isDark ? '#475569' : '#94a3b8' }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AlertFunnel;
