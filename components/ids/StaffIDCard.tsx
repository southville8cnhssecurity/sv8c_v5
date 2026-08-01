"use client";
import React, { useRef, useState, useLayoutEffect } from "react";

const W = 638;
const H = 1013;
const NAVY = "#163E72";
const ORANGE = "#F47C20";

export interface StaffIDProps {
  staff: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    position?: string;
    staff_number?: string;
    photo_path?: string;
    contact_number?: string;
    address?: string;
    school_year?: string;
  };
  principalName?: string;
  schoolName?: string;
}

function AutoFitText({ text, maxWidth, maxFontSize, minFontSize, style = {} }: {
  text: string; maxWidth: number; maxFontSize: number; minFontSize: number; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [fs, setFs] = useState(maxFontSize);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    let s = maxFontSize; el.style.fontSize = `${s}px`;
    while (el.scrollWidth > maxWidth && s > minFontSize) { s -= 0.5; el.style.fontSize = `${s}px`; }
    setFs(s);
  }, [text, maxWidth, maxFontSize, minFontSize]);
  return <span ref={ref} style={{ display:"inline-block", whiteSpace:"nowrap", overflow:"hidden", maxWidth, fontSize:fs, ...style }}>{text}</span>;
}

// Wraps normally up to `maxLines` lines, shrinking font size until it fits within that many lines.
function AutoFitMultilineText({ text, maxWidth, maxLines, maxFontSize, minFontSize, lineHeight = 1.15, style = {} }: {
  text: string; maxWidth: number; maxLines: number; maxFontSize: number; minFontSize: number; lineHeight?: number; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [fs, setFs] = useState(maxFontSize);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    let s = maxFontSize;
    el.style.fontSize = `${s}px`;
    let guard = 0;
    while (el.scrollHeight > s * lineHeight * maxLines + 2 && s > minFontSize && guard < 200) {
      s -= 0.5; el.style.fontSize = `${s}px`; guard++;
    }
    setFs(s);
  }, [text, maxWidth, maxLines, maxFontSize, minFontSize, lineHeight]);
  return (
    <div ref={ref} style={{
      width: maxWidth, margin: "0 auto", fontSize: fs, lineHeight,
      display: "-webkit-box", WebkitLineClamp: maxLines, WebkitBoxOrient: "vertical",
      overflow: "hidden", wordBreak: "break-word", ...style,
    }}>{text}</div>
  );
}

export function StaffIDFront({ staff, schoolName }: StaffIDProps) {
  const name = [staff.first_name, staff.middle_name, staff.last_name]
    .filter(Boolean).join(" ").toUpperCase() || "FIRST NAME MIDDLE NAME LAST NAME";

  return (
    <div style={{ width:W, height:H, position:"relative", overflow:"hidden",
      fontFamily:"'Poppins', Arial, sans-serif",
      backgroundImage:"url('/staffidfront.png')", backgroundSize:"cover", backgroundPosition:"center",
      borderRadius:8, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>

      {/* Header */}
      <div style={{ background:NAVY, padding:"16px 16px 12px", flexShrink:0, position:"relative", zIndex:1 }}>
        <div style={{ fontSize:24, fontWeight:800, color:"#fff", textAlign:"center", letterSpacing:.5 }}>
          {(schoolName||"SOUTH VILLE 8C NATIONAL HIGH SCHOOL").toUpperCase()}
        </div>
        <div style={{ fontSize:18, color:"rgba(255,255,255,0.72)", textAlign:"center", marginTop:4, lineHeight:1.4, whiteSpace:"nowrap" }}>
          B12 L36 PH1N. SOUTHVILLE 8C. SAN ISIDRO, MONTALBAN, RIZAL
        </div>
      </div>
      {/* Orange divider */}
      <div style={{ height:5, background:ORANGE, position:"relative", zIndex:1 }} />

      {/* STAFF */}
      <div style={{ textAlign:"center", padding:"22px 0 18px", position:"relative", zIndex:1 }}>
        <span style={{ fontSize:150, fontWeight:800, color:NAVY, letterSpacing:5, lineHeight:1,
          display:"block", fontFamily:"'Poppins', 'Arial Black', sans-serif" }}>STAFF</span>
      </div>

      {/* Photo */}
      <div style={{ display:"flex", justifyContent:"center", paddingTop:60, paddingBottom:80, position:"relative", zIndex:1 }}>
        <div style={{ width:292, height:292, border:`3px solid ${NAVY}`, borderRadius:24,
          overflow:"hidden", background:"#fff",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          {staff.photo_path
            ? <img src={staff.photo_path} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center" }} alt="" />
            : <svg width="70" height="84" viewBox="0 0 60 72"><circle cx="30" cy="20" r="16" fill="#9ca3af"/>
                <path d="M0 72 C0 48 60 48 60 72" fill="#9ca3af"/></svg>}
        </div>
      </div>

      {/* Name */}
      <div style={{ textAlign:"center", padding:"0 36px 4px", position:"relative", zIndex:1 }}>
        <AutoFitText text={name} maxWidth={560} maxFontSize={42} minFontSize={18}
          style={{ fontWeight:700, color:NAVY }} />
        <div style={{ borderBottom:`2.5px solid ${NAVY}`, margin:"8px 24px 6px" }} />
        <div style={{ fontSize:30, color:ORANGE, fontWeight:700, letterSpacing:3.5 }}>NAME</div>
      </div>

      {/* Position */}
      <div style={{ textAlign:"center", padding:"16px 36px 4px", position:"relative", zIndex:1 }}>
        <AutoFitText text={(staff.position||"—").toUpperCase()} maxWidth={560} maxFontSize={38} minFontSize={16}
          style={{ fontWeight:700, color:NAVY }} />
        <div style={{ borderBottom:`2.5px solid ${NAVY}`, margin:"8px 24px 6px" }} />
        <div style={{ fontSize:30, color:ORANGE, fontWeight:700, letterSpacing:3.5 }}>POSITION</div>
      </div>

      {/* Footer */}
      <div style={{ position:"absolute", bottom:30, left:0, right:0, height:10, background:ORANGE, zIndex:1 }} />
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:30, background:NAVY, zIndex:1 }} />
    </div>
  );
}

export function StaffIDBack({ staff, principalName, schoolName }: StaffIDProps) {
  const principal = principalName || "PRINCIPAL NAME, Ph.D.";

  return (
    <div style={{ width:W, height:H, position:"relative", overflow:"hidden",
      fontFamily:"'Poppins', Arial, sans-serif",
      backgroundImage:"url('/staffidback.png')", backgroundSize:"cover", backgroundPosition:"center",
      borderRadius:8, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ background:NAVY, padding:"16px 16px 12px", flexShrink:0 }}>
        <div style={{ fontSize:24, fontWeight:800, color:"#fff", textAlign:"center", letterSpacing:.5 }}>
          {(schoolName||"SOUTH VILLE 8C NATIONAL HIGH SCHOOL").toUpperCase()}
        </div>
        <div style={{ fontSize:18, color:"rgba(255,255,255,0.72)", textAlign:"center", marginTop:4, lineHeight:1.4, whiteSpace:"nowrap" }}>
          B12 L36 PH1N. SOUTHVILLE 8C. SAN ISIDRO, MONTALBAN, RIZAL
        </div>
      </div>
      <div style={{ height:5, background:ORANGE, flexShrink:0 }} />

      {/* STAFF INFORMATION */}
      <div style={{ textAlign:"center", padding:"36px 0 32px", position:"relative", zIndex:1 }}>
        <span style={{ fontSize:48, fontWeight:900, color:NAVY, letterSpacing:2,
          fontFamily:"'Poppins', 'Arial Black', sans-serif" }}>STAFF INFORMATION</span>
      </div>

      {/* Content */}
      <div style={{ flex:1, padding:"0 48px", display:"flex", flexDirection:"column",
        justifyContent:"center", gap:52, position:"relative", zIndex:1 }}>

        {/* Contact */}
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:45, fontWeight:800, color:NAVY, fontFamily:"monospace", marginBottom:14 }}>
            {staff.contact_number||"—"}
          </div>
          <div style={{ borderBottom:`3px solid ${NAVY}`, marginBottom:10 }} />
          <div style={{ fontSize:23, color:ORANGE, fontWeight:800, letterSpacing:3.5 }}>CONTACT NUMBER</div>
        </div>

        {/* Address — wraps up to 3 lines, shrinks if still too long */}
        <div style={{ textAlign:"center" }}>
          <AutoFitMultilineText
            text={(staff.address||"—").toUpperCase()}
            maxWidth={560}
            maxLines={3}
            maxFontSize={34}
            minFontSize={12}
            style={{ fontWeight:800, color:NAVY, textAlign:"center", marginBottom:14 }}
          />
          <div style={{ borderBottom:`2px solid ${NAVY}`, marginBottom:10 }} />
          <div style={{ fontSize:23, color:ORANGE, fontWeight:800, letterSpacing:3.5 }}>FULL ADDRESS</div>
        </div>

{/* Signature */}
        <div style={{ textAlign:"center", marginTop:120 }}>
          <div style={{ borderBottom:`3px solid ${NAVY}`, width:"60%", margin:"0 auto 14px", height:48 }} />
          <div style={{ fontSize:24, fontWeight:800, color:ORANGE }}>{principal}</div>
          <div style={{ fontSize:18, fontWeight:800, color:"#666", letterSpacing:2, marginTop:6 }}>PRINCIPAL I</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ height:10, background:ORANGE, flexShrink:0, zIndex:1 }} />
      <div style={{ height:30, background:NAVY, flexShrink:0, zIndex:1 }} />
    </div>
  );
}

export default function StaffIDCard(props: StaffIDProps) {
  return (
    <div style={{ display:"flex", gap:30, flexWrap:"wrap", alignItems:"flex-start" }}>
      <div>
        <p style={{ textAlign:"center", fontSize:14, marginBottom:10, color:"#555", fontFamily:"Arial" }}>FRONT</p>
        <StaffIDFront {...props} />
      </div>
      <div>
        <p style={{ textAlign:"center", fontSize:14, marginBottom:10, color:"#555", fontFamily:"Arial" }}>BACK</p>
        <StaffIDBack {...props} />
      </div>
    </div>
  );
}
