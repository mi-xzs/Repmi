import React, { useEffect, useMemo, useRef, useState } from 'react';
import { colors } from '../theme/colors';

interface Props {
  value: Date | null;
  onChange: (d: Date) => void;
  accent: string;
  accentDim: string;
  accentSubtle: string;
  minDate: Date;
  maxDate: Date;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const pad2 = (n: number) => String(n).padStart(2, '0');
const fmtLong = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const STYLE_ID = 'bdp-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
@keyframes bdp-overlay-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes bdp-sheet-in {
  from { opacity: 0; transform: translateY(14px) scale(0.965) }
  to   { opacity: 1; transform: none }
}
@keyframes bdp-view-in {
  from { opacity: 0; transform: translateX(10px) }
  to   { opacity: 1; transform: none }
}
.bdp-cell {
  transition: background-color 140ms ease, color 140ms ease,
              transform 160ms cubic-bezier(.16,1,.3,1);
}
.bdp-cell:not([data-disabled="true"]):not([data-selected="true"]):hover {
  background: rgba(255,255,255,0.07);
}
.bdp-cell[data-selected="true"] { transform: scale(1.04); }
.bdp-cell:focus-visible,
.bdp-seg:focus-visible,
.bdp-btn:focus-visible,
.bdp-trigger:focus-visible {
  outline: 2px solid var(--bdp-accent);
  outline-offset: 2px;
}
.bdp-seg { transition: color 140ms ease, background-color 140ms ease; }
.bdp-seg:not([data-active="true"]):hover { background: rgba(255,255,255,0.06); }
.bdp-btn { transition: background-color 140ms ease, filter 140ms ease, opacity 140ms ease; }
.bdp-ghost:hover { background: rgba(255,255,255,0.07); }
.bdp-primary:not([disabled]):hover { filter: brightness(1.07); }
.bdp-arrow { transition: background-color 140ms ease; }
.bdp-arrow:not([disabled]):hover { background: rgba(255,255,255,0.08); }
.bdp-trigger { transition: border-color 150ms ease, box-shadow 150ms ease; }
.bdp-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.16) transparent; }
.bdp-scroll::-webkit-scrollbar { width: 8px }
.bdp-scroll::-webkit-scrollbar-track { background: transparent }
.bdp-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.16); border-radius: 4px;
}
.bdp-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.26) }
@media (prefers-reduced-motion: reduce) {
  [style*="bdp-overlay-in"], [style*="bdp-sheet-in"], [style*="bdp-view-in"] { animation: none !important }
}`;
  document.head.appendChild(el);
}

type ViewName = 'year' | 'month' | 'day';

export default function WebBirthdayPicker({
  value, onChange, accent, accentDim, accentSubtle, minDate, maxDate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewName>('year');
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);

  const [pY, setPY] = useState<number | null>(null);
  const [pM, setPM] = useState<number | null>(null);
  const [pD, setPD] = useState<number | null>(null);

  const yearScrollRef = useRef<any>(null);

  const min = useMemo(() => atMidnight(minDate), [minDate]);
  const max = useMemo(() => atMidnight(maxDate), [maxDate]);
  const minYear = min.getFullYear();
  const maxYear = max.getFullYear();

  const allowedDay = (y: number, m: number, d: number) => {
    const t = new Date(y, m, d);
    return t >= min && t <= max;
  };
  const allowedMonth = (y: number, m: number) => {
    const last = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, 1) <= max && new Date(y, m, last) >= min;
  };
  const allowedYear = (y: number) =>
    new Date(y, 0, 1) <= max && new Date(y, 11, 31) >= min;

  useEffect(() => { ensureStyles(); }, []);

  const openPicker = () => {
    if (value) {
      setPY(value.getFullYear());
      setPM(value.getMonth());
      setPD(value.getDate());
      setView('day');
    } else {
      setPY(null); setPM(null); setPD(null);
      setView('year');
    }
    setOpen(true);
  };

  useEffect(() => {
    if (open && view === 'year' && yearScrollRef.current) {
      const node = yearScrollRef.current.querySelector('[data-active-year="true"]');
      if (node) node.scrollIntoView({ block: 'center' });
    }
  }, [open, view]);

  const close = () => setOpen(false);

  const pickYear = (y: number) => {
    setPY(y);
    if (pM != null && !allowedMonth(y, pM)) { setPM(null); setPD(null); }
    else if (pM != null && pD != null && !allowedDay(y, pM, pD)) setPD(null);
    setView('month');
  };
  const pickMonth = (m: number) => {
    setPM(m);
    if (pY != null && pD != null && !allowedDay(pY, m, pD)) setPD(null);
    setView('day');
  };
  const pickDay = (d: number) => setPD(d);

  const complete = pY != null && pM != null && pD != null;
  const confirm = () => {
    if (!complete) return;
    onChange(new Date(pY!, pM!, pD!));
    setOpen(false);
  };

  // ---- trigger (the field shown in the form) -------------------------------
  const triggerBorder = focused ? accent : hover ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)';

  return (
    <div style={{ ['--bdp-accent' as any]: accent }}>
      <button
        type="button"
        className="bdp-trigger"
        onClick={openPicker}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, width: '100%', boxSizing: 'border-box',
          background: colors.container, color: value ? '#fff' : colors.button1,
          border: `1px solid ${triggerBorder}`, borderRadius: 12,
          padding: '13px 16px', fontSize: 15, marginBottom: 12,
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
          boxShadow: focused ? `0 0 0 3px ${accentSubtle}` : 'none',
        }}
      >
        <span>{value ? fmtLong(value) : 'Select your birthday'}</span>
        <CalendarGlyph color={value ? accent : colors.button1} />
      </button>

      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(8,8,8,0.62)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'bdp-overlay-in 160ms ease both',
          }}
        >
          <div
            onClick={(e: any) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Choose your date of birth"
            style={{
              width: 360, maxWidth: '100%', boxSizing: 'border-box',
              background: colors.container, color: '#fff',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22,
              padding: 18,
              boxShadow: '0 28px 70px -18px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.3)',
              fontFamily: 'inherit',
              animation: 'bdp-sheet-in 240ms cubic-bezier(.16,1,.3,1) both',
            }}
          >
            {/* caption */}
            <div style={{
              fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase',
              color: colors.button1, marginBottom: 12,
            }}>
              Date of birth
            </div>

            {/* breadcrumb segments */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
              <Segment label={pY != null ? String(pY) : 'Year'} placeholder={pY == null}
                active={view === 'year'} accent={accent} onClick={() => setView('year')} />
              <Chevron />
              <Segment label={pM != null ? MONTHS_SHORT[pM] : 'Month'} placeholder={pM == null}
                active={view === 'month'} accent={accent}
                onClick={() => pY != null && setView('month')} disabled={pY == null} />
              <Chevron />
              <Segment label={pD != null ? pad2(pD) : 'Day'} placeholder={pD == null}
                active={view === 'day'} accent={accent}
                onClick={() => pY != null && pM != null && setView('day')}
                disabled={pY == null || pM == null} />
            </div>

            {/* view body (re-keyed so the slide-in replays per view) */}
            <div key={view} style={{ animation: 'bdp-view-in 200ms cubic-bezier(.16,1,.3,1) both' }}>
              {view === 'year' && (
                <div ref={yearScrollRef} className="bdp-scroll" style={{
                  maxHeight: 264, overflowY: 'auto',
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
                  paddingRight: 4,
                }}>
                  {yearsDescending(minYear, maxYear).map(y => {
                    const disabled = !allowedYear(y);
                    const selected = pY === y;
                    const isActive = pY === y;
                    return (
                      <button key={y} type="button" className="bdp-cell"
                        data-disabled={disabled} data-selected={selected}
                        data-active-year={isActive}
                        disabled={disabled} onClick={() => pickYear(y)}
                        style={cellStyle(selected, disabled, accent, { height: 40, borderRadius: 10, fontSize: 14 })}>
                        {y}
                      </button>
                    );
                  })}
                </div>
              )}

              {view === 'month' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {MONTHS.map((name, m) => {
                    const disabled = pY == null || !allowedMonth(pY, m);
                    const selected = pM === m;
                    return (
                      <button key={name} type="button" className="bdp-cell"
                        data-disabled={disabled} data-selected={selected}
                        disabled={disabled} onClick={() => pickMonth(m)}
                        style={cellStyle(selected, disabled, accent, { height: 52, borderRadius: 12, fontSize: 13 })}>
                        {MONTHS_SHORT[m]}
                      </button>
                    );
                  })}
                </div>
              )}

              {view === 'day' && pY != null && pM != null && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                    {WEEKDAYS.map((w, i) => (
                      <div key={i} style={{
                        textAlign: 'center', fontSize: 11, fontWeight: 600,
                        color: colors.button1, paddingBottom: 2,
                      }}>{w}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {Array.from({ length: new Date(pY, pM, 1).getDay() }).map((_, i) => (
                      <div key={`b${i}`} />
                    ))}
                    {Array.from({ length: new Date(pY, pM + 1, 0).getDate() }).map((_, i) => {
                      const d = i + 1;
                      const disabled = !allowedDay(pY, pM, d);
                      const selected = pD === d;
                      return (
                        <button key={d} type="button" className="bdp-cell"
                          data-disabled={disabled} data-selected={selected}
                          disabled={disabled} onClick={() => pickDay(d)}
                          style={cellStyle(selected, disabled, accent, {
                            aspectRatio: '1 / 1', borderRadius: 999, fontSize: 14,
                          })}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* footer */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="bdp-btn bdp-ghost" onClick={close}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: 'rgba(255,255,255,0.05)', color: '#fff',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                Cancel
              </button>
              <button type="button" className="bdp-btn bdp-primary" onClick={confirm}
                disabled={!complete}
                style={{
                  flex: 1.4, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: complete ? accent : accentDim,
                  color: '#0E0E0E', fontSize: 14, fontWeight: 700,
                  cursor: complete ? 'pointer' : 'not-allowed',
                  opacity: complete ? 1 : 0.45, fontFamily: 'inherit',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                {complete ? `Set ${pad2(pD!)} ${MONTHS_SHORT[pM!]} ${pY}` : 'Set birthday'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function yearsDescending(minY: number, maxY: number) {
  const out: number[] = [];
  for (let y = maxY; y >= minY; y--) out.push(y);
  return out;
}

function cellStyle(selected: boolean, disabled: boolean, accent: string, extra: any) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', fontWeight: selected ? 700 : 500,
    background: selected ? accent : 'transparent',
    color: selected ? '#0E0E0E' : disabled ? 'rgba(255,255,255,0.18)' : '#fff',
    ...extra,
  };
}

function Segment({
  label, active, placeholder, accent, onClick, disabled,
}: { label: string; active: boolean; placeholder: boolean; accent: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="bdp-seg" data-active={active}
      onClick={onClick} disabled={disabled}
      style={{
        flex: 1, padding: '7px 6px', borderRadius: 9, border: 'none',
        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: active ? accent : placeholder ? colors.button1 : '#fff',
        fontSize: 13, fontWeight: active ? 700 : 600,
        cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
        opacity: disabled ? 0.5 : 1,
      }}>
      {label}
    </button>
  );
}

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9 6l6 6-6 6" stroke="#6D6D6D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarGlyph({ color }: { color: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="3" y="4.5" width="18" height="16" rx="3" stroke={color} strokeWidth="1.8" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
