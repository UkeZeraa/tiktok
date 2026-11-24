export const metadata = { title: "Terms of Service · UkeZaraa" };

const OWNER = process.env.NEXT_PUBLIC_OWNER_NAME || "UkeZaraa";
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export default function Terms() {
  return (
    <article className="legal">
      <h1>Terms of Service</h1>
      <p>Last updated: November 23, 2026</p>

      <h2>1. About the service</h2>
      <p>
        UkeZaraa ("we", "the service") is a web dashboard operated by {OWNER} that lets a creator
        connect TikTok, Instagram and YouTube accounts and publish original animated videos created for the UkeZaraa channel.
        By using the service you agree to these terms.
      </p>

      <h2>2. Your account</h2>
      <p>
        You sign in with your own TikTok account through TikTok Login Kit with your own Instagram professional account through Meta's login, and with your own Google account for YouTube. By uploading to YouTube you also agree to the YouTube Terms of Service (https://www.youtube.com/t/terms). You are responsible for the
        account you connect and for every post you publish through the dashboard. You can disconnect at
        any time by signing out here or by removing UkeZaraa from the connected apps in your TikTok settings.
      </p>

      <h2>3. Your content</h2>
      <p>
        You must own, or have every right needed to publish, the videos, audio and text you post. You
        keep all rights to your content. We only send it to TikTok when you click Post, and only to the
        account you connected. You must follow the terms and community guidelines of TikTok, Instagram and YouTube.
      </p>

      <h2>4. How posting works</h2>
      <p>
        Every post is reviewed and confirmed by you before it is sent. You choose the caption, who can
        view the video and whether comments, duets and stitches are allowed. TikTok may take a few
        minutes to process a video and may reject content that does not meet its rules.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        You may not use the service to post content you do not have rights to, spam, misleading content
        or anything that breaks the law or TikTok's rules.
      </p>

      <h2>6. Availability and liability</h2>
      <p>
        The service is provided as is. We do our best to keep it running but cannot guarantee it will
        always be available or error free. To the extent allowed by law, we are not liable for indirect
        losses arising from its use.
      </p>

      <h2>7. Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version.</p>

      <h2>8. Contact</h2>
      <p>Questions about these terms: {EMAIL ? <a href={`mailto:${EMAIL}`}>{EMAIL}</a> : "contact us through the UkeZaraa channel"}.</p>
    </article>
  );
}
