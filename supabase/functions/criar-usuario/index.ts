// supabase/functions/criar-usuario/index.ts
// Cria o LOGIN (auth.users) + profile de um novo usuário. Só o Master chama.
// - Senha SEMPRE padrão "Peg@2026" (o usuário troca no 1º acesso).
// - Escopo de acesso: todas as casas / um grupo / uma casa específica.
// Usa a service_role (fica SÓ no servidor).
//
// Deploy:
//   supabase functions deploy criar-usuario
//   supabase secrets set PROJECT_URL=https://SEU-PROJETO.supabase.co SERVICE_ROLE_KEY=...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SENHA_PADRAO = "Peg@2026";

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("PROJECT_URL")!;
    const service = Deno.env.get("SERVICE_ROLE_KEY")!;

    // valida que quem chama é master
    const asCaller = createClient(url, service, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await asCaller.auth.getUser();
    if (!user) return json({ error: "não autenticado" }, 401);
    const { data: prof } = await asCaller.from("profiles").select("papel").eq("id", user.id).single();
    if (prof?.papel !== "master") return json({ error: "apenas master" }, 403);

    const {
      nome, email, papel,
      escopo_tipo = "all", escopo_grupo_id = null, escopo_unidade_id = null,
      responsavel_unidades = [],
    } = await req.json();

    const admin = createClient(url, service);
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password: SENHA_PADRAO, email_confirm: true, user_metadata: { nome },
    });
    if (error) return json({ error: error.message }, 400);

    await admin.from("profiles").upsert({
      id: created.user.id, nome, email, papel,
      escopo_tipo, escopo_grupo_id, escopo_unidade_id,
      responsavel_unidades,
      senha_provisoria: true,
    });

    return json({ ok: true, id: created.user.id, senha: SENHA_PADRAO });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
