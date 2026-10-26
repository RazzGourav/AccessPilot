import { useEffect, useState } from "react";
import { Icon } from "../icons";
import { Page } from "../router";
import { useSession } from "../session";
import type { ScreenReaderFrame } from "../types";
import { NoScan, PageHero, StatusArea } from "./shared";

export function ExperiencePage() {
  const { scan, experience, fetchExperience, busy } = useSession();
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);
  const [readerMode, setReaderMode] = useState<"nvda" | "talkback" | "jaws">("nvda");
  const [speechLang, setSpeechLang] = useState<"en" | "hi">("en");
  const [personaFilter, setPersonaFilter] = useState<"all" | "blindness" | "motor" | "cognitive">("all");
  const [speechActive, setSpeechActive] = useState(false);

  useEffect(() => {
    if (scan && !experience) {
      fetchExperience();
    }
  }, [scan, experience]);

  function toHindiSpeech(enText: string): string {
    let s = enText;
    s = s.replace(/Unlabeled button/gi, "बिना लेबल बटन, अनाम");
    s = s.replace(/Button, unnamed/gi, "बटन, अनाम");
    s = s.replace(/Unlabeled input/gi, "बिना नाम इनपुट फ़ील्ड");
    s = s.replace(/Edit text, blank/gi, "संपादित करें, खाली इनपुट");
    s = s.replace(/Button,\s*/gi, "बटन, ");
    s = s.replace(/Link,\s*/gi, "लिंक, ");
    s = s.replace(/Edit text,\s*/gi, "इनपुट फ़ील्ड, ");
    s = s.replace(/Combo box,\s*/gi, "ड्रॉपडाउन सूची, ");
    s = s.replace(/Warning: Ambiguous destination/gi, "सावधानी: अस्पष्ट लिंक गंतव्य");
    s = s.replace(/Warning:\s*/gi, "चेतावनी: ");
    return s;
  }

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const textToSpeak = speechLang === "hi" ? toHindiSpeech(text) : text.replace(/Warning:/g, "Alert:");
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    if (speechLang === "hi") {
      utterance.lang = "hi-IN";
      const hindiVoice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("hi") || v.lang.includes("IN"));
      if (hindiVoice) utterance.voice = hindiVoice;
    } else {
      utterance.lang = "en-US";
    }
    utterance.rate = 1.0;
    utterance.pitch = readerMode === "talkback" ? 1.1 : 0.95;
    window.speechSynthesis.speak(utterance);
    setSpeechActive(true);
    utterance.onend = () => setSpeechActive(false);
  }

  function handleFrameClick(frame: ScreenReaderFrame) {
    setSelectedFrame(frame.order);
    speakText(frame.speechText);
  }

  return (
    <Page title="Lived Experience Simulation">
      <PageHero
        title="Lived Experience Simulation"
        lede="Empirical emulation of screen reader speech output and keyboard navigation friction."
        app
      />

      <div className="wrap app-grid">
        <StatusArea />

        {!scan ? (
          <NoScan what="Assistive simulation records" />
        ) : (
          <div className="exp-container">
            {/* Control & Mode Bar */}
            <div className="card exp-bar">
              <div className="row spread align-center" style={{ flexWrap: "wrap", gap: "10px" }}>
                <div className="row gap-m align-center" style={{ flexWrap: "wrap" }}>
                  <div className="row gap-s align-center">
                    <span className="muted bold">Assistive Profile:</span>
                    <div className="btn-group" role="radiogroup" aria-label="Screen reader profile">
                      <button
                        type="button"
                        className={`btn small ${readerMode === "nvda" ? "primary" : "secondary"}`}
                        onClick={() => setReaderMode("nvda")}
                      >
                        NVDA (Desktop)
                      </button>
                      <button
                        type="button"
                        className={`btn small ${readerMode === "talkback" ? "primary" : "secondary"}`}
                        onClick={() => setReaderMode("talkback")}
                      >
                        TalkBack (Mobile)
                      </button>
                      <button
                        type="button"
                        className={`btn small ${readerMode === "jaws" ? "primary" : "secondary"}`}
                        onClick={() => setReaderMode("jaws")}
                      >
                        JAWS (Virtual Cursor)
                      </button>
                    </div>
                  </div>

                  <div className="row gap-s align-center">
                    <span className="muted bold">Voice Language:</span>
                    <div className="btn-group" role="radiogroup" aria-label="Speech language">
                      <button
                        type="button"
                        className={`btn small ${speechLang === "en" ? "primary" : "secondary"}`}
                        onClick={() => setSpeechLang("en")}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        className={`btn small ${speechLang === "hi" ? "primary" : "secondary"}`}
                        onClick={() => setSpeechLang("hi")}
                      >
                        हिन्दी (Hindi · RPwD)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="row gap-s">
                  <button
                    type="button"
                    className="btn secondary small"
                    disabled={busy !== null}
                    onClick={() => fetchExperience()}
                  >
                    Re-simulate
                  </button>
                  {experience && experience.screenReaderLog.length > 0 && (
                    <button
                      type="button"
                      className={`btn small ${speechActive ? "warn" : "primary"}`}
                      onClick={() => {
                        const first = experience.screenReaderLog[0];
                        if (first) handleFrameClick(first);
                      }}
                    >
                      <Icon name="dot" size={12} />
                      {speechActive ? "Speaking..." : "Play announcement stream"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Frustration & Friction Telemetry */}
            {experience && (
              <div className="grid cols-4 gap-m my-m">
                <div className="card metric-tile">
                  <span className="metric-label muted">Navigation Friction</span>
                  <span className={`metric-val rating-${experience.frustration.frustrationRating}`}>
                    {experience.frustration.frustrationRating.toUpperCase()}
                  </span>
                  <p className="metric-desc muted">{experience.frustration.summary}</p>
                </div>

                <div className="card metric-tile">
                  <span className="metric-label muted">Stuck Points</span>
                  <span className="metric-val text-alert">{experience.frustration.stuckPoints}</span>
                  <p className="metric-desc muted">Focus traps or closed cycling areas</p>
                </div>

                <div className="card metric-tile">
                  <span className="metric-label muted">Unlabeled Controls</span>
                  <span className="metric-val text-warn">{experience.frustration.missingAccessibleNames}</span>
                  <p className="metric-desc muted">Buttons or inputs announced blank</p>
                </div>

                <div className="card metric-tile">
                  <span className="metric-label muted">Traversed Stops</span>
                  <span className="metric-val text-info">{experience.keyboardPathLength}</span>
                  <p className="metric-desc muted">Consecutive tab stops recorded</p>
                </div>
              </div>
            )}

            {/* Screen Reader Speech Announcement Feed */}
            {experience && (() => {
              const filteredFrames = experience.screenReaderLog.filter((f) => {
                if (personaFilter === "all") return true;
                if (personaFilter === "blindness") return !f.name || f.name === "unnamed" || f.speechText.includes("Unlabeled") || f.speechText.includes("blank");
                if (personaFilter === "motor") return f.role === "button" || f.role === "link" || f.role === "input" || f.state === "repeated";
                if (personaFilter === "cognitive") return f.speechText.includes("Warning") || f.speechText.includes("blank") || !f.name;
                return true;
              });

              return (
                <div className="card exp-feed">
                  <div className="row spread align-center border-b pb-s mb-s" style={{ flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <h2 className="m-0 text-l">Speech Synthesizer Output</h2>
                      <span className="tag muted">{filteredFrames.length} events matching persona</span>
                    </div>
                    <div className="row gap-xs align-center" style={{ flexWrap: "wrap" }}>
                      <span className="muted text-xs bold">Persona:</span>
                      <button
                        type="button"
                        className={`chip ${personaFilter === "all" ? "tone-positive" : ""}`}
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => setPersonaFilter("all")}
                      >
                        All ({experience.screenReaderLog.length})
                      </button>
                      <button
                        type="button"
                        className={`chip ${personaFilter === "blindness" ? "tone-positive" : ""}`}
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => setPersonaFilter("blindness")}
                      >
                        Blindness (Screen Reader)
                      </button>
                      <button
                        type="button"
                        className={`chip ${personaFilter === "motor" ? "tone-positive" : ""}`}
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => setPersonaFilter("motor")}
                      >
                        Motor (Keyboard Only)
                      </button>
                      <button
                        type="button"
                        className={`chip ${personaFilter === "cognitive" ? "tone-positive" : ""}`}
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => setPersonaFilter("cognitive")}
                      >
                        Cognitive Clarity
                      </button>
                    </div>
                  </div>

                  <div className="frames-list" role="feed" aria-label="Screen reader announcement timeline">
                    {filteredFrames.map((f) => {
                      const isSelected = selectedFrame === f.order;
                      const isSilent = !f.name || f.name === "unnamed";
                      return (
                        <article
                          key={f.order}
                          className={`frame-card ${isSelected ? "selected" : ""} ${isSilent ? "frame-silent" : ""}`}
                          onClick={() => handleFrameClick(f)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleFrameClick(f);
                            }
                          }}
                        >
                          <div className="frame-meta">
                            <span className="frame-num">#{f.order}</span>
                            <span className="tag role-tag">{f.role}</span>
                            {f.state && <span className="tag state-tag">{f.state}</span>}
                          </div>

                          <div className="frame-speech">
                            <div className="speech-bubble">
                              <span className="speech-icon" aria-hidden="true"><Icon name="speaker" size={14} /></span>
                              <span className="speech-text">
                                “{f.speechText}”
                                {speechLang === "hi" && (
                                  <span style={{ display: "block", color: "var(--accent)", fontStyle: "normal", fontSize: "0.88em", marginTop: "4px" }}>
                                    <span className="tag" style={{ marginRight: "6px", fontSize: "0.75rem" }}>Hindi</span> “{toHindiSpeech(f.speechText)}”
                                  </span>
                                )}
                              </span>
                            </div>
                            <code className="frame-selector muted">{f.selector}</code>
                          </div>

                          <div className="frame-actions">
                            <button
                              type="button"
                              className="btn icon-only small"
                              title="Hear speech announcement"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakText(f.speechText);
                              }}
                            >
                              <Icon name="play" size={12} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </Page>
  );
}
