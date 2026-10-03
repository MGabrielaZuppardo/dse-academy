/** Leitura das trilhas no servidor. O arquivo é gerado por `python -m trilhas.gerar`. */

import fs from "node:fs";
import path from "node:path";
import type { DadosTrilhas } from "./trilha-tipos.ts";

const VAZIO: DadosTrilhas = { gerado_em: "", coletada_em: "", modelo: "", trilhas: [] };

let emMemoria: DadosTrilhas | null = null;

export function carregarTrilhas(): DadosTrilhas {
  if (!emMemoria) {
    try {
      emMemoria = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "trilhas.json"), "utf-8")) as DadosTrilhas;
    } catch {
      emMemoria = VAZIO; // sem o arquivo (ex.: build sem geração), o site abre sem trilhas
    }
  }
  return emMemoria;
}
