var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/room.js
import { DurableObject } from "cloudflare:workers";

// shared/scenario.js
var SESSION_LABEL = "\u05DE\u05BE0 \u05DC\u05BE100 \u2013 Safety Day 2026";
var STAGES = [
  { n: 1, id: "s1", title: "\u05E4\u05EA\u05D9\u05D7\u05D4", axis: "\u05E4\u05EA\u05D9\u05D7\u05D4" },
  { n: 2, id: "s2", title: "\u05D4\u05E6\u05D8\u05D1\u05E8\u05D5\u05EA \u05EA\u05E0\u05D5\u05E2\u05D4", axis: "\u05D4\u05E6\u05D8\u05D1\u05E8\u05D5\u05EA" },
  { n: 3, id: "s3", title: "LAHAK3 \u05D5\u05D4\u05DE\u05D9\u05D3\u05E2 \u05D4\u05DE\u05D0\u05D5\u05D7\u05E8", axis: "LAHAK3" },
  { n: 4, id: "s4", title: "\u05D4\u05EA\u05DB\u05E0\u05E1\u05D5\u05EA", axis: "\u05D4\u05EA\u05DB\u05E0\u05E1\u05D5\u05EA" },
  { n: 5, id: "s5", title: "\u05D4\u05E7\u05D5\u05E8\u05DE\u05D5\u05E8\u05E0\u05D9\u05DD", axis: "\u05E7\u05D5\u05E8\u05DE\u05D5\u05E8\u05E0\u05D9\u05DD" },
  { n: 6, id: "s6", title: "MAYDAY", axis: "MAYDAY" }
];
var LOAD_QUESTION = "\u05DE\u05D4 \u05E8\u05DE\u05EA \u05D4\u05E2\u05D5\u05DE\u05E1 \u05E9\u05D0\u05EA\u05D4 \u05DE\u05E8\u05D2\u05D9\u05E9 \u05DB\u05E8\u05D2\u05E2?";
var QUESTIONS = [
  { id: "q1", kind: "scale10", stage: "s1", track: "load", text: LOAD_QUESTION, adminTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \xB7 \u05E9\u05DC\u05D1 1", liveTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \u05E4\u05EA\u05D5\u05D7\u05D4" },
  { id: "q2", kind: "scale10", stage: "s2", track: "load", text: LOAD_QUESTION, adminTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \xB7 \u05E9\u05DC\u05D1 2", liveTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \u05E4\u05EA\u05D5\u05D7\u05D4" },
  {
    id: "q3a",
    kind: "scale10",
    stage: "s3",
    track: "shift",
    text: "\u05E2\u05D3 \u05DB\u05DE\u05D4 \u05EA\u05DE\u05D5\u05E0\u05EA \u05D4\u05E2\u05D1\u05D5\u05D3\u05D4 \u05E9\u05DC\u05DA \u05D4\u05E9\u05EA\u05E0\u05EA\u05D4 \u05D1\u05E2\u05E7\u05D1\u05D5\u05EA \u05D4\u05DE\u05D9\u05D3\u05E2 \u05D4\u05D0\u05D7\u05E8\u05D5\u05DF?",
    low: "\u05DB\u05DE\u05E2\u05D8 \u05DC\u05D0 \u05D4\u05E9\u05EA\u05E0\u05EA\u05D4",
    high: "\u05D4\u05E9\u05EA\u05E0\u05EA\u05D4 \u05DC\u05D7\u05DC\u05D5\u05D8\u05D9\u05DF",
    adminTitle: "\u05E9\u05D9\u05E0\u05D5\u05D9 \u05EA\u05DE\u05D5\u05E0\u05EA \u05E2\u05D1\u05D5\u05D3\u05D4 \xB7 \u05E9\u05DC\u05D1 3",
    liveTitle: "\u05D4\u05E9\u05D0\u05DC\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D4"
  },
  { id: "q3b", kind: "scale10", stage: "s3", track: "load", text: LOAD_QUESTION, adminTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \xB7 \u05E9\u05DC\u05D1 3", liveTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \u05E4\u05EA\u05D5\u05D7\u05D4" },
  { id: "q4", kind: "scale10", stage: "s4", track: "load", text: LOAD_QUESTION, adminTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \xB7 \u05E9\u05DC\u05D1 4", liveTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \u05E4\u05EA\u05D5\u05D7\u05D4" },
  { id: "q5", kind: "scale10", stage: "s5", track: "load", text: LOAD_QUESTION, adminTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \xB7 \u05E9\u05DC\u05D1 5", liveTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \u05E4\u05EA\u05D5\u05D7\u05D4" },
  { id: "q6", kind: "scale10", stage: "s6", track: "load", text: LOAD_QUESTION, adminTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \xB7 \u05E9\u05DC\u05D1 6", liveTitle: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \u05E4\u05EA\u05D5\u05D7\u05D4" },
  {
    id: "qTimeline",
    kind: "timeline",
    stage: null,
    track: "timeline",
    text: "\u05D1\u05D0\u05D9\u05D6\u05D4 \u05E9\u05DC\u05D1 \u05D4\u05E8\u05D2\u05E9\u05EA \u05E9\u05D4\u05E2\u05D5\u05DE\u05E1 \u05DE\u05D1\u05D7\u05D9\u05E0\u05EA\u05DA \u05D4\u05E9\u05EA\u05E0\u05D4 \u05D1\u05D0\u05D5\u05E4\u05DF \u05DE\u05E9\u05DE\u05E2\u05D5\u05EA\u05D9?",
    adminTitle: "\u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05E9\u05D9\u05E0\u05D5\u05D9",
    liveTitle: "\u05D4\u05E9\u05D0\u05DC\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D4"
  },
  {
    id: "qOpen",
    kind: "text",
    stage: null,
    track: "open",
    text: "\u05DE\u05D4 \u05D2\u05D5\u05E8\u05DD \u05DC\u05DA \u05DC\u05D6\u05D4\u05D5\u05EA \u05E9\u05D0\u05EA\u05D4 \u05DE\u05EA\u05E7\u05E8\u05D1 \u05DC\u05BE100?",
    hint: "\u05D1\u05DE\u05E9\u05E4\u05D8 \u05D0\u05D7\u05D3",
    adminTitle: "\u05E9\u05D0\u05DC\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D4",
    liveTitle: "\u05D4\u05E9\u05D0\u05DC\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D4"
  }
];
var QUESTION_BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
var LOAD_TRACK = QUESTIONS.filter((q) => q.track === "load").map((q) => q.id);
var S = /* @__PURE__ */ __name((callsign, patch) => ({ op: "update", id: callsign, patch }), "S");
var ADD = /* @__PURE__ */ __name((strip) => ({ op: "add", strip }), "ADD");
var FLOW = [
  // ── שלב 1 · תמונת פתיחה רגועה ──────────────────────────────────────────────
  {
    id: "f-s1-open",
    stage: "s1",
    kind: "beat",
    label: "\u05EA\u05DE\u05D5\u05E0\u05EA \u05E4\u05EA\u05D9\u05D7\u05D4",
    summary: "AIZ801 \u05DE\u05D5\u05DB\u05DF \u05DC\u05E7\u05DC\u05D9\u05E8\u05E0\u05E1 \xB7 FM1 \u05E2\u05DC \u05D4\u05DE\u05E1\u05DC\u05D5\u05DC \xB7 ISR045 \u05D7\u05DE\u05E9 \u05D3\u05E7\u05D5\u05EA \u05DE\u05BERASAF",
    note: "\u05D6\u05D5 \u05D4\u05EA\u05DE\u05D5\u05E0\u05D4 \u05D4\u05E8\u05D2\u05D5\u05E2\u05D4. \u05EA\u05DF \u05DC\u05D4 \u05DC\u05E9\u05D1\u05EA. \u05D4\u05DE\u05EA\u05DF 15\u201320 \u05E9\u05E0\u05D9\u05D5\u05EA \u05DC\u05E4\u05E0\u05D9 \u05E4\u05EA\u05D9\u05D7\u05EA \u05DE\u05D3\u05D9\u05D3\u05EA \u05D4\u05E2\u05D5\u05DE\u05E1 \u05D4\u05E8\u05D0\u05E9\u05D5\u05E0\u05D4.",
    actions: [
      ADD({ id: "ISR045", callsign: "ISR045", acType: "A320", kind: "arr", pos: "RASAF", note: "\u05E2\u05D5\u05D3 5 \u05D3\u05E7\u05D5\u05EA \u05D1\u05BERASAF \u05DC\u05E0\u05D7\u05D9\u05EA\u05D4" }),
      ADD({ id: "AIZ801", callsign: "AIZ801", acType: "A21N", kind: "dep", pos: "APRON", note: "\u05DE\u05D5\u05DB\u05DF \u05DC\u05E7\u05D1\u05DC \u05E7\u05DC\u05D9\u05E8\u05E0\u05E1" }),
      ADD({ id: "FM1", callsign: "FM1", acType: "P28A", kind: "local", pos: "RWY 01", note: "\u05E2\u05DC \u05D4\u05DE\u05E1\u05DC\u05D5\u05DC" })
    ]
  },
  { id: "f-q1", stage: "s1", kind: "question", questionId: "q1", label: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \u05E8\u05D0\u05E9\u05D5\u05E0\u05D4", note: "\u05E4\u05EA\u05D7 \u05D0\u05EA \u05D4\u05DE\u05D3\u05D9\u05D3\u05D4 \u05E8\u05E7 \u05DC\u05D0\u05D7\u05E8 \u05E9\u05D4\u05EA\u05DE\u05D5\u05E0\u05D4 \u05E9\u05D1\u05D4. \u05D0\u05DC \u05EA\u05D7\u05E9\u05D5\u05E3 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA." },
  // ── שלב 2 · תחילת הצטברות ──────────────────────────────────────────────────
  {
    id: "f-s2-cge",
    stage: "s2",
    kind: "beat",
    label: "4XCGE \u05E7\u05D5\u05E8\u05D0 \u05DC\u05E7\u05DC\u05D9\u05E8\u05E0\u05E1",
    summary: "\u05EA\u05E0\u05D5\u05E2\u05D4 \u05D7\u05D3\u05E9\u05D4 \u05E0\u05DB\u05E0\u05E1\u05EA \u05DC\u05EA\u05DE\u05D5\u05E0\u05D4 \u2013 \u05D0\u05D9\u05DE\u05D5\u05DF \u05DE\u05DB\u05E9\u05D9\u05E8\u05D9\u05DD",
    note: "\u05D4\u05D0\u05D9\u05E8\u05D5\u05E2\u05D9\u05DD \u05E0\u05DB\u05E0\u05E1\u05D9\u05DD \u05D0\u05D7\u05D3 \u05D0\u05D7\u05E8\u05D9 \u05D4\u05E9\u05E0\u05D9. \u05D0\u05DC \u05EA\u05E4\u05E2\u05D9\u05DC \u05D0\u05EA \u05D4\u05E9\u05E0\u05D9 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D4\u05E8\u05D0\u05E9\u05D5\u05DF \u05E0\u05E7\u05DC\u05D8 \u2013 \u05DB\u05BE3\u20135 \u05E9\u05E0\u05D9\u05D5\u05EA \u05D1\u05D9\u05E0\u05D9\u05D4\u05DD.",
    actions: [ADD({ id: "4XCGE", callsign: "4XCGE", acType: "C172", kind: "local", pos: "APRON", note: "\u05E7\u05D5\u05E8\u05D0 \u05DC\u05E7\u05D1\u05DC\u05EA \u05E7\u05DC\u05D9\u05E8\u05E0\u05E1 \u05DC\u05D0\u05D9\u05DE\u05D5\u05DF \u05DE\u05DB\u05E9\u05D9\u05E8\u05D9\u05DD" })]
  },
  {
    id: "f-s2-aiz",
    stage: "s2",
    kind: "beat",
    label: "AIZ801 \u2013 \u05DE\u05D5\u05DB\u05DF \u05DC\u05E4\u05D5\u05E9\u05D1\u05E7",
    summary: "\u05E2\u05D3\u05DB\u05D5\u05DF \u05E1\u05D8\u05D8\u05D5\u05E1 \u05E2\u05DC \u05E1\u05D8\u05E8\u05D9\u05E4 \u05E7\u05D9\u05D9\u05DD",
    note: "\u05E9\u05D9\u05DD \u05DC\u05D1 \u05E9\u05D4\u05D4\u05D3\u05D2\u05E9\u05D4 \u05E2\u05DC \u05D4\u05E1\u05D8\u05E8\u05D9\u05E4 \u05E0\u05E8\u05D0\u05D9\u05EA \u05DC\u05DB\u05D5\u05DC\u05DD \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D0\u05EA\u05D4 \u05DE\u05DE\u05E9\u05D9\u05DA.",
    actions: [S("AIZ801", { note: "\u05DE\u05D5\u05DB\u05DF \u05DC\u05E4\u05D5\u05E9\u05D1\u05E7", pos: "APRON" })]
  },
  {
    id: "f-s2-isr",
    stage: "s2",
    kind: "beat",
    label: "ISR045 \u2013 \u05E7\u05D5\u05E8\u05D0 \u05D1\u05E7\u05E9\u05E8",
    summary: "\u05D4\u05E0\u05D7\u05D9\u05EA\u05D4 \u05E0\u05DB\u05E0\u05E1\u05EA \u05DC\u05EA\u05D3\u05E8",
    note: "\u05DC\u05D0\u05D7\u05E8 \u05D4\u05D0\u05D9\u05E8\u05D5\u05E2 \u05D4\u05D6\u05D4 \u2013 \u05E4\u05EA\u05D7 \u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \u05E0\u05D5\u05E1\u05E4\u05EA.",
    actions: [S("ISR045", { note: "\u05E7\u05D5\u05E8\u05D0 \u05D1\u05E7\u05E9\u05E8" })]
  },
  { id: "f-q2", stage: "s2", kind: "question", questionId: "q2", label: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \xB7 \u05E9\u05DC\u05D1 2", note: "\u05D0\u05DC \u05EA\u05D7\u05E9\u05D5\u05E3 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA. \u05E1\u05D2\u05D5\u05E8 \u05DB\u05E9\u05D4\u05DE\u05D5\u05E0\u05D4 \u05DE\u05D2\u05D9\u05E2 \u05DC\u05DB\u05D5\u05DC\u05DD \u05D0\u05D5 \u05DB\u05E9\u05D4\u05E7\u05E6\u05D1 \u05DE\u05D7\u05D9\u05D9\u05D1." },
  // ── שלב 3 · מידע לא צפוי ───────────────────────────────────────────────────
  {
    id: "f-s3-call",
    stage: "s3",
    kind: "beat",
    label: "\u{1F4DE} \u05E9\u05D9\u05D7\u05D4 \u05E0\u05DB\u05E0\u05E1\u05EA",
    summary: "\u05E8\u05E7 \u05D7\u05D9\u05D5\u05D5\u05D9 \u05D4\u05E9\u05D9\u05D7\u05D4 \u2013 \u05D1\u05DC\u05D9 \u05EA\u05D5\u05DB\u05DF",
    note: "\u05EA\u05DF \u05DC\u05E9\u05D9\u05D7\u05D4 \u05DC\u05E6\u05DC\u05E6\u05DC \u05DB\u05BE3 \u05E9\u05E0\u05D9\u05D5\u05EA \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D0\u05EA\u05D4 \u05D7\u05D5\u05E9\u05E3 \u05D0\u05EA \u05D4\u05EA\u05D5\u05DB\u05DF. \u05D4\u05E9\u05E7\u05D8 \u05D4\u05D6\u05D4 \u05E2\u05D5\u05D1\u05D3.",
    actions: [{ op: "overlay", overlay: { kind: "phone", state: "ringing" } }]
  },
  {
    id: "f-s3-lahak",
    stage: "s3",
    kind: "beat",
    label: "\u05EA\u05D5\u05DB\u05DF \u05D4\u05E9\u05D9\u05D7\u05D4 \xB7 LAHAK3",
    summary: "\u05D4\u05D6\u05E0\u05E7\u05D4 \u05D1\u05D0\u05D9\u05D7\u05D5\u05E8 \xB7 \u05D1\u05D0\u05D5\u05D5\u05D9\u05E8 \u05D1\u05E2\u05D5\u05D3 \u05DB\u05D3\u05E7\u05D4 \xB7 \u05E4\u05D9\u05E0\u05D5\u05D9 \u05DC\u05E1\u05D5\u05E8\u05D5\u05E7\u05D4",
    note: "\u05D4\u05DE\u05EA\u05DF \u05DB\u05BE2 \u05E9\u05E0\u05D9\u05D5\u05EA \u05DC\u05D0\u05D7\u05E8 LAHAK3 \u05D5\u05D0\u05D6 \u05D4\u05E4\u05E2\u05DC \u05D0\u05EA AIZ801. \u05DC\u05D0\u05D7\u05E8 \u05DE\u05DB\u05DF \u05D4\u05DE\u05E9\u05DA \u05D1\u05E8\u05E6\u05E3 \u05E2\u05D3 \u05E1\u05D5\u05E3 \u05D4\u05E9\u05DC\u05D1.",
    actions: [
      {
        op: "overlay",
        overlay: {
          kind: "phone",
          state: "content",
          callsign: "LAHAK3",
          lines: ["\u05D4\u05D6\u05E0\u05E7\u05D4 \u05D4\u05EA\u05E7\u05D1\u05DC\u05D4 \u05D1\u05D0\u05D9\u05D7\u05D5\u05E8", "\u05E6\u05E4\u05D5\u05D9 \u05DC\u05D4\u05D9\u05D5\u05EA \u05D1\u05D0\u05D5\u05D5\u05D9\u05E8 \u05D1\u05E2\u05D5\u05D3 \u05DB\u05D3\u05E7\u05D4", "\u05E4\u05D9\u05E0\u05D5\u05D9 \u05DC\u05E1\u05D5\u05E8\u05D5\u05E7\u05D4"]
        }
      },
      ADD({ id: "LAHAK3", callsign: "LAHAK3", acType: "UH60", kind: "local", pos: "\u05D4\u05D6\u05E0\u05E7\u05D4", note: "\u05D4\u05D6\u05E0\u05E7\u05D4 \u05D1\u05D0\u05D9\u05D7\u05D5\u05E8 \xB7 \u05E6\u05E4\u05D5\u05D9 \u05D1\u05D0\u05D5\u05D5\u05D9\u05E8 \u05D1\u05E2\u05D5\u05D3 \u05DB\u05D3\u05E7\u05D4 \xB7 \u05E4\u05D9\u05E0\u05D5\u05D9 \u05DC\u05E1\u05D5\u05E8\u05D5\u05E7\u05D4", pending: true })
    ]
  },
  {
    id: "f-s3-aiz",
    stage: "s3",
    kind: "beat",
    label: "AIZ801 \u2013 \u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05E1\u05D9\u05E2",
    summary: "\u05E2\u05D3\u05DB\u05D5\u05DF \u05E1\u05D8\u05D8\u05D5\u05E1",
    note: "\u05E8\u05E6\u05E3. \u05D0\u05DC \u05EA\u05DE\u05D4\u05E8 \u05D9\u05D5\u05EA\u05E8 \u05DE\u05D3\u05D9 \u2013 \u05DB\u05DC \u05E2\u05D3\u05DB\u05D5\u05DF \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05E8\u05D0\u05D5\u05EA.",
    actions: [S("AIZ801", { note: "\u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05E1\u05D9\u05E2" })]
  },
  {
    id: "f-s3-isr",
    stage: "s3",
    kind: "beat",
    label: "ISR045 \u2013 \u05D1\u05BEADIVI",
    summary: "\u05D4\u05E0\u05D7\u05D9\u05EA\u05D4 \u05DE\u05EA\u05E7\u05D3\u05DE\u05EA",
    note: "\u05E8\u05E6\u05E3.",
    actions: [S("ISR045", { note: "\u05D1\u05BEADIVI", pos: "ADIVI" })]
  },
  {
    id: "f-s3-fm1",
    stage: "s3",
    kind: "beat",
    label: "FM1 \u2013 \u05E2\u05DC A3, \u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05E4\u05E0\u05D9 A",
    summary: "\u05E2\u05D3\u05DB\u05D5\u05DF \u05DE\u05D9\u05E7\u05D5\u05DD",
    note: "\u05E8\u05E6\u05E3.",
    actions: [S("FM1", { note: "\u05E2\u05DC A3, \u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05E4\u05E0\u05D9 A", pos: "A3" })]
  },
  {
    id: "f-s3-cge",
    stage: "s3",
    kind: "beat",
    label: "4XCGE \u2013 \u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05E1\u05D9\u05E2",
    summary: "\u05E2\u05D3\u05DB\u05D5\u05DF \u05E1\u05D8\u05D8\u05D5\u05E1",
    note: "\u05D1\u05E1\u05D9\u05D5\u05DD \u05D4\u05E9\u05DC\u05D1 \u2013 \u05E9\u05EA\u05D9 \u05E9\u05D0\u05DC\u05D5\u05EA \u05E0\u05E4\u05E8\u05D3\u05D5\u05EA: \u05E7\u05D5\u05D3\u05DD \u05E9\u05D9\u05E0\u05D5\u05D9 \u05EA\u05DE\u05D5\u05E0\u05EA \u05D4\u05E2\u05D1\u05D5\u05D3\u05D4, \u05D0\u05D7\u05E8 \u05DB\u05DA \u05E2\u05D5\u05DE\u05E1.",
    actions: [S("4XCGE", { note: "\u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05E1\u05D9\u05E2" })]
  },
  { id: "f-q3a", stage: "s3", kind: "question", questionId: "q3a", label: "\u05E9\u05D9\u05E0\u05D5\u05D9 \u05EA\u05DE\u05D5\u05E0\u05EA \u05E2\u05D1\u05D5\u05D3\u05D4", note: "\u05D6\u05D5 \u05DC\u05D0 \u05E9\u05D0\u05DC\u05EA \u05E2\u05D5\u05DE\u05E1. \u05E1\u05D2\u05D5\u05E8 \u05D0\u05D5\u05EA\u05D4 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D0\u05EA\u05D4 \u05E4\u05D5\u05EA\u05D7 \u05D0\u05EA \u05DE\u05D3\u05D9\u05D3\u05EA \u05D4\u05E2\u05D5\u05DE\u05E1." },
  { id: "f-q3b", stage: "s3", kind: "question", questionId: "q3b", label: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \xB7 \u05E9\u05DC\u05D1 3", note: "\u05DE\u05D9\u05D3 \u05D0\u05D7\u05E8\u05D9 \u05D4\u05E7\u05D5\u05D3\u05DE\u05EA, \u05D1\u05D0\u05D5\u05EA\u05D5 \u05E8\u05D2\u05E2 \u05E8\u05D2\u05E9\u05D9." },
  // ── שלב 4 · התכנסות ────────────────────────────────────────────────────────
  {
    id: "f-s4-aiz",
    stage: "s4",
    kind: "beat",
    label: "AIZ801 \u2013 \u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05DE\u05E8\u05D0\u05D4, \u05DE\u05E7\u05D5\u05E9\u05E8\u05EA A1",
    summary: "\u05D4\u05D4\u05DE\u05E8\u05D0\u05D4 \u05DE\u05EA\u05E7\u05E8\u05D1\u05EA \u05DC\u05DE\u05E1\u05DC\u05D5\u05DC",
    note: "\u05DE\u05DB\u05D0\u05DF \u05D4\u05E2\u05D3\u05DB\u05D5\u05E0\u05D9\u05DD \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD \u05D1\u05D6\u05D4 \u05D0\u05D7\u05E8 \u05D6\u05D4. \u05E9\u05DE\u05D5\u05E8 \u05E2\u05DC \u05E7\u05E6\u05D1 \u05D0\u05D7\u05D9\u05D3.",
    actions: [S("AIZ801", { note: "\u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05DE\u05E8\u05D0\u05D4, \u05DE\u05E7\u05D5\u05E9\u05E8\u05EA A1", pos: "A1" })]
  },
  {
    id: "f-s4-cge",
    stage: "s4",
    kind: "beat",
    label: "4XCGE \u2013 \u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05DE\u05E8\u05D0\u05D4, \u05DE\u05E7\u05D5\u05E9\u05E8\u05EA A2",
    summary: "\u05EA\u05E0\u05D5\u05E2\u05D4 \u05E9\u05E0\u05D9\u05D9\u05D4 \u05D1\u05DE\u05E7\u05D5\u05E9\u05E8\u05EA",
    note: "\u05E8\u05E6\u05E3.",
    actions: [S("4XCGE", { note: "\u05DE\u05D5\u05DB\u05DF \u05DC\u05D4\u05DE\u05E8\u05D0\u05D4, \u05DE\u05E7\u05D5\u05E9\u05E8\u05EA A2", pos: "A2" })]
  },
  {
    id: "f-s4-lahak",
    stage: "s4",
    kind: "beat",
    label: "LAHAK3 \u2013 \u05E7\u05D5\u05E8\u05D0 \u05D1\u05E7\u05E9\u05E8",
    summary: "\u05D2\u05D5\u05D1\u05D4 1,000 \u05D1\u05D0\u05D9\u05DC\u05D5\u05EA, \u05DC\u05D7\u05E6\u05D9\u05D9\u05D4 \u05E6\u05E4\u05D5\u05E0\u05D4",
    note: "\u05E8\u05E6\u05E3.",
    actions: [S("LAHAK3", { note: "\u05E7\u05D5\u05E8\u05D0 \u05D1\u05E7\u05E9\u05E8, \u05D2\u05D5\u05D1\u05D4 1,000 \u05D1\u05D0\u05D9\u05DC\u05D5\u05EA, \u05DC\u05D7\u05E6\u05D9\u05D9\u05D4 \u05E6\u05E4\u05D5\u05E0\u05D4", pos: "1,000 FT", pending: false })]
  },
  {
    id: "f-s4-isr",
    stage: "s4",
    kind: "beat",
    label: "ISR045 \u2013 \u05D1\u05E7\u05E9\u05EA HOLD",
    summary: "HOLD AT ADIVI FOR SYSTEM CHECK",
    note: "\u05DC\u05D0\u05D7\u05E8 \u05D4\u05D0\u05D9\u05E8\u05D5\u05E2 \u05D4\u05D6\u05D4 \u2013 \u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \u05E0\u05D5\u05E1\u05E4\u05EA.",
    actions: [S("ISR045", { note: "\u05D1\u05BEADIVI \u05D5\u05DE\u05D1\u05E7\u05E9", request: "HOLD AT ADIVI FOR SYSTEM CHECK", pos: "ADIVI" })]
  },
  { id: "f-q4", stage: "s4", kind: "question", questionId: "q4", label: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \xB7 \u05E9\u05DC\u05D1 4", note: "\u05DC\u05DC\u05D0 \u05D7\u05E9\u05D9\u05E4\u05D4." },
  // ── שלב 5 · Bird Hazard ────────────────────────────────────────────────────
  {
    id: "f-s5-shets",
    stage: "s5",
    kind: "beat",
    label: "SHETS78 \u05E7\u05D5\u05E8\u05D0 \u05DC\u05E7\u05DC\u05D9\u05E8\u05E0\u05E1",
    summary: "\u05E2\u05D5\u05D3 \u05EA\u05E0\u05D5\u05E2\u05D4 \u05E0\u05DB\u05E0\u05E1\u05EA \u05DC\u05EA\u05DE\u05D5\u05E0\u05D4",
    note: "\u05E7\u05D5\u05D3\u05DD \u05D4\u05EA\u05E0\u05D5\u05E2\u05D4, \u05D5\u05E8\u05E7 \u05D0\u05D7\u05E8 \u05DB\u05DA \u05D4\u05E6\u05D9\u05E4\u05D5\u05E8\u05D9\u05DD.",
    actions: [ADD({ id: "SHETS78", callsign: "SHETS78", acType: "F16", kind: "dep", pos: "APRON", note: "\u05E7\u05D5\u05E8\u05D0 \u05DC\u05E7\u05D1\u05DC\u05EA \u05E7\u05DC\u05D9\u05E8\u05E0\u05E1" })]
  },
  {
    id: "f-s5-birds",
    stage: "s5",
    kind: "beat",
    label: "\u05DC\u05D4\u05E7\u05EA \u05E7\u05D5\u05E8\u05DE\u05D5\u05E8\u05E0\u05D9\u05DD",
    summary: "~100 \u05E7\u05D5\u05E8\u05DE\u05D5\u05E8\u05E0\u05D9\u05DD \xB7 500 \u05E8\u05D2\u05DC \xB7 \u05DE\u05E6\u05E4\u05D5\u05DF \u05DC\u05D3\u05E8\u05D5\u05DD \u05DE\u05E2\u05DC \u05D4\u05DE\u05E1\u05DC\u05D5\u05DC",
    note: "\u05D4\u05D0\u05E0\u05D9\u05DE\u05E6\u05D9\u05D4 \u05E0\u05DE\u05E9\u05DB\u05EA \u05DB\u05BE9 \u05E9\u05E0\u05D9\u05D5\u05EA. \u05EA\u05DF \u05DC\u05D4 \u05DC\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D0\u05EA\u05D4 \u05E4\u05D5\u05EA\u05D7 \u05D0\u05EA \u05DE\u05D3\u05D9\u05D3\u05EA \u05D4\u05E2\u05D5\u05DE\u05E1.",
    actions: [{ op: "overlay", overlay: { kind: "birds", title: "BIRD ACTIVITY", lines: ["~100 CORMORANTS", "500 FT", "N \u2192 S"] } }]
  },
  { id: "f-q5", stage: "s5", kind: "question", questionId: "q5", label: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \xB7 \u05E9\u05DC\u05D1 5", note: "\u05DC\u05DC\u05D0 \u05D7\u05E9\u05D9\u05E4\u05D4." },
  // ── שלב 6 · MAYDAY ─────────────────────────────────────────────────────────
  {
    id: "f-s6-mayday",
    stage: "s6",
    kind: "beat",
    label: "MAYDAY \xB7 ISR045",
    summary: "ENGINE EMERGENCY \xB7 IMMEDIATE LANDING",
    note: "\u05DC\u05D7\u05D9\u05E6\u05D4 \u05D0\u05D7\u05EA. \u05D9\u05E9 \u05D4\u05E9\u05D4\u05D9\u05D4 \u05DE\u05D5\u05D1\u05E0\u05D9\u05EA \u05E9\u05DC \u05DB\u05BE2.5 \u05E9\u05E0\u05D9\u05D5\u05EA \u05E9\u05DC \u05E9\u05E7\u05D8 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05D4\u05E1\u05D8\u05E8\u05D9\u05E4 \u05E0\u05E6\u05D1\u05E2. \u05D0\u05DC \u05EA\u05DC\u05D7\u05E5 \u05E9\u05D5\u05D1.",
    actions: [
      { op: "update", id: "ISR045", patch: { emergency: true, note: "ENGINE EMERGENCY", request: "IMMEDIATE LANDING" }, delay: 2500 },
      {
        op: "overlay",
        delay: 2500,
        overlay: { kind: "mayday", callsign: "ISR045", lines: ["ENGINE EMERGENCY", "IMMEDIATE LANDING"] }
      }
    ]
  },
  { id: "f-q6", stage: "s6", kind: "question", questionId: "q6", label: "\u05DE\u05D3\u05D9\u05D3\u05EA \u05E2\u05D5\u05DE\u05E1 \u05D0\u05D7\u05E8\u05D5\u05E0\u05D4", note: "\u05D6\u05D5 \u05D4\u05DE\u05D3\u05D9\u05D3\u05D4 \u05D4\u05D0\u05D7\u05E8\u05D5\u05E0\u05D4 \u05D1\u05EA\u05E8\u05D7\u05D9\u05E9. \u05DC\u05DC\u05D0 \u05D7\u05E9\u05D9\u05E4\u05D4." },
  // ── סיום · השאלה המרכזית וה־Reveal ─────────────────────────────────────────
  {
    id: "f-qtimeline",
    stage: null,
    kind: "question",
    questionId: "qTimeline",
    label: "\u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05E9\u05D9\u05E0\u05D5\u05D9",
    note: "\u05D4\u05EA\u05E8\u05D7\u05D9\u05E9 \u05E0\u05E2\u05E6\u05E8 \u05DB\u05D0\u05DF. \u05D7\u05DB\u05D4 \u05E9\u05DB\u05D5\u05DC\u05DD \u05D9\u05E2\u05E0\u05D5 \u2013 \u05D5\u05E8\u05E7 \u05D0\u05D6 \u05E1\u05D2\u05D5\u05E8 \u05D5\u05D7\u05E9\u05D5\u05E3. \u05D6\u05D4 \u05E8\u05D2\u05E2 \u05D4\u05E9\u05D9\u05D0 \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF."
  },
  {
    id: "f-traj-1",
    stage: null,
    kind: "reveal",
    reveal: "traj1",
    label: "\u05D2\u05E8\u05E3 \u05DE\u05E1\u05DC\u05D5\u05DC\u05D9 \u05D4\u05E2\u05D5\u05DE\u05E1 \xB7 \u05E7\u05D5\u05D5\u05D9\u05DD \u05D0\u05D9\u05E9\u05D9\u05D9\u05DD",
    note: "\u05EA\u05DF \u05DC\u05E7\u05D5\u05D5\u05D9\u05DD \u05DC\u05D4\u05D9\u05DB\u05E0\u05E1. \u05D0\u05DC \u05EA\u05D3\u05D1\u05E8 \u05DE\u05E2\u05DC\u05D9\u05D4\u05DD \u05D1\u05E9\u05EA\u05D9 \u05D4\u05E9\u05E0\u05D9\u05D5\u05EA \u05D4\u05E8\u05D0\u05E9\u05D5\u05E0\u05D5\u05EA."
  },
  { id: "f-traj-2", stage: null, kind: "reveal", reveal: "traj2", label: "\u05D2\u05E8\u05E3 \xB7 \u05D4\u05D5\u05E1\u05E4\u05EA \u05DE\u05DE\u05D5\u05E6\u05E2 \u05D4\u05E7\u05D1\u05D5\u05E6\u05D4", note: "\u05E2\u05DB\u05E9\u05D9\u05D5 \u05D4\u05DE\u05DE\u05D5\u05E6\u05E2 \u05E0\u05DB\u05E0\u05E1 \u05DE\u05E2\u05DC \u05D4\u05E7\u05D5\u05D5\u05D9\u05DD." },
  { id: "f-traj-3", stage: null, kind: "reveal", reveal: "traj3", label: "\u05D2\u05E8\u05E3 \xB7 \u05D4\u05DE\u05E1\u05E8", note: '"\u05D4\u05E2\u05D5\u05DE\u05E1 \u05DC\u05D0 \u05E2\u05DC\u05D4 \u05D0\u05E6\u05DC \u05DB\u05D5\u05DC\u05E0\u05D5 \u05D1\u05D0\u05D5\u05EA\u05D5 \u05E7\u05E6\u05D1."' },
  { id: "f-traj-4", stage: null, kind: "reveal", reveal: "traj4", label: "\u05D2\u05E8\u05E3 \xB7 \u05D4\u05DE\u05DE\u05D5\u05E6\u05E2 \u05DE\u05EA\u05E2\u05DE\u05E2\u05DD", note: '"\u05D4\u05DE\u05DE\u05D5\u05E6\u05E2 \u05DC\u05D0 \u05DE\u05E1\u05E4\u05E8 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E1\u05D9\u05E4\u05D5\u05E8." \u05D4\u05E7\u05D5\u05D5\u05D9\u05DD \u05D4\u05D0\u05D9\u05E9\u05D9\u05D9\u05DD \u05D7\u05D5\u05D6\u05E8\u05D9\u05DD \u05DC\u05D7\u05D6\u05D9\u05EA.' },
  {
    id: "f-qopen",
    stage: null,
    kind: "question",
    questionId: "qOpen",
    label: "\u05E9\u05D0\u05DC\u05D4 \u05E4\u05EA\u05D5\u05D7\u05D4",
    note: "\u05EA\u05DF \u05D6\u05DE\u05DF \u05DC\u05DB\u05EA\u05D5\u05D1. \u05D7\u05E9\u05D5\u05E3 \u05E8\u05E7 \u05DB\u05E9\u05E8\u05D5\u05D1 \u05D4\u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05D1\u05E4\u05E0\u05D9\u05DD \u2013 \u05E7\u05D9\u05E8 \u05D4\u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05D4\u05D5\u05D0 \u05D4\u05E1\u05D9\u05D5\u05DD."
  },
  { id: "f-closing", stage: null, kind: "closing", reveal: "closing", label: "\u05DE\u05E1\u05DA \u05E1\u05D9\u05D5\u05DD", note: "\u05D0\u05D5\u05EA\u05D4 \u05EA\u05DE\u05D5\u05E0\u05D4. \u05D0\u05E0\u05E9\u05D9\u05DD \u05E9\u05D5\u05E0\u05D9\u05DD. 100 \u05E9\u05D5\u05E0\u05D4. \u05DE\u05DB\u05D0\u05DF \u05E2\u05D5\u05D1\u05E8\u05D9\u05DD \u05DC\u05D4\u05E8\u05E6\u05D0\u05D4." }
];
var FLOW_BY_ID = Object.fromEntries(FLOW.map((f) => [f.id, f]));
function stageNumberOf(item) {
  if (!item || !item.stage) return null;
  const s = STAGES.find((x) => x.id === item.stage);
  return s ? s.n : null;
}
__name(stageNumberOf, "stageNumberOf");

// shared/engine.js
function randomId(alphabet, length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
__name(randomId, "randomId");
var nid = /* @__PURE__ */ __name(() => randomId("abcdefghijkmnpqrstuvwxyz23456789", 16), "nid");
var codeGen = /* @__PURE__ */ __name(() => randomId("ACDEFGHJKLMNPQRTUVWXY3479", 4), "codeGen");
var OVERLAY_TTL = { phone: 12e3, birds: 13e3 };
var MAYDAY_IMPACT_MS = 6e3;
function createSession(mode = "live") {
  return {
    id: `${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}-${nid().slice(0, 6)}`,
    label: SESSION_LABEL,
    mode,
    // 'live' | 'rehearsal'
    code: codeGen(),
    status: "lobby",
    // 'lobby' | 'running' | 'ended'
    cursor: -1,
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    participants: {},
    // pid -> { pid, joinedAt, connected, bot }
    board: { strips: [], overlays: [] },
    activeQuestion: null,
    questions: Object.fromEntries(
      QUESTIONS.map((q) => [q.id, { id: q.id, status: "idle", openedAt: null, closedAt: null, answers: {} }])
    ),
    reveal: null,
    // 'traj1'..'traj4' | 'closing'
    seq: 0
    // מונה שינויים – מזין highlight בצד הלקוח
  };
}
__name(createSession, "createSession");
function applyAction(s, action) {
  s.seq += 1;
  if (action.op === "add") {
    const exists = s.board.strips.find((x) => x.id === action.strip.id);
    if (exists) return;
    s.board.strips.push({ ...action.strip, rev: 0, enteredSeq: s.seq, updatedSeq: s.seq });
  } else if (action.op === "update") {
    const strip = s.board.strips.find((x) => x.id === action.id);
    if (!strip) return;
    Object.assign(strip, action.patch);
    strip.rev = (strip.rev || 0) + 1;
    strip.updatedSeq = s.seq;
  } else if (action.op === "remove") {
    s.board.strips = s.board.strips.filter((x) => x.id !== action.id);
  } else if (action.op === "overlay") {
    const o = { ...action.overlay, id: `${action.overlay.kind}`, seq: s.seq, phase: action.overlay.kind === "mayday" ? "impact" : void 0 };
    s.board.overlays = s.board.overlays.filter((x) => x.id !== o.id);
    if (o.kind !== "phone") s.board.overlays = s.board.overlays.filter((x) => x.kind !== "phone");
    s.board.overlays.push(o);
  }
}
__name(applyAction, "applyAction");
function rebuildBoard(s, uptoCursor) {
  s.board = { strips: [], overlays: [] };
  s.seq = 0;
  for (let i = 0; i <= uptoCursor; i += 1) {
    const item = FLOW[i];
    if (item?.kind === "beat") for (const a of item.actions || []) applyAction(s, a);
  }
  s.board.overlays = s.board.overlays.filter((o) => o.kind === "mayday");
  for (const o of s.board.overlays) if (o.kind === "mayday") o.phase = "banner";
}
__name(rebuildBoard, "rebuildBoard");
var Engine = class {
  static {
    __name(this, "Engine");
  }
  constructor(onChange) {
    this.onChange = onChange;
    this.sessions = { live: createSession("live"), rehearsal: createSession("rehearsal") };
    this.active = "live";
    this.timers = { live: /* @__PURE__ */ new Set(), rehearsal: /* @__PURE__ */ new Set() };
  }
  get s() {
    return this.sessions[this.active];
  }
  changed() {
    this.onChange();
  }
  later(mode, ms, fn) {
    const t = setTimeout(() => {
      this.timers[mode].delete(t);
      try {
        fn();
      } catch (e) {
        console.error("timer", e);
      }
      this.changed();
    }, ms);
    this.timers[mode].add(t);
    return t;
  }
  clearTimers(mode) {
    for (const t of this.timers[mode]) clearTimeout(t);
    this.timers[mode].clear();
  }
  setMode(mode) {
    if (mode !== "live" && mode !== "rehearsal") return;
    this.active = mode;
    this.changed();
  }
  // ── משתתפים ────────────────────────────────────────────────────────────────
  /** מחזיר { ok, pid, reason }. reconnect של משתתף קיים מותר גם לאחר נעילה. */
  join({ code, token, sessionId }) {
    const s = this.s;
    const known = token && sessionId === s.id && s.participants[token];
    if (known) {
      known.connected = true;
      known.lastSeen = Date.now();
      this.changed();
      return { ok: true, pid: token, sessionId: s.id, reconnected: true };
    }
    if (String(code || "").trim().toUpperCase() !== s.code) {
      return { ok: false, reason: "bad-code" };
    }
    if (s.status !== "lobby") return { ok: false, reason: "locked" };
    const pid = nid();
    s.participants[pid] = { pid, joinedAt: Date.now(), lastSeen: Date.now(), connected: true, bot: false };
    this.changed();
    return { ok: true, pid, sessionId: s.id, reconnected: false };
  }
  setConnected(pid, connected) {
    const s = this.s;
    for (const sess of Object.values(this.sessions)) {
      if (sess.participants[pid]) {
        sess.participants[pid].connected = connected;
        sess.participants[pid].lastSeen = Date.now();
      }
    }
    void s;
    this.changed();
  }
  // ── שליטת מנחה ─────────────────────────────────────────────────────────────
  start() {
    const s = this.s;
    if (s.status !== "lobby") return;
    s.status = "running";
    s.startedAt = Date.now();
    if (s.mode === "rehearsal") this.spawnBots();
    this.advance();
  }
  regenerateCode() {
    const s = this.s;
    if (s.status !== "lobby") return;
    s.code = codeGen();
    this.changed();
  }
  /** האם הכפתור הראשי פעיל כרגע (אין שאלה פתוחה/סגורה שמחכה להחלטה). */
  canAdvance() {
    const s = this.s;
    if (s.status !== "running") return false;
    if (s.activeQuestion) {
      const q = s.questions[s.activeQuestion];
      return q.status !== "open";
    }
    return s.cursor < FLOW.length - 1;
  }
  advance() {
    const s = this.s;
    if (s.status !== "running") return;
    if (s.activeQuestion) {
      const q = s.questions[s.activeQuestion];
      if (q.status === "open") return;
      s.activeQuestion = null;
    }
    if (s.cursor >= FLOW.length - 1) return;
    s.cursor += 1;
    const item = FLOW[s.cursor];
    if (item.kind === "beat") {
      for (const a of item.actions || []) {
        if (a.delay) this.later(s.mode, a.delay, () => applyAction(s, a));
        else applyAction(s, a);
      }
      for (const a of item.actions || []) {
        if (a.op !== "overlay") continue;
        const kind = a.overlay.kind;
        const base = a.delay || 0;
        if (OVERLAY_TTL[kind]) {
          this.later(s.mode, base + OVERLAY_TTL[kind], () => {
            s.board.overlays = s.board.overlays.filter((o) => o.kind !== kind);
          });
        }
        if (kind === "mayday") {
          this.later(s.mode, base + MAYDAY_IMPACT_MS, () => {
            const o = s.board.overlays.find((x) => x.kind === "mayday");
            if (o) o.phase = "banner";
          });
        }
      }
    } else if (item.kind === "question") {
      s.activeQuestion = item.questionId;
      const q = s.questions[item.questionId];
      q.status = "open";
      q.openedAt = Date.now();
      if (s.mode === "rehearsal") this.scheduleBotAnswers(item.questionId);
    } else if (item.kind === "reveal" || item.kind === "closing") {
      s.reveal = item.reveal;
      if (item.kind === "closing") s.status = "ended";
      if (item.kind === "closing") s.endedAt = Date.now();
    }
    this.changed();
  }
  closeQuestion() {
    const s = this.s;
    const qid = s.activeQuestion;
    if (!qid) return;
    const q = s.questions[qid];
    if (q.status !== "open") return;
    q.status = "closed";
    q.closedAt = Date.now();
    this.changed();
  }
  revealQuestion() {
    const s = this.s;
    const qid = s.activeQuestion;
    if (!qid) return;
    const q = s.questions[qid];
    if (q.status === "open") return;
    q.status = "revealed";
    this.changed();
  }
  hideQuestionReveal() {
    const s = this.s;
    const qid = s.activeQuestion;
    if (!qid) return;
    s.questions[qid].status = "closed";
    this.changed();
  }
  submit({ pid, qid, value }) {
    const s = this.s;
    if (!s.participants[pid]) return { ok: false, reason: "unknown" };
    const q = s.questions[qid];
    if (!q) return { ok: false, reason: "unknown-question" };
    if (q.status !== "open") return { ok: false, reason: "closed" };
    if (q.answers[pid] !== void 0) return { ok: false, reason: "already" };
    const def = QUESTION_BY_ID[qid];
    let v = value;
    if (def.kind === "scale10") {
      v = Number(value);
      if (!Number.isInteger(v) || v < 1 || v > 10) return { ok: false, reason: "invalid" };
    } else if (def.kind === "timeline") {
      if (!STAGES.some((st) => st.id === value)) return { ok: false, reason: "invalid" };
    } else if (def.kind === "text") {
      v = String(value || "").trim().slice(0, 240);
      if (!v) return { ok: false, reason: "invalid" };
    }
    q.answers[pid] = v;
    this.changed();
    return { ok: true };
  }
  // ── פעולות מסוכנות (תפריט משני + אישור) ────────────────────────────────────
  back() {
    const s = this.s;
    if (s.cursor < 0) return;
    this.clearTimers(s.mode);
    s.cursor -= 1;
    s.activeQuestion = null;
    rebuildBoard(s, s.cursor);
    for (let i = s.cursor + 1; i < FLOW.length; i += 1) {
      const it = FLOW[i];
      if (it.kind === "question") s.questions[it.questionId].status = "idle";
    }
    const lastReveal = FLOW.slice(0, s.cursor + 1).filter((f) => f.reveal).pop();
    s.reveal = lastReveal ? lastReveal.reveal : null;
    if (s.status === "ended") s.status = "running";
    this.changed();
  }
  resetSession({ keepParticipants = false } = {}) {
    const mode = this.active;
    this.clearTimers(mode);
    const old = this.sessions[mode];
    const next = createSession(mode);
    if (keepParticipants) {
      next.participants = old.participants;
      next.id = old.id;
      next.code = old.code;
    }
    this.sessions[mode] = next;
    this.changed();
  }
  endSession() {
    const s = this.s;
    this.clearTimers(s.mode);
    s.status = "ended";
    s.endedAt = Date.now();
    s.activeQuestion = null;
    this.changed();
    return this.exportRecord();
  }
  /** מצב מלא לשחזור אחרי הפעלה מחדש של ה־Durable Object. */
  serialize() {
    return { sessions: this.sessions, active: this.active };
  }
  restore(snapshot) {
    if (!snapshot?.sessions?.live || !snapshot?.sessions?.rehearsal) return false;
    this.sessions = snapshot.sessions;
    this.active = snapshot.active === "rehearsal" ? "rehearsal" : "live";
    for (const sess of Object.values(this.sessions)) {
      sess.board.overlays = (sess.board.overlays || []).filter((o) => o.kind === "mayday");
      for (const o of sess.board.overlays) o.phase = "banner";
      for (const p of Object.values(sess.participants)) p.connected = false;
    }
    return true;
  }
  // ── חזרה: משתתפי דמה ───────────────────────────────────────────────────────
  spawnBots(n = 20) {
    const s = this.s;
    if (s.mode !== "rehearsal") return;
    for (let i = 0; i < n; i += 1) {
      const pid = `bot-${nid().slice(0, 8)}`;
      s.participants[pid] = {
        pid,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        connected: true,
        bot: true,
        // פרופיל אישי: היכן העומס מתחיל לעלות ובאיזו עוצמה – יוצר מסלולים שונים.
        profile: {
          base: 1 + Math.random() * 2,
          knee: 1.5 + Math.random() * 3.5,
          // השלב שבו מתחילה העלייה
          slope: 0.9 + Math.random() * 1.6
        }
      };
    }
    this.changed();
  }
  scheduleBotAnswers(qid) {
    const s = this.s;
    const def = QUESTION_BY_ID[qid];
    const stageIdx = def.stage ? STAGES.findIndex((x) => x.id === def.stage) + 1 : 6;
    for (const p of Object.values(s.participants)) {
      if (!p.bot) continue;
      const delay = 1500 + Math.random() * 9e3;
      this.later("rehearsal", delay, () => {
        const q = s.questions[qid];
        if (!q || q.status !== "open" || q.answers[p.pid] !== void 0) return;
        q.answers[p.pid] = this.botAnswer(def, p, stageIdx);
      });
    }
  }
  botAnswer(def, p, stageIdx) {
    const pr = p.profile;
    if (def.kind === "scale10") {
      if (def.track === "shift") {
        return clamp(Math.round(4 + Math.random() * 6), 1, 10);
      }
      const jitter = (Math.random() - 0.5) * 1.4;
      const raw = pr.base + Math.max(0, stageIdx - pr.knee) * pr.slope + jitter;
      return clamp(Math.round(raw), 1, 10);
    }
    if (def.kind === "timeline") {
      const idx = clamp(Math.round(pr.knee + (Math.random() - 0.4) * 2), 1, 6);
      return STAGES[idx - 1].id;
    }
    return REHEARSAL_TEXTS[Math.floor(Math.random() * REHEARSAL_TEXTS.length)];
  }
  // ── ייצוא ──────────────────────────────────────────────────────────────────
  exportRecord() {
    const s = this.s;
    const pids = Object.keys(s.participants);
    const anon = Object.fromEntries(pids.map((pid, i) => [pid, `P${String(i + 1).padStart(2, "0")}`]));
    const questions = QUESTIONS.map((def) => {
      const q = s.questions[def.id];
      const values = Object.values(q.answers);
      const out = {
        id: def.id,
        kind: def.kind,
        track: def.track,
        text: def.text,
        stage: def.stage,
        responded: values.length
      };
      if (def.kind === "scale10") {
        out.distribution = Array.from({ length: 10 }, (_, i) => values.filter((v) => v === i + 1).length);
        out.average = values.length ? +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : null;
        out.answers = Object.fromEntries(Object.entries(q.answers).map(([pid, v]) => [anon[pid], v]));
      } else if (def.kind === "timeline") {
        out.distribution = STAGES.map((st) => values.filter((v) => v === st.id).length);
        out.answers = Object.fromEntries(Object.entries(q.answers).map(([pid, v]) => [anon[pid], v]));
      } else {
        out.answers = values;
      }
      return out;
    });
    const trajectories = pids.map((pid) => ({
      anon: anon[pid],
      values: LOAD_TRACK.map((qid) => s.questions[qid].answers[pid] ?? null)
    }));
    return {
      id: s.id,
      label: s.label,
      mode: s.mode,
      startedAt: s.startedAt,
      endedAt: s.endedAt || Date.now(),
      participantCount: pids.length,
      loadTrack: LOAD_TRACK,
      stages: STAGES,
      questions,
      trajectories
    };
  }
  // ── תצוגות (מה כל תפקיד רואה) ──────────────────────────────────────────────
  publicQuestion(qid, pid) {
    const s = this.s;
    if (!qid) return null;
    const def = QUESTION_BY_ID[qid];
    const q = s.questions[qid];
    return {
      id: def.id,
      kind: def.kind,
      text: def.text,
      hint: def.hint,
      low: def.low,
      high: def.high,
      liveTitle: def.liveTitle,
      status: q.status,
      myAnswer: pid ? q.answers[pid] ?? null : null
    };
  }
  counts(qid) {
    const s = this.s;
    const total = Object.keys(s.participants).length;
    const answered = qid ? Object.keys(s.questions[qid].answers).length : 0;
    return { answered, total };
  }
  stats(qid) {
    const s = this.s;
    if (!qid) return null;
    const def = QUESTION_BY_ID[qid];
    const values = Object.values(s.questions[qid].answers);
    if (def.kind === "scale10") {
      const dist = Array.from({ length: 10 }, (_, i) => values.filter((v) => v === i + 1).length);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      return { kind: "scale10", dist, avg: avg === null ? null : +avg.toFixed(1) };
    }
    if (def.kind === "timeline") {
      return { kind: "timeline", dist: STAGES.map((st) => values.filter((v) => v === st.id).length) };
    }
    return { kind: "text", texts: values };
  }
  trajectories() {
    const s = this.s;
    return Object.keys(s.participants).map((pid, i) => ({
      key: `p${i}`,
      values: LOAD_TRACK.map((qid) => s.questions[qid].answers[pid] ?? null)
    }));
  }
  viewFor(role, pid) {
    const s = this.s;
    const item = s.cursor >= 0 ? FLOW[s.cursor] : null;
    const nextItem = s.cursor + 1 < FLOW.length ? FLOW[s.cursor + 1] : null;
    const base = {
      sessionId: s.id,
      mode: s.mode,
      status: s.status,
      code: s.code,
      board: s.board,
      reveal: s.reveal,
      stageNumber: stageNumberOf(item),
      stageCount: STAGES.length,
      started: s.status !== "lobby"
    };
    if (role === "participant") {
      const q = this.publicQuestion(s.activeQuestion, pid);
      return {
        ...base,
        code: void 0,
        question: q && q.status !== "idle" ? q : null,
        joined: !!s.participants[pid]
      };
    }
    if (role === "live") {
      const q = s.activeQuestion ? this.publicQuestion(s.activeQuestion) : null;
      const revealed = q && q.status === "revealed";
      return {
        ...base,
        code: s.status === "lobby" ? s.code : void 0,
        connected: Object.values(s.participants).filter((p) => p.connected).length,
        question: q && q.status !== "idle" ? { ...q, myAnswer: void 0 } : null,
        counts: s.activeQuestion ? this.counts(s.activeQuestion) : null,
        results: revealed ? this.stats(s.activeQuestion) : null,
        trajectories: s.reveal && s.reveal.startsWith("traj") ? this.trajectories() : null,
        stages: STAGES
      };
    }
    return {
      ...base,
      connected: Object.values(s.participants).filter((p) => p.connected).length,
      participants: Object.keys(s.participants).length,
      cursor: s.cursor,
      flowLength: FLOW.length,
      current: item ? pick(item) : null,
      next: nextItem ? pick(nextItem) : null,
      canAdvance: this.canAdvance(),
      question: s.activeQuestion ? { ...this.publicQuestion(s.activeQuestion), adminTitle: QUESTION_BY_ID[s.activeQuestion].adminTitle } : null,
      counts: s.activeQuestion ? this.counts(s.activeQuestion) : null,
      stats: s.activeQuestion ? this.stats(s.activeQuestion) : null,
      stages: STAGES
    };
  }
};
function pick(item) {
  return {
    id: item.id,
    kind: item.kind,
    label: item.label,
    summary: item.summary,
    note: item.note,
    stage: item.stage,
    stageNumber: stageNumberOf(item),
    questionId: item.questionId,
    reveal: item.reveal
  };
}
__name(pick, "pick");
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
__name(clamp, "clamp");
var REHEARSAL_TEXTS = [
  "\u05DB\u05E9\u05D0\u05E0\u05D9 \u05DE\u05EA\u05D7\u05D9\u05DC \u05DC\u05EA\u05E2\u05D3\u05E3 \u05DE\u05D9 \u05DE\u05D3\u05D1\u05E8 \u05E8\u05D0\u05E9\u05D5\u05DF \u05D1\u05DE\u05E7\u05D5\u05DD \u05DC\u05E2\u05E0\u05D5\u05EA \u05DC\u05DB\u05D5\u05DC\u05DD",
  "\u05DB\u05E9\u05D0\u05E0\u05D9 \u05DE\u05E4\u05E1\u05D9\u05E7 \u05DC\u05D4\u05E1\u05EA\u05DB\u05DC \u05E2\u05DC \u05D4\u05EA\u05DE\u05D5\u05E0\u05D4 \u05D4\u05D2\u05D3\u05D5\u05DC\u05D4 \u05D5\u05E8\u05E7 \u05E1\u05D5\u05D2\u05E8 \u05D0\u05EA \u05DE\u05D4 \u05E9\u05DE\u05D5\u05DC\u05D9",
  "\u05DB\u05E9\u05D0\u05E0\u05D9 \u05DE\u05E8\u05D2\u05D9\u05E9 \u05E9\u05D0\u05E0\u05D9 \u05DE\u05D2\u05D9\u05D1 \u05D1\u05DE\u05E7\u05D5\u05DD \u05DC\u05D4\u05D5\u05D1\u05D9\u05DC",
  "\u05DB\u05E9\u05D0\u05E0\u05D9 \u05E6\u05E8\u05D9\u05DA \u05DC\u05D7\u05D6\u05D5\u05E8 \u05E2\u05DC \u05D4\u05E7\u05E8\u05D0\u05D4 \u05DB\u05D9 \u05DC\u05D0 \u05D6\u05DB\u05E8\u05EA\u05D9 \u05DE\u05D4 \u05D0\u05DE\u05E8\u05EA\u05D9",
  "\u05DB\u05E9\u05D4\u05D9\u05D3\u05D9\u05D9\u05DD \u05DE\u05E1\u05DE\u05E0\u05D5\u05EA \u05E1\u05D8\u05E8\u05D9\u05E4\u05D9\u05DD \u05DE\u05D4\u05E8 \u05D9\u05D5\u05EA\u05E8 \u05DE\u05D4\u05E8\u05D0\u05E9",
  "\u05DB\u05E9\u05D0\u05E0\u05D9 \u05D3\u05D5\u05D7\u05D4 \u05E9\u05D9\u05D7\u05EA \u05D8\u05DC\u05E4\u05D5\u05DF \u05DB\u05D9 \u05D0\u05D9\u05DF \u05DC\u05D9 \u05E8\u05D2\u05E2 \u05E4\u05E0\u05D5\u05D9",
  "\u05DB\u05E9\u05D0\u05E0\u05D9 \u05DE\u05E4\u05E1\u05D9\u05E7 \u05DC\u05EA\u05DB\u05E0\u05DF \u05E7\u05D3\u05D9\u05DE\u05D4 \u05E9\u05EA\u05D9 \u05EA\u05E0\u05D5\u05E2\u05D5\u05EA",
  "\u05DB\u05E9\u05D0\u05E0\u05D9 \u05DE\u05D2\u05DC\u05D4 \u05E9\u05D0\u05E0\u05D9 \u05DC\u05D0 \u05D6\u05D5\u05DB\u05E8 \u05D0\u05D9\u05E4\u05D4 \u05E0\u05DE\u05E6\u05D0\u05EA \u05EA\u05E0\u05D5\u05E2\u05D4 \u05E9\u05DB\u05D1\u05E8 \u05D8\u05D9\u05E4\u05DC\u05EA\u05D9 \u05D1\u05D4",
  "\u05DB\u05E9\u05D0\u05E0\u05D9 \u05DE\u05D3\u05D1\u05E8 \u05DE\u05D4\u05E8 \u05D9\u05D5\u05EA\u05E8 \u05D1\u05E7\u05E9\u05E8",
  "\u05DB\u05E9\u05DB\u05DC \u05DE\u05D4 \u05E9\u05E0\u05DB\u05E0\u05E1 \u05DE\u05E8\u05D2\u05D9\u05E9 \u05D3\u05D7\u05D5\u05E3 \u05D1\u05D0\u05D5\u05EA\u05D4 \u05DE\u05D9\u05D3\u05D4",
  "\u05DB\u05E9\u05D0\u05E0\u05D9 \u05DE\u05EA\u05D7\u05D9\u05DC \u05DC\u05DB\u05EA\u05D5\u05D1 \u05DC\u05E2\u05E6\u05DE\u05D9 \u05D3\u05D1\u05E8\u05D9\u05DD \u05E9\u05D1\u05D3\u05E8\u05DA \u05DB\u05DC\u05DC \u05D0\u05E0\u05D9 \u05D6\u05D5\u05DB\u05E8",
  "\u05DB\u05E9\u05D0\u05E0\u05D9 \u05DE\u05E8\u05D2\u05D9\u05E9 \u05E9\u05D0\u05E0\u05D9 \u05DC\u05D0 \u05E8\u05D5\u05E6\u05D4 \u05E9\u05D0\u05E3 \u05D0\u05D7\u05D3 \u05D9\u05E7\u05E8\u05D0 \u05DC\u05D9 \u05E2\u05DB\u05E9\u05D9\u05D5"
];

// worker/room.js
var SNAPSHOT_KEY = "engine:snapshot";
var SessionRoom = class extends DurableObject {
  static {
    __name(this, "SessionRoom");
  }
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.sockets = /* @__PURE__ */ new Set();
    this.pending = false;
    this.engine = new Engine(() => this.broadcast());
    ctx.blockConcurrencyWhile(async () => {
      const snapshot = await ctx.storage.get(SNAPSHOT_KEY);
      if (snapshot) this.engine.restore(snapshot);
    });
  }
  get adminKey() {
    return this.env.ADMIN_KEY || "ramon2026";
  }
  // ─── שידור ─────────────────────────────────────────────────────────────────
  broadcast() {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => {
      this.pending = false;
      let live = null;
      let admin = null;
      for (const c of this.sockets) {
        try {
          if (c.role === "live") {
            live = live || JSON.stringify({ t: "state", state: this.engine.viewFor("live") });
            c.ws.send(live);
          } else if (c.role === "admin") {
            admin = admin || JSON.stringify({ t: "state", state: this.engine.viewFor("admin") });
            c.ws.send(admin);
          } else if (c.role === "participant") {
            c.ws.send(JSON.stringify({ t: "state", state: this.engine.viewFor("participant", c.pid) }));
          }
        } catch {
          this.sockets.delete(c);
        }
      }
      this.persist();
    });
  }
  persist() {
    if (this.saveQueued) return;
    this.saveQueued = true;
    this.ctx.waitUntil((async () => {
      await new Promise((r) => setTimeout(r, 400));
      this.saveQueued = false;
      try {
        await this.ctx.storage.put(SNAPSHOT_KEY, this.engine.serialize());
      } catch (e) {
        console.error("persist", e);
      }
    })());
  }
  sendTo(conn, payload) {
    try {
      conn.ws.send(JSON.stringify(payload));
    } catch {
      this.sockets.delete(conn);
    }
  }
  pushState(conn) {
    if (conn.role === "participant") {
      this.sendTo(conn, { t: "state", state: this.engine.viewFor("participant", conn.pid) });
    } else if (conn.role) {
      this.sendTo(conn, { t: "state", state: this.engine.viewFor(conn.role) });
    }
  }
  // ─── WebSocket ─────────────────────────────────────────────────────────────
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("expected websocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      const conn = { ws: server, role: null, pid: null };
      this.sockets.add(conn);
      server.addEventListener("message", (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        try {
          this.handle(conn, msg);
        } catch (e) {
          console.error("handle", e);
        }
      });
      const drop = /* @__PURE__ */ __name(() => {
        this.sockets.delete(conn);
        if (conn.role === "participant" && conn.pid) this.engine.setConnected(conn.pid, false);
      }, "drop");
      server.addEventListener("close", drop);
      server.addEventListener("error", drop);
      return new Response(null, { status: 101, webSocket: client });
    }
    return this.api(request, url);
  }
  handle(conn, msg) {
    const ack = /* @__PURE__ */ __name((payload) => {
      if (msg.rid) this.sendTo(conn, { t: "ack", rid: msg.rid, ...payload });
    }, "ack");
    switch (msg.t) {
      case "hello": {
        if (msg.role === "live") {
          conn.role = "live";
        } else if (msg.role === "participant") {
          conn.role = "participant";
          const s = this.engine.s;
          if (msg.token && msg.sessionId === s.id && s.participants[msg.token]) {
            conn.pid = msg.token;
            this.engine.setConnected(msg.token, true);
          }
        }
        this.pushState(conn);
        return ack({ ok: true });
      }
      case "join": {
        const result = this.engine.join(msg);
        if (result.ok) {
          conn.role = "participant";
          conn.pid = result.pid;
          this.pushState(conn);
        }
        return ack(result);
      }
      case "submit": {
        if (!conn.pid) return ack({ ok: false, reason: "unknown" });
        const result = this.engine.submit({ pid: conn.pid, qid: msg.qid, value: msg.value });
        this.pushState(conn);
        return ack(result);
      }
      case "adminAuth": {
        if (msg.key !== this.adminKey) return ack({ ok: false });
        conn.role = "admin";
        this.pushState(conn);
        return ack({ ok: true });
      }
      case "adminCmd": {
        if (conn.role !== "admin") return ack({ ok: false, reason: "unauthorized" });
        const extra = this.command(msg.type, msg.payload) || {};
        this.broadcast();
        return ack({ ok: true, ...extra });
      }
      case "ping":
        return ack({ ok: true });
      default:
        return ack({ ok: false, reason: "unknown-message" });
    }
  }
  command(type, payload) {
    const e = this.engine;
    switch (type) {
      case "start":
        return e.start();
      case "advance":
        return e.advance();
      case "closeQuestion":
        return e.closeQuestion();
      case "revealQuestion":
        return e.revealQuestion();
      case "hideReveal":
        return e.hideQuestionReveal();
      case "back":
        return e.back();
      case "regenerateCode":
        return e.regenerateCode();
      case "setMode":
        return e.setMode(payload?.mode);
      case "resetSession":
        return e.resetSession();
      case "endSession": {
        const record = e.endSession();
        if (record.mode !== "rehearsal") {
          this.ctx.waitUntil(this.ctx.storage.put(`session:${record.id}`, record));
          return { saved: true };
        }
        return { saved: false };
      }
      default:
        return void 0;
    }
  }
  // ─── API לדוחות ────────────────────────────────────────────────────────────
  async api(request, url) {
    const key = request.headers.get("x-admin-key") || url.searchParams.get("key");
    const json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } }), "json");
    if (url.pathname === "/api/health") return json({ ok: true, mode: this.engine.active });
    if (key !== this.adminKey) return json({ error: "unauthorized" }, 401);
    if (url.pathname === "/api/report/current") return json(this.engine.exportRecord());
    if (url.pathname === "/api/sessions") {
      const map = await this.ctx.storage.list({ prefix: "session:" });
      const out = [...map.values()].map((r) => ({ id: r.id, label: r.label, startedAt: r.startedAt, endedAt: r.endedAt, participants: r.participantCount })).sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
      return json(out);
    }
    const match = url.pathname.match(/^\/api\/sessions\/(.+)$/);
    if (match) {
      const rec = await this.ctx.storage.get(`session:${decodeURIComponent(match[1])}`);
      return rec ? json(rec) : json({ error: "not-found" }, 404);
    }
    return json({ error: "not-found" }, 404);
  }
};

// worker/index.js
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws" || url.pathname.startsWith("/api/")) {
      const id = env.SESSION_ROOM.idFromName("main");
      return env.SESSION_ROOM.get(id).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-56aRLH/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-56aRLH/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  SessionRoom,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
