export function formatDue(dueAt?: string | null, hasDueTime = true): string {
  if (!dueAt) return 'No deadline set';
  const date = new Date(dueAt);
  if (isNaN(date.getTime())) return 'Invalid date';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const timeStr = hasDueTime
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    : 'Time not set';

  let datePrefix = '';
  if (isToday) {
    datePrefix = 'Today';
  } else if (isTomorrow) {
    datePrefix = 'Tomorrow';
  } else {
    datePrefix = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  return `${datePrefix}${hasDueTime ? `, ${timeStr}` : ` (${timeStr})`}`;
}

export function formatStartBy(startBy?: string | null, hasDueTime = true): string | null {
  if (!startBy) return null;
  const date = new Date(startBy);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = hasDueTime
    ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  let prefix = '';
  if (isToday) {
    prefix = 'Today';
  } else {
    prefix = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  return hasDueTime && timeStr ? `${prefix} at ${timeStr}` : prefix;
}

export function getCountdown(dueAt?: string | null): { text: string; isOverdue: boolean } {
  if (!dueAt) return { text: '', isOverdue: false };
  const diffMs = new Date(dueAt).getTime() - Date.now();
  const isOverdue = diffMs < 0;
  const absHours = Math.abs(diffMs) / (1000 * 60 * 60);

  if (absHours < 1) {
    const mins = Math.max(1, Math.round(Math.abs(diffMs) / (1000 * 60)));
    return {
      text: isOverdue ? `Overdue by ${mins}m` : `Due in ${mins}m`,
      isOverdue,
    };
  }

  if (absHours < 24) {
    const hrs = Math.round(absHours);
    return {
      text: isOverdue ? `Overdue by ${hrs}h` : `Due in ${hrs}h`,
      isOverdue,
    };
  }

  const days = Math.round(absHours / 24);
  return {
    text: isOverdue ? `Overdue by ${days}d` : `Due in ${days}d`,
    isOverdue,
  };
}
