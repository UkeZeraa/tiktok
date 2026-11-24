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

---

# Instagram (Reels)

Usa o app da Meta com **API setup with Unified login** (login pelo Facebook com `config_id`).

## Na Meta
- **URL de redirecionamento** (na configuração do login unificado): `SITE_URL/api/auth/instagram/callback`
- O @ukezaraa precisa ser conta profissional e estar como **Testador do Instagram** (Funções do app). Aceite o convite no Instagram.
- A análise do app pode ser pulada: é só para as suas próprias contas.

## Na Vercel
1. **Storage → Create → Blob**, conecte ao projeto. A Vercel cria sozinha a variável `BLOB_READ_WRITE_TOKEN`.
2. **Settings → Environment Variables**:
   - `META_APP_ID`: ID do app (Configurações do app → Básico)
   - `META_APP_SECRET`: Chave secreta do app (Configurações do app → Básico)
   - `META_CONFIG_ID`: ID da configuração do login unificado
   - `INSTAGRAM_USERNAME`: `ukezaraa`
3. **Redeploy**.

## Usar
Abra `SITE_URL/instagram` → **Continuar com o Instagram** → escolha entrar com o Instagram e libere a conta @ukezaraa.
Escolha o vídeo, escreva a legenda e clique em **Publicar Reel**. O vídeo vai para o Vercel Blob, o Instagram busca de lá, e o arquivo temporário é apagado depois da publicação.

---

# Estúdio (publicação unificada)

`/studio`: vídeo, capa, título, descrição, tags, seleção de plataformas e opções de cada rede, com status ao vivo.
`/conexoes`: conectar e desconectar TikTok, Instagram e YouTube.

- O vídeo e a capa sobem uma vez para o Vercel Blob e são apagados quando todas as redes terminam.
- TikTok: o servidor lê o vídeo do Blob em pedaços (até 64 MB vai inteiro, acima disso em partes de 10 MB). A capa é um quadro do vídeo (segundo escolhido), porque a API não aceita imagem.
- Instagram: a capa vai como `cover_url`.
- YouTube: a capa vai por `thumbnails.set` (máx. 2 MB, o estúdio reduz a imagem sozinho). Exige canal verificado.
- Tags viram hashtags no fim da legenda do TikTok e do Instagram, e tags no YouTube.
