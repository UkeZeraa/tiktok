export const metadata = { title: "Privacy Policy · UkeZaraa" };

const OWNER = process.env.NEXT_PUBLIC_OWNER_NAME || "UkeZaraa";
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export default function Privacy() {
  return (
    <article className="legal">
      <h1>Privacy Policy</h1>
      <p>Last updated: November 23, 2026</p>

      <h2>1. Who we are</h2>
      <p>UkeZaraa is a publishing dashboard operated by {OWNER} for the UkeZaraa channel of original animated stories.</p>

      <h2>2. What we collect</h2>
      <p>When you sign in with TikTok, we receive from TikTok, with your permission:</p>
      <ul>
        <li>an access token that lets the dashboard publish to your account;</li>
        <li>your TikTok open ID, display name and profile photo (scope user.info.basic), used only to show which account is connected;</li>
        <li>your posting settings from TikTok, such as available privacy options and maximum video length, used only to build the posting form.</li>
      </ul>
      <p>
        When you post, the video file and caption you choose are sent from your browser through our server
        to TikTok. We do not keep a copy of the video or caption after the upload finishes.
      </p>

      <h2>3. How we store it</h2>
      <p>
        The access token is kept only in a secure, http-only cookie in your browser and
        expires automatically. We do not have a database of users and we do not store your TikTok data on our servers.
      </p>

      <h2>4. What we do not do</h2>
      <p>We do not sell or share your data, we do not use it for advertising and we do not read your messages, followers or other videos.</p>

      <h2>5. Your choices and deletion</h2>
      <p>
        Sign out at any time to delete the session cookie. You can also revoke access in the TikTok app under
        Settings and privacy, Security, Manage app permissions. After that we have no access to your account and keep no data about you.
      </p>

      <h2>6. Third parties</h2>
      <p>Publishing is done through TikTok's official Content Posting API. TikTok's own Privacy Policy applies to content on TikTok.</p>

      <h2>7. Contact</h2>
      <p>Privacy questions or deletion requests: {EMAIL ? <a href={`mailto:${EMAIL}`}>{EMAIL}</a> : "contact us through the UkeZaraa channel"}.</p>
    </article>
  );
}
