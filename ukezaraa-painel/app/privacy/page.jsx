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

      <p>
        When you connect Instagram, we receive from Meta, with your permission, an access token and the ID,
        username and profile photo of the Instagram professional account you choose, used only to show the
        connected account and to publish the Reels you submit. Videos you publish to Instagram are stored
        temporarily in our file storage so Instagram can fetch them, and are deleted right after publishing.
      </p>

      <p>
        When you connect YouTube, we receive from Google, with your permission, a refresh token and your
        channel ID, name and picture (scopes youtube.upload and youtube.readonly), used only to show the
        connected channel and to upload the videos you submit. Videos are stored temporarily so they can be
        sent to YouTube, and are deleted right after the upload. Our use of information received from Google
        APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.
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
        Settings and privacy, Security, Manage app permissions, in Instagram under Settings, Website permissions, Apps and websites, and in your Google account at https://myaccount.google.com/permissions. After that we have no access to your account and keep no data about you.
      </p>

      <h2>6. Third parties</h2>
      <p>Publishing is done through TikTok's official Content Posting API and Meta's official Instagram API and the YouTube Data API. YouTube's Terms of Service and Google's Privacy Policy (https://policies.google.com/privacy) apply to content on YouTube. The privacy policies of TikTok and Meta apply to content on their platforms.</p>

      <h2>7. Contact</h2>
      <p>Privacy questions or deletion requests: {EMAIL ? <a href={`mailto:${EMAIL}`}>{EMAIL}</a> : "contact us through the UkeZaraa channel"}.</p>
    </article>
  );
}
