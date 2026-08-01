"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";

/**
 * PrincipalSettings
 * ─────────────────
 * Admin panel widget to edit the school-wide settings that appear on
 * student ID cards — Principal Name and School Year.
 *
 * Flow:
 *  1. Admin types a value, clicks "Save"
 *  2. A confirm modal appears: "Sigurado ka ba?" showing old → new value
 *  3. On confirm: saves to /api/settings (DB) + pushes into ThemeContext
 *     (so every page reading useTheme() updates live)
 *  4. A persistent "Currently Live" panel shows exactly what's currently
 *     active — this does NOT auto-hide, so the admin can always check at a
 *     glance whether their change actually took effect.
 */

type PendingChange = {
  key: "principal_name" | "school_year";
  label: string;
  oldValue: string;
  newValue: string;
};

// ── School Year dropdown range: 2025-2026 up to 2034-2035 ──
const SCHOOL_YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const start = 2025 + i;
  return `${start} - ${start + 1}`;
});

export default function PrincipalSettings() {
  const {
    principalName: ctxPrincipalName,
    setPrincipalName: ctxSetPrincipalName,
    schoolYear: ctxSchoolYear,
    setSchoolYear: ctxSetSchoolYear,
  } = useTheme();

  const [principalName, setPrincipalName] = useState("");
  const [schoolYear, setSchoolYear] = useState("2025 - 2026");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── What's actually live right now (confirmed saved values) ──
  const [lastSaved, setLastSaved] = useState<{ principal_name: string; school_year: string } | null>(null);

  // ── Confirm-before-save modal state ──
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const pName = (d.settings?.principal_name ?? "").toUpperCase();
        const sYear = d.settings?.school_year ?? "2025 - 2026";
        setPrincipalName(pName);
        setSchoolYear(sYear);
        setLastSaved({ principal_name: pName, school_year: sYear });
        if (pName) ctxSetPrincipalName(pName);
        if (sYear) ctxSetSchoolYear(sYear);
      })
      .catch(() => setError("Could not load settings."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 1: user clicks "Save" → open confirm modal instead of saving directly ──
  function requestSave(key: "principal_name" | "school_year", label: string, newValue: string) {
    const oldValue = key === "principal_name" ? (lastSaved?.principal_name ?? "") : (lastSaved?.school_year ?? "");
    setPendingChange({ key, label, oldValue, newValue });
  }

  // ── Step 2: user confirms in modal → actually save ──
  async function confirmSave() {
    if (!pendingChange) return;
    const { key, newValue } = pendingChange;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newValue }),
      });
      if (!res.ok) throw new Error("Save failed");

      // Push into global ThemeContext so every consumer updates live
      if (key === "principal_name") ctxSetPrincipalName(newValue);
      if (key === "school_year") ctxSetSchoolYear(newValue);

      // Update the persistent "what's live" panel
      setLastSaved((prev) => ({
        principal_name: key === "principal_name" ? newValue : (prev?.principal_name ?? ""),
        school_year: key === "school_year" ? newValue : (prev?.school_year ?? ""),
      }));

      setPendingChange(null);
    } catch {
      setError("Failed to save. Please try again.");
      setPendingChange(null);
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    border: "1.5px solid #d1d5db",
    borderRadius: "7px",
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    outline: "none",
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    background: "#fff",
    cursor: "pointer",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11.5px",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "4px",
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", color: "#6b7280", fontSize: "13px" }}>
        Loading settings…
      </div>
    );
  }

  // Has the input diverged from what's currently live?
  const principalDirty = principalName.trim() !== (lastSaved?.principal_name ?? "").trim();
  const yearDirty = schoolYear.trim() !== (lastSaved?.school_year ?? "").trim();

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "20px",
        maxWidth: "480px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h3
        style={{
          margin: "0 0 16px",
          fontSize: "14px",
          fontWeight: 700,
          color: "#1a3a6b",
          textTransform: "uppercase",
          letterSpacing: "0.8px",
          borderBottom: "2px solid #1a3a6b",
          paddingBottom: "8px",
        }}
      >
        ID Card Settings
      </h3>

      {/* Principal Name — auto CAPSLOCK as the admin types */}
      <div style={{ marginBottom: "14px" }}>
        <label style={labelStyle}>Principal Name (shown on back of ID)</label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={principalName}
            onChange={(e) => setPrincipalName(e.target.value.toUpperCase())}
            style={{ ...inputStyle, textTransform: "uppercase" }}
            placeholder="e.g. CAREN S. CATUIRAN, PH.D."
            maxLength={120}
          />
          <button
            onClick={() => requestSave("principal_name", "Principal Name", principalName.trim())}
            disabled={saving || !principalName.trim() || !principalDirty}
            style={{
              padding: "8px 14px",
              background: saving || !principalDirty ? "#93a3b8" : "#1a3a6b",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: saving || !principalDirty ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Save
          </button>
        </div>
        <p style={{ fontSize: "10.5px", color: "#9ca3af", margin: "4px 0 0" }}>
          Automatically saved in CAPS, e.g. "CAREN S. CATUIRAN, PH.D."
        </p>
      </div>

      {/* School Year — dropdown, 2025-2026 to 2034-2035 */}
      <div style={{ marginBottom: "14px" }}>
        <label style={labelStyle}>School Year</label>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={schoolYear}
            onChange={(e) => setSchoolYear(e.target.value)}
            style={selectStyle}
          >
            {!SCHOOL_YEAR_OPTIONS.includes(schoolYear) && schoolYear && (
              <option value={schoolYear}>{schoolYear}</option>
            )}
            {SCHOOL_YEAR_OPTIONS.map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
          <button
            onClick={() => requestSave("school_year", "School Year", schoolYear.trim())}
            disabled={saving || !schoolYear.trim() || !yearDirty}
            style={{
              padding: "8px 14px",
              background: saving || !yearDirty ? "#93a3b8" : "#1a3a6b",
              color: "#fff",
              border: "none",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: saving || !yearDirty ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Save
          </button>
        </div>
        <p style={{ fontSize: "10.5px", color: "#9ca3af", margin: "4px 0 0" }}>
          Choose the school year to show on ID cards (2025 - 2026 to 2034 - 2035).
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "7px 12px",
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#b91c1c",
            marginBottom: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Persistent "what's live right now" panel — does NOT auto-hide.
          This directly answers "napalitan na ba talaga?" at a glance. ── */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "12px 14px",
          marginBottom: "14px",
        }}
      >
        <p style={{ fontSize: "10.5px", fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>
          ✓ Currently Live on All ID Cards
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
            <span style={{ color: "#6b7280" }}>Principal:</span>
            <strong style={{ color: "#111827" }}>{lastSaved?.principal_name || "— not set —"}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px" }}>
            <span style={{ color: "#6b7280" }}>School Year:</span>
            <strong style={{ color: "#111827" }}>{lastSaved?.school_year || "— not set —"}</strong>
          </div>
        </div>
        {(principalDirty || yearDirty) && (
          <p style={{ fontSize: "10.5px", color: "#b45309", margin: "8px 0 0", fontWeight: 600 }}>
            ⚠ May unsaved changes ka pa sa itaas. I-click ang Save para i-apply.
          </p>
        )}
      </div>

      {/* Info box */}
      <div
        style={{
          background: "#f0f4ff",
          border: "1px solid #c7d7f5",
          borderRadius: "7px",
          padding: "10px 12px",
          fontSize: "11px",
          color: "#374151",
          lineHeight: "1.6",
        }}
      >
        <strong>📌 Note:</strong> The principal name and school year above
        automatically appear on every Student ID card across the system —
        including the student's own ID preview and the admin's Generate ID
        Cards page. School ID number <strong>308135</strong> is fixed and
        appears automatically on every front ID.
      </div>

      {/* ── Confirm-before-save modal ── */}
      {pendingChange && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !saving && setPendingChange(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "22px 24px",
              maxWidth: 380,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "#1a3a6b" }}>
              Sigurado ka ba?
            </h4>
            <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>
              Babaguhin mo ang <strong>{pendingChange.label}</strong> na makikita sa lahat ng Student ID cards.
            </p>

            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 18,
                fontSize: 12.5,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#9ca3af" }}>Dati:</span>
                <span style={{ color: "#6b7280", textDecoration: "line-through" }}>
                  {pendingChange.oldValue || "— wala pa —"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#9ca3af" }}>Magiging:</span>
                <strong style={{ color: "#15803d" }}>{pendingChange.newValue}</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setPendingChange(null)}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: "none",
                  background: saving ? "#93a3b8" : "#1a3a6b",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving…" : "Oo, i-save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
