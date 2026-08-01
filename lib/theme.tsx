'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
interface ThemeCtx {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  schoolName: string;
  setSchoolName: (n: string) => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  headerTitle: string;
  setHeaderTitle: (t: string) => void;
  facultyColor: string;
  setFacultyColor: (c: string) => void;
  staffColor: string;
  setStaffColor: (c: string) => void;
  studentColor: string;
  setStudentColor: (c: string) => void;
  // ── NEW: global Principal Name + School Year (also synced with /api/settings) ──
  principalName: string;
  setPrincipalName: (n: string) => void;
  schoolYear: string;
  setSchoolYear: (y: string) => void;
}

const Ctx = createContext<ThemeCtx>({
  theme: 'dark', toggleTheme: () => {}, setTheme: () => {},
  schoolName: 'South Ville 8C National High School', setSchoolName: () => {},
  accentColor: '#f97316', setAccentColor: () => {},
  headerTitle: 'SV8C NHS ID System', setHeaderTitle: () => {},
  facultyColor: '#4f6ef7', setFacultyColor: () => {},
  staffColor: '#14b8a6', setStaffColor: () => {},
  studentColor: '#a855f7', setStudentColor: () => {},
  principalName: '', setPrincipalName: () => {},
  schoolYear: '2025 - 2026', setSchoolYear: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [schoolName, setSchoolNameState] = useState('South Ville 8C National High School');
  const [accentColor, setAccentColorState] = useState('#f97316');
  const [headerTitle, setHeaderTitleState] = useState('SV8C NHS ID System');
  const [facultyColor, setFacultyColorState] = useState('#4f6ef7');
  const [staffColor, setStaffColorState] = useState('#14b8a6');
  const [studentColor, setStudentColorState] = useState('#a855f7');
  // ── NEW state ──
  const [principalName, setPrincipalNameState] = useState('');
  const [schoolYear, setSchoolYearState] = useState('2025 - 2026');

  useEffect(() => {
    const stored = (localStorage.getItem('sv8c-theme') as Theme) || 'dark';
    const name   = localStorage.getItem('sv8c-school-name') || 'South Ville 8C National High School';
    const accent = localStorage.getItem('sv8c-accent') || '#f97316';
    const hTitle = localStorage.getItem('sv8c-header-title') || 'SV8C NHS ID System';
    const fColor = localStorage.getItem('sv8c-faculty-color') || '#4f6ef7';
    const sColor = localStorage.getItem('sv8c-staff-color') || '#14b8a6';
    const stColor = localStorage.getItem('sv8c-student-color') || '#a855f7';
    // ── NEW: localStorage cache (instant paint) — real values come from /api/settings below ──
    const pName  = localStorage.getItem('sv8c-principal-name') || '';
    const sYear  = localStorage.getItem('sv8c-school-year') || '2025 - 2026';

    setThemeState(stored);
    setSchoolNameState(name);
    setAccentColorState(accent);
    setHeaderTitleState(hTitle);
    setFacultyColorState(fColor);
    setStaffColorState(sColor);
    setStudentColorState(stColor);
    setPrincipalNameState(pName);
    setSchoolYearState(sYear);
    document.documentElement.classList.toggle('light', stored === 'light');
    applyAccent(accent);

    // ── NEW: hydrate principalName + schoolYear from the DB (/api/settings) ──
    // This is the real source of truth — PrincipalSettings.tsx saves here.
    // localStorage above is just a cache so the ID preview doesn't flash empty
    // while this fetch is in flight.
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        const dbPrincipal = d?.settings?.principal_name;
        const dbYear      = d?.settings?.school_year;
        if (dbPrincipal) {
          setPrincipalNameState(dbPrincipal);
          localStorage.setItem('sv8c-principal-name', dbPrincipal);
        }
        if (dbYear) {
          setSchoolYearState(dbYear);
          localStorage.setItem('sv8c-school-year', dbYear);
        }
      })
      .catch(() => { /* silently keep localStorage cache on failure */ });
  }, []);

  function applyAccent(hex: string) {
    const r = document.documentElement;
    r.style.setProperty('--accent', hex);
    r.style.setProperty('--accent2', lighten(hex, 20));
    r.style.setProperty('--glow-accent', hexToRgba(hex, 0.35));
  }

  function lighten(hex: string, pct: number) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + pct);
    const g = Math.min(255, ((n >> 8) & 0xff) + pct);
    const b = Math.min(255, (n & 0xff) + pct);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  function hexToRgba(hex: string, alpha: number) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 0xff},${n & 0xff},${alpha})`;
  }

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('sv8c-theme', t);
    document.documentElement.classList.toggle('light', t === 'light');
  };
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const setSchoolName = (n: string) => {
    setSchoolNameState(n);
    localStorage.setItem('sv8c-school-name', n);
  };
  const setAccentColor = (c: string) => {
    setAccentColorState(c);
    localStorage.setItem('sv8c-accent', c);
    applyAccent(c);
  };
  const setHeaderTitle = (t: string) => {
    setHeaderTitleState(t);
    localStorage.setItem('sv8c-header-title', t);
  };
  const setFacultyColor = (c: string) => { setFacultyColorState(c); localStorage.setItem('sv8c-faculty-color', c); };
  const setStaffColor   = (c: string) => { setStaffColorState(c);   localStorage.setItem('sv8c-staff-color', c);   };
  const setStudentColor = (c: string) => { setStudentColorState(c); localStorage.setItem('sv8c-student-color', c); };

  // ── NEW setters: update local state + localStorage cache instantly.
  // PrincipalSettings.tsx calls these right after a successful /api/settings PATCH,
  // so every page reading useTheme() updates live — no reload needed.
  const setPrincipalName = (n: string) => {
    setPrincipalNameState(n);
    localStorage.setItem('sv8c-principal-name', n);
  };
  const setSchoolYear = (y: string) => {
    setSchoolYearState(y);
    localStorage.setItem('sv8c-school-year', y);
  };

  return (
    <Ctx.Provider value={{
      theme, toggleTheme, setTheme,
      schoolName, setSchoolName,
      accentColor, setAccentColor,
      headerTitle, setHeaderTitle,
      facultyColor, setFacultyColor,
      staffColor, setStaffColor,
      studentColor, setStudentColor,
      principalName, setPrincipalName,
      schoolYear, setSchoolYear,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() { return useContext(Ctx); }
