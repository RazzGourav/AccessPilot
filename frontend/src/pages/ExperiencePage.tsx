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
  const [speechActive, setSpeechActive] = useState(false);

  useEffect(() => {
    if (scan && !experience) {
      fetchExperience();
    }
  }, [scan, experience]);

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/Warning:/g, "Alert:");
    const utterance = new SpeechSynthesisUtterance(clean);
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
              <div className="row spread align-center">
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
            {experience && (
              <div className="card exp-feed">
                <div className="row spread align-center border-b pb-s mb-m">
                  <h2 className="m-0 text-l">Speech Synthesizer Output</h2>
                  <span className="tag muted">{experience.screenReaderLog.length} events logged</span>
                </div>

                <div className="frames-list" role="feed" aria-label="Screen reader announcement timeline">
                  {experience.screenReaderLog.map((f) => {
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
                            <span className="speech-icon" aria-hidden="true">🔊</span>
                            <span className="speech-text">“{f.speechText}”</span>
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
                            <span aria-hidden="true">▶</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
