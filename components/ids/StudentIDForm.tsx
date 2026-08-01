"use client";

import React, { useState, useEffect } from "react";
import { StudentIDFront, StudentIDBack } from "./StudentIDCard";

// ─── Types ────────────────────────────────────────
interface Section {
  id: number;
  grade_level: number;
  name: string;
  class_adviser: string;
}

interface StudentFormData {
  first_name: string;
  last_name: string;
  middle_name: string;
  grade_level: string;
  section_id: string;
  section_name: string;
  lrn: string;
  class_adviser: string;
  address: string;
  guardian_name: string;
  guardian_contact_number: string;
  contact_number: string;
  photo_path: string;
  school_year: string;
}

interface StudentIDFormProps {
  /** Existing student data for edit mode. Leave undefined for create mode. */
  initialData?: Partial<StudentFormData> & { id?: number };
  onSubmit?: (data: StudentFormData) => Promise<void>;
  onCancel?: () => void;
  principalName?: string;
}

const SCHOOL_YEAR_OPTIONS = [
  "2024 - 2025",
  "2025 - 2026",
  "2026 - 2027",
  "2027 - 2028",
  "2028 - 2029",
  "2029 - 2030",
];

const EMPTY_FORM: StudentFormData = {
  first_name: "",
  last_name: "",
  middle_name: "",
  grade_level: "8",
  section_id: "",
  section_name: "",
  lrn: "",
  class_adviser: "",
  address: "",
  guardian_name: "",
  guardian_contact_number: "",
  contact_number: "",
  photo_path: "",
  school_year: "2025 - 2026",
};

// ─── Form ─────────────────────────────────────────
export default function StudentIDForm({
  initialData,
  onSubmit,
  onCancel,
  principalName,
}: StudentIDFormProps) {
  const [form, setForm] = useState<StudentFormData>({
    ...EMPTY_FORM,
    ...initialData,
  });
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Fetch sections from API
  // NOTE: /api/sections returns a grouped object { 7: [...], 8: [...], 9: [...], 10: [...] },
  // each item already carrying its `class_adviser` (Settings now requires every
  // section to be created together with exactly one adviser). We flatten it here
  // so the rest of this component can keep working with a simple array.
  useEffect(() => {
    fetch("/api/sections")
      .then((r) => r.json())
      .then((d) => {
        const flat: Section[] = Array.isArray(d)
          ? d
          : (Object.values(d || {}).flat() as Section[]);
        setSections(flat);
      })
      .catch(() => {});
  }, []);

  const filteredSections = sections.filter(
    (s) => String(s.grade_level) === form.grade_level
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "grade_level") {
        // Changing grade invalidates whatever section/adviser was selected,
        // since sections are scoped per grade level — avoids a stale
        // section/adviser pair from the previous grade sticking around.
        next.section_id = "";
        next.section_name = "";
        next.class_adviser = "";
      }

      if (name === "section_id") {
        // ── This is the auto-fill: picking a Section pulls in its Adviser
        // directly from the Section+Adviser pair saved in Settings, so the
        // adviser can never be mismatched with the section by hand. ──
        const sec = sections.find((s) => String(s.id) === value);
        next.section_name = sec ? sec.name : "";
        next.class_adviser = sec ? sec.class_adviser || "" : "";
      }

      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;

    // Class adviser is no longer a free-typed field — it must come from the
    // selected Section. If it's somehow still empty, the Section itself
    // doesn't have an adviser set in Settings, so block submission here
    // rather than letting a blank adviser go out to the printed ID.
    if (!form.class_adviser) {
      setError(
        "No adviser is set for the selected Section. Please choose a Section first, or ask the admin to set an adviser for it in Settings."
      );
      return;
    }

    setLoading(true);
    setError("");
    try {
      await onSubmit(form);
    } catch (err: any) {
      setError(err?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // ── Preview student data shape ──────────────────
  const previewStudent = {
    ...form,
    grade_level: form.grade_level ? Number(form.grade_level) : undefined,
  };

  // ── Styles ─────────────────────────────────────
  const inputClass: React.CSSProperties = {
    width: "100%",
    padding: "7px 10px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "13px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };

  const readOnlyInputClass: React.CSSProperties = {
    ...inputClass,
    background: "#f3f4f6",
    color: form.class_adviser ? "#111" : "#9ca3af",
    cursor: "not-allowed",
  };

  const labelClass: React.CSSProperties = {
    display: "block",
    fontSize: "11.5px",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "3px",
    letterSpacing: "0.3px",
  };

  const sectionHeader: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 700,
    color: "#1a3a6b",
    textTransform: "uppercase",
    letterSpacing: "1px",
    padding: "8px 0 4px",
    borderBottom: "2px solid #1a3a6b",
    marginBottom: "10px",
    marginTop: "14px",
  };

  const fieldGrid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111" }}>
      {/* Preview Toggle */}
      <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={() => setShowPreview((p) => !p)}
          style={{
            padding: "6px 14px",
            background: showPreview ? "#1a3a6b" : "#e8f0fb",
            color: showPreview ? "#fff" : "#1a3a6b",
            border: "1.5px solid #1a3a6b",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showPreview ? "Hide ID Preview" : "Show ID Preview"}
        </button>
      </div>

      {/* Live ID Preview */}
      {showPreview && (
        <div
          style={{
            background: "#f1f5f9",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "18px",
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <div>
            <p style={{ textAlign: "center", fontSize: "11px", marginBottom: "6px", color: "#555" }}>
              FRONT
            </p>
            <StudentIDFront student={previewStudent} principalName={principalName} />
          </div>
          <div>
            <p style={{ textAlign: "center", fontSize: "11px", marginBottom: "6px", color: "#555" }}>
              BACK
            </p>
            <StudentIDBack student={previewStudent} principalName={principalName} />
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* ── Personal Info ── */}
        <div style={sectionHeader}>Personal Information</div>
        <div style={fieldGrid}>
          <div>
            <label style={labelClass}>Last Name *</label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
              style={inputClass}
              placeholder="DELA CRUZ"
            />
          </div>
          <div>
            <label style={labelClass}>First Name *</label>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
              style={inputClass}
              placeholder="JUAN"
            />
          </div>
          <div>
            <label style={labelClass}>Middle Name</label>
            <input
              name="middle_name"
              value={form.middle_name}
              onChange={handleChange}
              style={inputClass}
              placeholder="SANTOS"
            />
          </div>
          <div>
            <label style={labelClass}>LRN</label>
            <input
              name="lrn"
              value={form.lrn}
              onChange={handleChange}
              maxLength={12}
              style={inputClass}
              placeholder="165511170200"
            />
          </div>
        </div>

        {/* ── Academic Info ── */}
        <div style={sectionHeader}>Academic Information</div>
        <div style={fieldGrid}>
          <div>
            <label style={labelClass}>Grade Level *</label>
            <select
              name="grade_level"
              value={form.grade_level}
              onChange={handleChange}
              required
              style={inputClass}
            >
              <option value="">— Select —</option>
              {[7, 8, 9, 10].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelClass}>Section *</label>
            <select
              name="section_id"
              value={form.section_id}
              onChange={handleChange}
              required
              style={inputClass}
              disabled={!form.grade_level}
            >
              <option value="">— Select —</option>
              {filteredSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {form.grade_level && filteredSections.length === 0 && (
              <p style={{ fontSize: "10px", color: "#dc2626", marginTop: "3px" }}>
                No sections found for Grade {form.grade_level} yet. Ask the admin to add one in Settings.
              </p>
            )}
          </div>

          {/* ── Class Adviser: read-only, auto-filled from the selected Section ── */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelClass}>Class Adviser</label>
            <input
              name="class_adviser"
              value={form.class_adviser}
              readOnly
              disabled
              style={readOnlyInputClass}
              placeholder="Auto-filled once a Section is selected"
            />
            <p style={{ fontSize: "10px", color: "#9ca3af", marginTop: "3px" }}>
              Automatically set based on the selected Section — to correct an adviser, update it
              in Settings → Grade, Section & Adviser Management.
            </p>
          </div>

          <div>
            <label style={labelClass}>School Year</label>
            <select
              name="school_year"
              value={form.school_year}
              onChange={handleChange}
              style={inputClass}
            >
              {SCHOOL_YEAR_OPTIONS.map((sy) => (
                <option key={sy} value={sy}>
                  {sy}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Emergency / Guardian Info ── */}
        <div style={sectionHeader}>Emergency Contact (Back of ID)</div>
        <div style={fieldGrid}>
          <div>
            <label style={labelClass}>Guardian Name</label>
            <input
              name="guardian_name"
              value={form.guardian_name}
              onChange={handleChange}
              style={inputClass}
              placeholder="Full name of guardian"
            />
          </div>
          <div>
            <label style={labelClass}>Guardian Contact Number</label>
            <input
              name="guardian_contact_number"
              value={form.guardian_contact_number}
              onChange={handleChange}
              style={inputClass}
              placeholder="09XXXXXXXXX"
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelClass}>Address</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={2}
              style={{ ...inputClass, resize: "vertical" }}
              placeholder="BLK 1 LOT 52 SOUTHVILLE 8C SAN ISIDRO, MONTALBAN, RIZAL"
            />
          </div>
        </div>

        {/* ── Contact ── */}
        <div style={sectionHeader}>Student Contact</div>
        <div style={fieldGrid}>
          <div>
            <label style={labelClass}>Student Contact Number</label>
            <input
              name="contact_number"
              value={form.contact_number}
              onChange={handleChange}
              style={inputClass}
              placeholder="09XXXXXXXXX"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: "12px",
              padding: "8px 12px",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "8px 20px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "13px",
                cursor: "pointer",
                color: "#374151",
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "8px 24px",
              background: loading ? "#93a3b8" : "#1a3a6b",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.5px",
            }}
          >
            {loading ? "Saving…" : initialData?.id ? "Update Student" : "Add Student"}
          </button>
        </div>
      </form>
    </div>
  );
}
