/** Leitura dos dados de vagas no servidor. Os arquivos são gerados por `python -m app.exportar_json`. */

import fs from "node:fs";
import path from "node:path";
import type { DadosVagas } from "./rotulos.ts";

const PASTA = path.join(process.cwd(), "data");
const VAZIO: DadosVagas = { coletada_em: "", skills: {}, vagas: [] };

let vagasEmMemoria: DadosVagas | null = null;
let descricoesEmMemoria: Record<string, string> | null = null;

function ler<T>(arquivo: string, padrao: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(PASTA, arquivo), "utf-8")) as T;
  } catch {
    return padrao; // sem o arquivo (ex.: build sem coleta), o site abre com a lista vazia
  }
}

export function carregarVagas(): DadosVagas {
  vagasEmMemoria ??= ler<DadosVagas>("vagas.json", VAZIO);
  return vagasEmMemoria;
}

export function descricaoDe(id: string): string {
  descricoesEmMemoria ??= ler<Record<string, string>>("descricoes.json", {});
  return descricoesEmMemoria[id] ?? "";
}
