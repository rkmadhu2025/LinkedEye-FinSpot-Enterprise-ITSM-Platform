import clsx from 'clsx';
import { format, formatDistanceToNow } from 'date-fns';
import Avatar from './Avatar';

export interface TimelineItem {
  id: string;
  type: 'comment' | 'status_change' | 'assignment' | 'created' | 'resolved' | 'system';
  content: string;
  user?: {
    name: string;
    avatar?: string;
  };
  timestamp: string;
  metadata?: {
    oldValue?: string;
    newValue?: string;
    fieldName?: string;
  };
  isPublic?: boolean;
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const Timeline = ({ items, className }: TimelineProps) => {
  const getTypeStyles = (type: TimelineItem['type']) => {
    switch (type) {
      case 'comment':
        return { dotColor: 'bg-primary-500', icon: null };
      case 'status_change':
        return { dotColor: 'bg-warning-500', icon: null };
      case 'assignment':
        return { dotColor: 'bg-purple-500', icon: null };
      case 'created':
        return { dotColor: 'bg-success-500', icon: null };
      case 'resolved':
        return { dotColor: 'bg-green-500', icon: null };
      case 'system':
        return { dotColor: 'bg-gray-400', icon: null };
      default:
        return { dotColor: 'bg-gray-400', icon: null };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else if (diffDays < 7) {
      return format(date, "EEEE 'at' h:mm a");
    } else {
      return format(date, "MMM d, yyyy 'at' h:mm a");
    }
  };

  return (
    <div className={clsx('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {items.map((item, index) => {
          const { dotColor } = getTypeStyles(item.type);

          return (
            <div key={item.id} className="relative flex gap-4">
              {/* Dot */}
              <div
                className={clsx(
                  'relative z-10 w-10 h-10 flex items-center justify-center',
                  'rounded-full bg-white ring-4 ring-white'
                )}
              >
                {item.user ? (
                  <Avatar name={item.user.name} src={item.user.avatar} size="sm" />
                ) : (
                  <div className={clsx('w-3 h-3 rounded-full', dotColor)} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  {item.user && (
                    <span className="font-medium text-gray-900">{item.user.name}</span>
                  )}
                  <span className="text-sm text-gray-500">
                    {formatTimestamp(item.timestamp)}
                  </span>
                  {item.isPublic === false && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-yellow-100 text-yellow-800 rounded">
                      Internal
                    </span>
                  )}
                </div>

                {item.type === 'comment' ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {item.content}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    {item.content}
                    {item.metadata && item.metadata.oldValue && item.metadata.newValue && (
                      <span>
                        {' '}
                        from{' '}
                        <span className="font-medium text-gray-900">{item.metadata.oldValue}</span>{' '}
                        to{' '}
                        <span className="font-medium text-gray-900">{item.metadata.newValue}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
