"use client";
import { useEffect, useRef, useState } from "react";

const PRIVACY_LABELS = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};

const STATUS_LABELS = {
  PROCESSING_UPLOAD: "Uploading to TikTok…",
  PROCESSING_DOWNLOAD: "TikTok is receiving the video…",
  SEND_TO_USER_INBOX: "Sent to your TikTok inbox",
  PUBLISH_COMPLETE: "Published",
  FAILED: "Failed",
};

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState("");

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [disclose, setDisclose] = useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [branded, setBranded] = useState(false);

  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("error")) setLoginError(p.get("error"));
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d))
      .finally(() => setLoading(false));
    return () => clearInterval(timer.current);
  }, []);

  const creator = me?.creator;
  const maxSec = creator?.max_video_post_duration_sec || 600;
  const options = creator?.privacy_level_options || [];
  const tooLong = duration > 0 && duration > maxSec;
  const discloseIncomplete = disclose && !yourBrand && !branded;

  function pickFile(e) {
    const f = e.target.files?.[0];
    setError(""); setStatus(null); setDuration(0);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (!f) { setFile(null); setVideoUrl(""); return; }
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
  }

  async function poll(publish_id) {
    const r = await fetch("/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish_id }),
    });
    const d = await r.json();
    setStatus({ publish_id, ...d });
    if (d.status === "PUBLISH_COMPLETE" || d.status === "FAILED" || d.error) clearInterval(timer.current);
  }

  async function post() {
    setPosting(true); setError(""); setStatus(null);
    const fd = new FormData();
    fd.append("video", file);
    fd.append("title", title);
    fd.append("privacy_level", privacy);
    fd.append("disable_comment", String(!allowComment));
    fd.append("disable_duet", String(!allowDuet));
    fd.append("disable_stitch", String(!allowStitch));
    fd.append("brand_organic_toggle", String(disclose && yourBrand));
    fd.append("brand_content_toggle", String(disclose && branded));
    try {
      const r = await fetch("/api/post", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Something went wrong.");
      setStatus({ publish_id: d.publish_id, status: "PROCESSING_UPLOAD" });
      clearInterval(timer.current);
      timer.current = setInterval(() => poll(d.publish_id), 3000);
      poll(d.publish_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <p className="hint">Loading…</p>;

  if (!me) {
    return (
      <section className="hero">
        <h1>Connect your TikTok account</h1>
        <p>Sign in with TikTok to publish UkeZaraa episodes to your profile. You review and confirm every post.</p>
        {loginError && <div className="notice err">Sign-in failed: {loginError}</div>}
        <a href="/api/auth/login" className="btn tiktok">Continue with TikTok</a>
      </section>
    );
  }

  const canPost = file && privacy && !tooLong && !discloseIncomplete && !posting && creator;
  const brandedBlocksPrivate = disclose && branded;

  return (
    <>
      <div className="card">
        <h2>Connected account</h2>
        <div className="account">
          {me.user?.avatar_url && <img src={me.user.avatar_url} alt="" />}
          <div>
            <div className="name">{me.user?.display_name || creator?.creator_nickname}</div>
            <div className="sub">Posting as {creator?.creator_nickname || me.user?.display_name}</div>
          </div>
          <a href="/api/auth/logout" className="btn ghost" style={{ marginLeft: "auto" }}>Sign out</a>
        </div>
        {!creator && (
          <div className="notice err">
            This account cannot post right now{me.creator_error?.message ? `: ${me.creator_error.message}` : "."} Try again later.
          </div>
        )}
      </div>

      <div className="row">
        <div className="col card">
          <h2>1. Video</h2>
          <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={pickFile} />
          <p className="hint">MP4 or MOV. Maximum length for this account: {Math.floor(maxSec / 60)} min{maxSec % 60 ? ` ${maxSec % 60} s` : ""}.</p>
          {videoUrl && (
            <video
              className="preview"
              src={videoUrl}
              controls
              playsInline
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            />
          )}
          {tooLong && <div className="notice err">This video is longer than this account allows.</div>}
        </div>

        <div className="col card">
          <h2>2. Post details</h2>

          <label className="field" htmlFor="title">Caption</label>
          <textarea id="title" maxLength={2200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Write the caption and hashtags" />
          <div className="counter">{title.length} / 2200</div>

          <label className="field" htmlFor="privacy">Who can view this video</label>
          <select id="privacy" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
            <option value="" disabled>Select privacy</option>
            {options.map((o) => (
              <option key={o} value={o} disabled={brandedBlocksPrivate && o === "SELF_ONLY"} title={brandedBlocksPrivate && o === "SELF_ONLY" ? "Branded content visibility cannot be set to private." : undefined}>
                {PRIVACY_LABELS[o] || o}
              </option>
            ))}
          </select>

          <label className="field">Allow users to</label>
          <label className={`check ${creator?.comment_disabled ? "disabled" : ""}`}>
            <input type="checkbox" checked={allowComment} disabled={creator?.comment_disabled} onChange={(e) => setAllowComment(e.target.checked)} /> Comment
          </label>
          <label className={`check ${creator?.duet_disabled ? "disabled" : ""}`}>
            <input type="checkbox" checked={allowDuet} disabled={creator?.duet_disabled} onChange={(e) => setAllowDuet(e.target.checked)} /> Duet
          </label>
          <label className={`check ${creator?.stitch_disabled ? "disabled" : ""}`}>
            <input type="checkbox" checked={allowStitch} disabled={creator?.stitch_disabled} onChange={(e) => setAllowStitch(e.target.checked)} /> Stitch
          </label>

          <label className="field">Content disclosure</label>
          <label className="check">
            <input type="checkbox" checked={disclose} onChange={(e) => { setDisclose(e.target.checked); if (!e.target.checked) { setYourBrand(false); setBranded(false); } }} />
            This video promotes a brand, product or service
          </label>
          {disclose && (
            <div className="subchecks">
              <label className="check"><input type="checkbox" checked={yourBrand} onChange={(e) => setYourBrand(e.target.checked)} /> Your brand</label>
              <label className="check"><input type="checkbox" checked={branded} onChange={(e) => { setBranded(e.target.checked); if (e.target.checked && privacy === "SELF_ONLY") setPrivacy(""); }} /> Branded content</label>
              {discloseIncomplete && <p className="hint">You need to indicate if your content promotes yourself, a third party, or both.</p>}
              {yourBrand && !branded && <p className="hint">Your video will be labeled as 'Promotional content'.</p>}
              {branded && <p className="hint">Your video will be labeled as 'Paid partnership'. Branded content visibility cannot be set to private.</p>}
            </div>
          )}

          <p className="hint" style={{ marginTop: 16 }}>
            By posting, you agree to TikTok's{" "}
            <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">Music Usage Confirmation</a>
            {branded ? <> and <a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">Branded Content Policy</a></> : null}.
          </p>

          <span title={discloseIncomplete ? "You need to indicate if your content promotes yourself, a third party, or both." : undefined} style={{ display: "block" }}>
          <button className="btn" style={{ width: "100%", marginTop: 8 }} disabled={!canPost} onClick={post}>
            {posting ? "Posting…" : "Post to TikTok"}
          </button>
          </span>

          {error && <div className="notice err">{error}</div>}
          {status && (
            <div className={`notice ${status.status === "FAILED" || status.error ? "err" : status.status === "PUBLISH_COMPLETE" ? "ok" : "info"}`}>
              <strong>Status:</strong> {STATUS_LABELS[status.status] || status.status || status.error?.message}
              {status.fail_reason ? ` (${status.fail_reason})` : ""}
              <br />
              <span className="hint">It may take a few minutes for the video to appear on your profile.</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
