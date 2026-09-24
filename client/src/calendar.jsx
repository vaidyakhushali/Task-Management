import { useEffect, useMemo, useState } from 'react';
import './calendar.css';

function CalendarView({ user, userName = 'User', userRole = 'User' }) {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState({});

  const storageKey = useMemo(() => {
    const identity = [
      user?.id,
      user?._id,
      user?.email,
      user?.username,
    ].find(Boolean) || 'guest';

    return `taskmanager_calendar_${encodeURIComponent(String(identity))}`;
  }, [user]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setNotes(saved ? JSON.parse(saved) : {});
    } catch (error) {
      setNotes({});
    }
  }, [storageKey]);

  function formatDateKey(date) {
    const yearValue = date.getFullYear();
    const monthValue = String(date.getMonth() + 1).padStart(2, '0');
    const dayValue = String(date.getDate()).padStart(2, '0');
    return `${yearValue}-${monthValue}-${dayValue}`;
  }

  function updateNote(nextValue) {
    const key = formatDateKey(selectedDate);
    const updatedNotes = { ...notes, [key]: nextValue };
    setNotes(updatedNotes);
    localStorage.setItem(storageKey, JSON.stringify(updatedNotes));
  }

  function goToPreviousMonth() {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  function selectMonth(monthIndex) {
    setViewDate((current) => new Date(current.getFullYear(), monthIndex, 1));
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const days = useMemo(() => {
    const cells = [];

    for (let i = 0; i < startOffset; i += 1) {
      cells.push({ key: `empty-${i}`, day: '', isCurrentMonth: false });
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day);
      const dateKey = formatDateKey(date);
      cells.push({
        key: `day-${day}`,
        day,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: formatDateKey(selectedDate) === dateKey,
        hasNote: Boolean(notes[dateKey] && notes[dateKey].trim()),
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ key: `extra-${cells.length}`, day: '', isCurrentMonth: false });
    }

    return cells;
  }, [month, notes, selectedDate, startOffset, totalDays, today, year]);

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const selectedKey = formatDateKey(selectedDate);
  const selectedNote = notes[selectedKey] || '';

  return (
    <section className="calendar-page panel">
      <p className="dashboard-label">Personal schedule</p>
      <div className="calendar-header-row">
        <div>
          <h2>{monthName}</h2>
          <p className="calendar-subtitle">{userRole === 'Admin' ? 'Admin calendar' : 'Your private calendar'} · Only your notes are saved.</p>
        </div>

        <div className="calendar-controls">
          <button type="button" className="calendar-nav-button" onClick={goToPreviousMonth} aria-label="Previous month">←</button>
          <select value={month} onChange={(event) => selectMonth(Number(event.target.value))} aria-label="Select month">
            {monthNames.map((name, index) => <option value={index} key={name}>{name}</option>)}
          </select>
          <button type="button" className="calendar-nav-button" onClick={goToNextMonth} aria-label="Next month">→</button>
        </div>
      </div>

      <div className="calendar-grid-wrap">
        <div className="calendar-grid">
          {weekdays.map((day) => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}

          {days.map((cell) => (
            <button
              type="button"
              key={cell.key}
              className={`calendar-day ${cell.isToday ? 'today' : ''} ${cell.isSelected ? 'selected' : ''} ${cell.isCurrentMonth ? '' : 'muted'}`}
              onClick={() => cell.isCurrentMonth && setSelectedDate(new Date(year, month, cell.day))}
              disabled={!cell.isCurrentMonth}
            >
              <span>{cell.day || ''}</span>
              {cell.hasNote && <small>•</small>}
            </button>
          ))}
        </div>

        <div className="calendar-note-box">
          <div className="calendar-note-header">
            <h3>{selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
            <span>{userName}</span>
          </div>

          <textarea
            value={selectedNote}
            onChange={(event) => updateNote(event.target.value)}
            placeholder="Write anything for this day..."
            aria-label="Write a calendar note"
          />

          <p className="calendar-private-note">Private to this account only. Managers and users do not share calendar entries.</p>
        </div>
      </div>
    </section>
  );
}

export default CalendarView;
