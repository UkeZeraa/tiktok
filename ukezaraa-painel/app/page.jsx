import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <img src="/icon.png" alt="UkeZaraa" width={140} height={140} />
        <h1>UkeZaraa</h1>
        <p>
          The publishing dashboard for UkeZaraa, a channel of original animated stories.
          Connect your TikTok account, preview each episode, write the caption, choose who can
          see it and post it yourself.
        </p>
        <Link href="/dashboard" className="btn">Open dashboard</Link>
      </section>

      <section className="steps">
        <div className="card">
          <h3>1. Connect</h3>
          <p>Sign in with TikTok. We show your account name and photo so you know it is the right account.</p>
        </div>
        <div className="card">
          <h3>2. Review</h3>
          <p>Pick the episode file, watch the preview, write the caption and choose privacy and interaction settings.</p>
        </div>
        <div className="card">
          <h3>3. Post</h3>
          <p>Nothing is published until you click Post. The dashboard then shows the publishing status.</p>
        </div>
      </section>
    </>
  );
}
