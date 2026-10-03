import { createBrowserClient } from "@supabase/ssr";

export function configurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Conta de teste do desenvolvimento (sem sessão real no Supabase): quem usa o banco precisa tratar este caso. */
export function contaFake(): boolean {
  return process.env.NEXT_PUBLIC_CONTA_FAKE === "1" && process.env.NODE_ENV !== "production";
}

export function supabaseNoNavegador() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
