import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, List } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge, PriorityBadge } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchCalendarChanges } from '@/store/slices/changesSlice';
import clsx from 'clsx';
import { ChangeRequest } from '@/types';

const ChangeCalendarPage = () => {
  const dispatch = useAppDispatch();
  const { calendarChanges, isLoading } = useAppSelector((state) => state.changes);
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    dispatch(
      fetchCalendarChanges({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      })
    );
  }, [dispatch, currentDate]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getChangesForDay = (date: Date) => {
    return calendarChanges.filter((change) => {
      if (!change.scheduledStart) return false;
      return isSameDay(new Date(change.scheduledStart), date);
    });
  };

  const selectedDateChanges = selectedDate ? getChangesForDay(selectedDate) : [];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Mock data for demo
  const mockChanges: ChangeRequest[] = [
    {
      id: '1',
      changeNumber: 'CHG0012456',
      title: 'Database Migration v2.5',
      status: 'scheduled',
      changeType: 'normal',
      risk: 'high',
      category: 'database',
      scheduledStart: new Date().toISOString(),
      downtimeRequired: true,
      cabRequired: true,
      tags: [],
      customFields: {},
      requestedBy: '1',
      priority: 'high',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      changeNumber: 'CHG0012457',
      title: 'Security Patch Deployment',
      status: 'approved',
      changeType: 'standard',
      risk: 'medium',
      category: 'security',
      scheduledStart: new Date(Date.now() + 86400000).toISOString(),
      downtimeRequired: false,
      cabRequired: false,
      tags: [],
      customFields: {},
      requestedBy: '1',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const displayChanges = calendarChanges.length > 0 ? calendarChanges : mockChanges;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>Change Calendar</h1>
          <p className="mt-1" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>View scheduled changes</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/changes">
            <Button variant="outline" leftIcon={<List size={16} />}>
              List View
            </Button>
          </Link>
          <Link to="/changes/create">
            <Button leftIcon={<Plus size={16} />}>New Change</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-lg font-semibold">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <button
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {/* Week days header */}
              <div className="grid grid-cols-7 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="py-3 text-center text-sm font-medium"
                    style={{ color: isDark ? '#94a3b8' : '#4b5563' }}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {/* Empty cells for days before the month starts */}
                {[...Array(startOfMonth(currentDate).getDay())].map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[100px] p-2 border-b border-r" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb', borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6' }} />
                ))}

                {days.map((day) => {
                  const dayChanges = getChangesForDay(day).length > 0
                    ? getChangesForDay(day)
                    : displayChanges.filter((c) => c.scheduledStart && isSameDay(new Date(c.scheduledStart), day));
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={clsx(
                        'min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors',
                        isToday && 'bg-primary-50',
                        isSelected && 'ring-2 ring-primary-500 ring-inset',
                        !isToday && !isSelected && 'hover:bg-gray-50'
                      )}
                    >
                      <div
                        className={clsx(
                          'w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1',
                          isToday && 'bg-primary-600 text-white font-medium'
                        )}
                      >
                        {format(day, 'd')}
                      </div>

                      <div className="space-y-1">
                        {dayChanges.slice(0, 3).map((change) => (
                          <div
                            key={change.id}
                            className={clsx(
                              'text-xs px-1.5 py-0.5 rounded truncate',
                              change.risk === 'critical' && 'bg-red-100 text-red-800',
                              change.risk === 'high' && 'bg-orange-100 text-orange-800',
                              change.risk === 'medium' && 'bg-blue-100 text-blue-800',
                              change.risk === 'low' && 'bg-green-100 text-green-800'
                            )}
                          >
                            {change.changeNumber}
                          </div>
                        ))}
                        {dayChanges.length > 3 && (
                          <div className="text-xs text-gray-500 px-1.5">
                            +{dayChanges.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar - Selected Day Details */}
        <div className="space-y-6">
          {/* Today's Changes */}
          <Card>
            <CardHeader>
              {selectedDate
                ? format(selectedDate, 'EEEE, MMMM d')
                : "Today's Changes"}
            </CardHeader>
            <CardBody>
              {selectedDateChanges.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateChanges.map((change) => (
                    <Link
                      key={change.id}
                      to={`/changes/${change.id}`}
                      className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-primary-600">
                          {change.changeNumber}
                        </span>
                        <PriorityBadge priority={change.risk} />
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {change.title}
                      </p>
                      {change.scheduledStart && (
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(change.scheduledStart), 'h:mm a')}
                          {change.scheduledEnd && (
                            <> - {format(new Date(change.scheduledEnd), 'h:mm a')}</>
                          )}
                        </p>
                      )}
                      {change.downtimeRequired && (
                        <Badge variant="warning" size="sm" className="mt-2">
                          Downtime Required
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No changes scheduled for this day
                </p>
              )}
            </CardBody>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>Legend</CardHeader>
            <CardBody>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500" />
                  <span className="text-sm text-gray-600">Critical Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-orange-500" />
                  <span className="text-sm text-gray-600">High Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span className="text-sm text-gray-600">Medium Risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span className="text-sm text-gray-600">Low Risk</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Upcoming Changes */}
          <Card>
            <CardHeader>Upcoming This Week</CardHeader>
            <CardBody>
              <div className="space-y-2">
                {displayChanges.slice(0, 5).map((change) => (
                  <Link
                    key={change.id}
                    to={`/changes/${change.id}`}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {change.changeNumber}
                      </p>
                      {change.scheduledStart && (
                        <p className="text-xs text-gray-500">
                          {format(new Date(change.scheduledStart), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>
                    <PriorityBadge priority={change.risk} />
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChangeCalendarPage;
