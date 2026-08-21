-- Migração 001 — item "pendente" (não avaliado ≠ N/A)
-- IMPORTANTE: o Postgres NÃO deixa adicionar um valor de enum e usá-lo na
-- mesma execução. Rode os DOIS passos SEPARADAMENTE: rode o Passo 1, aguarde
-- o "Success", e só então rode o Passo 2.

-- ================= PASSO 1 (rode sozinho primeiro) =================
alter type resultado_item add value if not exists 'pendente';

-- ================= PASSO 2 (rode depois do Passo 1 concluir) =======
-- Descomente/execute esta linha numa segunda rodada:
alter table auditoria_itens alter column resultado set default 'pendente';
