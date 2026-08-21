# Backend Supabase — Portal de Auditoria WLM

Fundação do banco para o portal: tabelas, controle de acesso por papel (RLS), Storage das fotos dos padrões e a rede já populada.

## Arquivos

| Arquivo | O que é |
|---|---|
| `schema.sql` | Todo o banco: tabelas, enums, RLS, funções, Storage e seed (grupos, casas, padrões DOS/DCS). |
| `supabaseClient.js` | Cliente único do Supabase (vai em `src/lib/`). |
| `db.js` | Camada de dados que substitui o objeto `db` em memória (vai em `src/lib/`). |
| `.env.example` | Modelo das variáveis de ambiente. |
| `functions/criar-usuario/` | Edge Function para o Master criar logins de outros usuários. |

## Passo a passo

### 1. Criar o projeto
Crie um projeto em supabase.com e anote, em *Project Settings → API*, a **Project URL** e a **anon key**.

### 2. Rodar o schema
No *SQL Editor* do Supabase, cole o conteúdo de `schema.sql` e execute. Isso cria todas as tabelas, as políticas de acesso, o bucket `padroes` e já insere os 5 grupos, as casas e os padrões DOS/DCS.

### 3. Criar o primeiro Master
O schema cria todo novo usuário como `visualizador`. Para ter um Master:
1. Em *Authentication → Users*, crie um usuário (e-mail + senha).
2. No *SQL Editor*, promova-o:
   ```sql
   update profiles set papel = 'master', escopo_tipo = 'all'
   where email = 'voce@wlm.com.br';
   ```

### 4. Ligar o app
```bash
npm install @supabase/supabase-js
```
Copie `supabaseClient.js` e `db.js` para `src/lib/`, crie o `.env` a partir do `.env.example` e preencha as duas variáveis.

### 5. Criação de outros usuários (Master)
Criar o **login** de outra pessoa exige a `service_role` key, que **não pode** ir para o navegador. Por isso vai numa Edge Function:
```bash
supabase functions deploy criar-usuario
supabase secrets set PROJECT_URL=https://SEU-PROJETO.supabase.co SERVICE_ROLE_KEY=sua-service-role
```
A tela de "Novo usuário" então chama `supabase.functions.invoke('criar-usuario', { body: {...} })`.
(Enquanto a função não estiver no ar, dá para cadastrar pela tela do Supabase e só ajustar papel/escopo pelo app.)

## Como o app passa a carregar dados

Hoje o `App` semeia tudo em memória. Com o Supabase, o padrão vira **carregar no início e recarregar após cada ação**:

```js
import { auth, listAuditorias, listNCs, listStandards, listUnidades } from "./lib/db";

const [user, setUser] = useState(null);
const [audits, setAudits] = useState([]);
const [ncs, setNcs] = useState([]);
const [standards, setStandards] = useState(null);

// sessão
useEffect(() => auth.onChange(async () => setUser(await auth.me())), []);

// dados (após logar)
async function carregar() {
  const [a, n, s] = await Promise.all([listAuditorias(), listNCs(), listStandards()]);
  setAudits(a); setNcs(n); setStandards(s);
}
useEffect(() => { if (user) carregar(); }, [user]);
```

E as ações passam a ser assíncronas + recarga, por exemplo:
```js
// criar auditoria
const id = await createAuditoria({ tipo, unidade_id, setor, auditor, data, standards });
await carregar();

// concluir execução
await saveExecucao(auditoriaId, tipo, itens);
await carregar();

// tratar NC
await tratarNC(id, { status, severidade, plano_acao, responsavel, prazo });
await carregar();

// master anexa foto ao requisito
await uploadFotoRequisito(requisitoId, arquivo);
await carregar();
```

> Nomes dos campos mudam de camelCase para snake_case no banco (`plano_acao`, `unidade_id`, `foto_path`). O `db.js` já entrega no formato que o componente usa; ao gravar, use os nomes de coluna.

## Mapa de acesso (RLS) — resumido

| Recurso | Master | Auditor | Gestor | Visualizador |
|---|---|---|---|---|
| Ver dados | todas as casas | só casas do seu escopo | só casas do seu escopo | só casas do seu escopo |
| Criar/executar auditoria | ✔ | ✔ (no escopo) | — | — |
| Tratar NC | ✔ | — | ✔ (no escopo) | — |
| Editar padrões + fotos | ✔ | — | — | — |
| Gerenciar usuários | ✔ | — | — | — |

O escopo do usuário é `all` (todas as casas) ou `grupo` (uma das casas do grupo escolhido) — definido em `profiles`.

## Pendências de dados (para fechar o cadastro)
- **CSC**: o seed traz só `CSC Rio`. Informe as demais casas com CSC e se elas usam os mesmos padrões DOS/DCS ou um checklist próprio (nesse caso criamos um terceiro `tipo_padrao`).
- Confirmar os nomes **Ferreira** (Quinta Roda), **Reforma** (Itaipu) e **S Leste** (Itaipu Norte).
