// src/lib/supabaseClient.js
// Cliente único do Supabase. As chaves vêm do .env (Vite injeta VITE_*).
// A anon key é pública por design — a proteção real é a RLS no banco.
// NUNCA coloque aqui a service_role (ela ignora a RLS e é só de servidor).
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Ajuda o dev: sem .env configurado, avisa em vez de falhar silenciosamente.
  console.error(
    "Supabase: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env " +
    "(veja .env.example). Pegue os valores em Project Settings > API."
  );
}

export const supabase = createClient(url, anon);
export const SUPA_URL = url;
export const SUPA_ANON = anon;
