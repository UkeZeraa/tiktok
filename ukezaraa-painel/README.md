# UkeZaraa — Painel de publicação no TikTok

Site em Next.js com página inicial, Termos, Privacidade e o painel que conecta no TikTok (Login Kit + Content Posting API, Direct Post).

## Subir na Vercel (uns 10 minutos)

1. Crie um repositório no GitHub e envie esta pasta (sem `node_modules` e `.next`).
2. Em vercel.com: **Add New → Project**, importe o repositório e clique em **Deploy**.
   O primeiro deploy vai falhar no login enquanto as variáveis não existirem, e isso é normal.
3. Anote o endereço que a Vercel deu (ex.: `https://ukezaraa.vercel.app`).
4. Em **Settings → Environment Variables**, cadastre:
   - `TIKTOK_CLIENT_KEY` e `TIKTOK_CLIENT_SECRET`: da aba **Sandbox** do app no TikTok
   - `SITE_URL`: o endereço do passo 3, sem barra no final
   - `NEXT_PUBLIC_CONTACT_EMAIL`: o e-mail que aparece em Termos e Privacidade
   - `NEXT_PUBLIC_OWNER_NAME`: `UkeZaraa` (ou o seu nome / Flux Deck)
5. Vá em **Deployments → … → Redeploy** para aplicar as variáveis.

## Configurar o app no TikTok (aba Sandbox)

- **Website URL**: o `SITE_URL`
- **Terms of Service URL**: `SITE_URL/terms`
- **Privacy Policy URL**: `SITE_URL/privacy`
- **Login Kit → Redirect URI**: `SITE_URL/api/auth/callback` (exatamente igual)
- **Content Posting API**: Direct Post ligado
- **Scopes**: `user.info.basic`, `video.upload`, `video.publish`
- **Target users**: a sua conta do TikTok (sem isso o login dá erro no Sandbox)

## Testar

1. Abra `SITE_URL/dashboard` → **Continue with TikTok** → autorize.
2. Escolha um vídeo **de até 4 MB** (um corte curto de 10 a 20 s), escreva a legenda, escolha a privacidade e clique em **Post to TikTok**.
3. O status aparece embaixo do botão. No Sandbox o vídeo sai **privado** (Only me). Isso é esperado.

O limite de 4 MB é por causa da Vercel, que só aceita requisições de até ~4,5 MB. Para a demonstração isso basta.

## Rodar no seu computador

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

O TikTok só redireciona o login para o endereço cadastrado. Para testar localmente, cadastre também `http://localhost:3000/api/auth/callback` e use `SITE_URL=http://localhost:3000`. Se o TikTok recusar localhost, teste direto pela Vercel.
