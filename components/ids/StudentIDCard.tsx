"use client";

import React, { useRef, useState, useLayoutEffect } from "react";

interface StudentIDCardProps {
  student: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    grade_level?: number;
    section_name?: string;
    lrn?: string;
    photo_path?: string;
    guardian_name?: string;
    address?: string;
    guardian_contact_number?: string;
    class_adviser?: string;
    school_year?: string;
  };
  principalName?: string;
  schoolId?: string;
}

const SCHOOL_ID = "308135";
const BG_URL    = "/1frontstudentid.png";
const BACK_BG_URL = "/BACKID.png";
const LOGO_URL  = "/sv8clogoo.png";
const CARD_W    = 638;
const CARD_H    = 1013;

// ── AutoFitText: single line, shrinks font until text fits maxWidth ───────────
interface AutoFitTextProps {
  text: string;
  maxWidth: number;
  maxFontSize: number;
  minFontSize: number;
  style?: React.CSSProperties;
}
function AutoFitText({ text, maxWidth, maxFontSize, minFontSize, style = {} }: AutoFitTextProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    let size = maxFontSize;
    el.style.fontSize = `${size}px`;
    while (el.scrollWidth > maxWidth && size > minFontSize) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
    setFontSize(size);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, maxWidth, maxFontSize, minFontSize]);

  return (
    <span
      ref={spanRef}
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        overflow: "hidden",
        maxWidth,
        fontSize,
        ...style,
      }}
    >
      {text}
    </span>
  );
}

// ── AutoFitTextBlock: multi-line, shrinks font until text fits in maxLines ────
interface AutoFitTextBlockProps {
  text: string;
  maxWidth: number;
  maxLines: number;
  maxFontSize: number;
  minFontSize: number;
  style?: React.CSSProperties;
}
function AutoFitTextBlock({
  text, maxWidth, maxLines, maxFontSize, minFontSize, style = {},
}: AutoFitTextBlockProps) {
  const divRef  = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const el = divRef.current;
    if (!el) return;

    el.style.webkitLineClamp = "unset";
    el.style.display = "block";
    el.style.overflow = "visible";
    el.style.maxHeight = "none";

    let size = maxFontSize;
    el.style.fontSize = `${size}px`;
    const maxH = () => size * 1.4 * maxLines;
    while (el.scrollHeight > maxH() && size > minFontSize) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
    setFontSize(size);

    const finalHeight = Math.min(el.scrollHeight, maxH());
    el.style.display = "-webkit-box";
    el.style.overflow = "hidden";
    el.style.maxHeight = `${finalHeight}px`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, maxWidth, maxLines, maxFontSize, minFontSize]);

  return (
    <div
      ref={divRef}
      style={{
        width: maxWidth,
        minWidth: 0,
        fontSize,
        lineHeight: 1.4,
        wordBreak: "normal",
        overflowWrap: "break-word",
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: "vertical",
        ...style,
      }}
    >
      {text}
    </div>
  );
}

// ─── FRONT ────────────────────────────────────────────────────────────────────
export function StudentIDFront({ student, principalName, schoolId }: StudentIDCardProps) {
  const fullName = [
    student.last_name,
    student.first_name,
    student.middle_name ? student.middle_name[0] + "." : "",
  ].filter(Boolean).join(", ").toUpperCase() || "STUDENT NAME";

  const adviser  = student.class_adviser?.toUpperCase() || "ADVISER NAME";
  const section  = student.section_name?.toUpperCase()  || "SECTION";
  const lrn      = student.lrn      || "___________";
  const grade    = student.grade_level ?? "—";
  const sy       = student.school_year || "2025 - 2026";
  const sid      = schoolId || SCHOOL_ID;

  return (
    <div style={{
      width: CARD_W, height: CARD_H,
      position: "relative", borderRadius: 14,
      overflow: "hidden", boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
      fontFamily: "Arial, sans-serif",
      backgroundImage: `url(${BG_URL})`,
      backgroundSize: "100% 100%",
      backgroundRepeat: "no-repeat",
    }}>

      {/* ── STUDENT PHOTO ── */}
      <div style={{
        position: "absolute", left: 36, top: 160,
        width: 228, height: 230,
        background: "#fff", border: "4px solid #1a3a6b",
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {student.photo_path ? (
          <img src={student.photo_path} alt="Student"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />
        ) : (
          <span style={{ color: "#9ca3af", fontSize: 15, textAlign: "center" }}>2x2<br/>PHOTO</span>
        )}
      </div>

     

      {/* ── SCHOOL ID ── */}
      <div style={{
        position: "absolute", left: 378, top: 368, width: 220,
        textAlign: "center", fontSize: 21, fontWeight: "bold", color: "#e05a2b",
      }}>
        SCHOOL ID: {sid}
      </div>

      {/* ── LRN BAR ── */}
      <div style={{
        position: "absolute", left: 342, top: 400, width: 255, height: 30,
        background: "#e05a2b", borderRadius: 5,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: "bold", fontSize: 15, letterSpacing: "0.4px",
      }}>
        LRN: {lrn}
      </div>

      {/* ── STUDENT NAME ── */}
      <div style={{
        position: "absolute", left: 43, top: 520, width: 560,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ width: "100%", textAlign: "center", marginBottom: 6 }}>
          <AutoFitText
            text={fullName}
            maxWidth={540}
            maxFontSize={38}
            minFontSize={14}
            style={{ fontWeight: "bold", color: "#000000", textShadow: "0 0 5px #fff, 0 0 5px #fff" }}
          />
        </div>
        <div style={{ borderTop: "2px solid #000000", width: "100%" }} />
        <div style={{ textAlign: "center", fontSize: 25, fontWeight: 600,
          letterSpacing: 3, color: "#fff", textShadow: "0 0 3px #000000", marginTop: 6 }}>
          STUDENT NAME
        </div>
      </div>

      {/* ── ADVISER NAME ── */}
      <div style={{
        position: "absolute", left: 43, top: 680, width: 560,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ width: "100%", textAlign: "center", marginBottom: 6 }}>
          <AutoFitText
            text={adviser}
            maxWidth={540}
            maxFontSize={34}
            minFontSize={13}
            style={{ fontWeight: "bold", color: "#000000", textShadow: "0 0 5px #fff, 0 0 5px #fff" }}
          />
        </div>
        <div style={{ borderTop: "2px solid #000000", width: "100%" }} />
        <div style={{ textAlign: "center", fontSize: 25, fontWeight: 600,
          letterSpacing: 3, color: "#fff", textShadow: "0 0 3px #000000", marginTop: 6 }}>
          ADVISER
        </div>
      </div>

      {/* Grade label + number — inside the yellow area of the background image */}
      <div style={{
        position: "absolute", left: -10, top: 891, width: 130,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
        fontFamily: "Arial, sans-serif", textAlign: "center",
      }}>
        <div style={{ fontSize: 20, fontWeight: "bold", color: "#1a3a6b", letterSpacing: 1, textAlign: "center", width: "100%" }}>GRADE</div>
        <div style={{ fontSize: String(grade).length === 1 ? 92 : 90, fontWeight: "bold", color: "#1a3a6b", lineHeight: 1, textAlign: "center", width: "100%" }}>{grade}</div>
      </div>

      {/* Section name — yellow text on dark blue background of the image */}
      <div style={{
        position: "absolute", left: 140, top: 854, width: 498, height: 119,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <AutoFitText
          text={section}
          maxWidth={470}
          maxFontSize={76}
          minFontSize={20}
          style={{ fontWeight: "bold", color: "#f5c518", letterSpacing: 1, textAlign: "center" }}
        />
      </div>

      {/* School year — dark text on the yellow SY strip of the background image */}
      <div style={{
        position: "absolute", left: 140, top: 973, width: 498, height: 40,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: "bold", color: "#1a3a6b", letterSpacing: 1,
        fontFamily: "Arial, sans-serif",
      }}>
        S.Y. {sy}
      </div>
    </div>
  );
}

// ─── BACK ─────────────────────────────────────────────────────────────────────
export function StudentIDBack({ student, principalName }: StudentIDCardProps) {
  const principal = principalName || "PRINCIPAL NAME, Ph.D.";
  const address   = student.address ? student.address.toUpperCase() : "";

  return (
    <div style={{
      width: CARD_W, height: CARD_H,
      position: "relative",
      borderRadius: 14,
      overflow: "hidden", border: "2px solid #bbb", boxSizing: "border-box",
      fontFamily: "Arial, sans-serif",
      boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
      display: "flex", flexDirection: "column",
      // CHANGED: background is now BACKID.png instead of a flat color
      backgroundImage: `url(${BACK_BG_URL})`,
      backgroundSize: "100% 100%",
      backgroundRepeat: "no-repeat",
    }}>

      {/* Emergency header — navy/orange/white/orange/navy sandwich, matching
          the front card's baked-in header height (119px) exactly so FRONT
          and BACK line up evenly when placed side by side. */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ height: 12, background: "#1a3a6b" }} />
        <div style={{ height: 8, background: "#e05a2b" }} />
        <div style={{
          height: 74, background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: 27, fontWeight: "bold", color: "#1a3a6b",
            letterSpacing: "0.5px", textAlign: "center", padding: "0 20px",
          }}>
            IN CASE OF EMERGENCY PLEASE NOTIFY:
          </div>
        </div>
        <div style={{ height: 8, background: "#e05a2b" }} />
        <div style={{ height: 12, background: "#1a3a6b" }} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "space-between", padding: "0 34px 0", minWidth: 0 }}>

        {/* Guardian Name — marginTop 41 matches the front card's exact gap
            between its header (119px) and the photo box below it, so both
            cards' content rows start at the same height. */}
        <div style={{ textAlign: "center", marginTop: 41, paddingBottom: 8 }}>
          <AutoFitText
            text={student.guardian_name ? student.guardian_name.toUpperCase() : ""}
            maxWidth={540}
            maxFontSize={22}
            minFontSize={10}
            style={{ fontWeight: "bold", color: "#111", display: "block", textAlign: "center", marginBottom: 6 }}
          />
          <div style={{ borderBottom: "2px solid #333", margin: "0 6px 6px" }} />
          <div style={{ fontSize: 22, color: "#e05a2b", fontWeight: "bold", letterSpacing: 2 }}>GUARDIAN NAME</div>
        </div>

        {/* Emergency Number */}
        <div style={{ textAlign: "center", padding: "1px 0" }}>
          <AutoFitText
            text={student.guardian_contact_number || ""}
            maxWidth={540}
            maxFontSize={30}
            minFontSize={10}
            style={{ fontWeight: "bold", color: "#111", display: "block", textAlign: "center", marginBottom: 6 }}
          />
          <div style={{ borderBottom: "2px solid #333", margin: "0 6px 6px" }} />
          <div style={{ fontSize: 22, color: "#e05a2b", fontWeight: "bold", letterSpacing: 2 }}>EMERGENCY NUMBER</div>
        </div>

        {/* Address */}
        <div style={{ textAlign: "center", padding: "10px 0", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 6, minWidth: 0 }}>
            <AutoFitTextBlock
              text={address}
              maxWidth={540}
              maxLines={3}
              maxFontSize={20}
              minFontSize={9}
              style={{ fontWeight: "bold", color: "#111", textAlign: "center" }}
            />
          </div>
          <div style={{ borderBottom: "2px solid #333", margin: "0 6px 6px" }} />
          <div style={{ fontSize: 22, color: "#e05a2b", fontWeight: "bold", letterSpacing: 2 }}>FULL ADDRESS</div>
        </div>

        {/* Certification */}
        <div style={{ border: "2px solid #333", borderRadius: 10, padding: "20px 20px",
          fontSize: 19.5, color: "#222", lineHeight: 1.6, textAlign: "center", marginBottom: 10 }}>
          <p style={{ margin: "0 0 30px 0" }}>
            This certifies that the student whose photo appears hereon is a bona fide student of Southville 8C National High School.
          </p>
          <p style={{ margin: 0 }}>
            This school ID card must be worn at all times while on the school campus.
            Alterations, tampering, and borrowing of school IDs are strictly prohibited.
          </p>
        </div>
        {/* Signature */}
        <div style={{ textAlign: "center", paddingBottom: 90, marginTop: -30 }}>
          <div style={{ borderBottom: "2px solid #333", width: "75%", margin: "0 auto 6px", height: 50 }} />
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#e05a2b" }}>{principal}</div>
          <div style={{ fontSize: 15, color: "#111", letterSpacing: 2, marginTop: 4 }}>PRINCIPAL I</div>
        </div>
      </div>

    </div>
  );
}

// ─── DEFAULT EXPORT ────────────────────────────────────────────────────────────
export default function StudentIDCard(props: StudentIDCardProps) {
  return (
    <div style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div>
        <p style={{ textAlign: "center", fontSize: 14, marginBottom: 10, color: "#555", fontFamily: "Arial" }}>FRONT</p>
        <StudentIDFront {...props} />
      </div>
      <div>
        <p style={{ textAlign: "center", fontSize: 14, marginBottom: 10, color: "#555", fontFamily: "Arial" }}>BACK</p>
        <StudentIDBack {...props} />
      </div>
    </div>
  );
}
