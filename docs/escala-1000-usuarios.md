# Escalar a DSE Academy para mais de 1.000 pessoas (100% open-source)

Documento de requisitos e arquitetura-alvo. Escrito depois da aprovação da POC (piloto de ~20 pessoas).
Status: **proposta para decisão do time**. Nada aqui foi implementado ainda, exceto onde indicado.

---

## 1. Resumo para quem decide

1. **1.000 pessoas não é uma carga grande.** Com 10% simultâneas, são cerca de **17 requisições/s** ao banco; num pico de divulgação (5x), cerca de **85/s**.
   Um Postgres com PostgREST bem configurado atende isso com folga, e o conteúdo público já é quase todo estático.
2. **O risco real não é CPU, é fragilidade operacional.** Hoje o que derruba o serviço é: banco que pausa por inatividade no plano gratuito,
   limite de e-mails de login, cota do Google Apps Script, ponto único de falha e ausência de monitoramento.
3. **"Full open-source" é viável**, com uma exceção honesta: **entrega de e-mail** (reputação de IP não é software). Proposta: manter login com
   Google (OAuth) como caminho principal e um relay SMTP para os e-mails restantes.
4. **Recomendação:** migrar em 3 fases (seção 7). A fase 1 corrige os riscos sem mudar de plataforma e leva ~1 a 2 semanas;
   a fase 2 coloca tudo em infraestrutura própria e aberta; a fase 3 dá alta disponibilidade.

---

## 2. Premissas e perfil de carga

| Item | Valor adotado | Como foi estimado |
|---|---|---|
| Pessoas cadastradas | 1.000 (meta) → 5.000 (teto de planejamento) | meta do time |
| Simultâneas no pico normal | 10% = 100 | premissa; **validar com analytics** |
| Simultâneas no pico de divulgação | 30% = 300 | evento, post no LinkedIn, newsletter |
| Páginas por pessoa por minuto | 2 | navegação em vagas e trilhas |
| Chamadas ao banco por carga de página (logada) | ~5 | sessão, perfil, vagas salvas, `is_admin`, inscrições |
| Chamadas por ação de escrita | 1 a 2 | salvar vaga, marcar etapa, enviar formulário |

**Estimativa:** 100 pessoas × 2 páginas/min ÷ 60 ≈ 3,3 páginas/s; × 5 chamadas ≈ **17 req/s** ao banco no pico normal.
Pico de divulgação: 300 pessoas ⇒ **~50 req/s** sustentados, com rajadas de até ~100 req/s.

**O que é estático (não toca o banco):** home, lista de vagas, uma página por vaga (~465), trilhas, "Sobre". Dados em
`apps/web/data/*.json` (vagas ~280 KB, descrições ~1,6 MB, trilhas ~200 KB), embutidos no build.

**O que é dinâmico (toca o banco, sempre via RLS):** login, perfil, vagas salvas, progresso nas trilhas, formulários, painel de administração.

---

## 3. Requisitos funcionais

Os funcionais **não mudam** com a escala; só precisam continuar funcionando sob carga:

| ID | Requisito |
|---|---|
| RF-01 | Qualquer pessoa vê vagas e trilhas sem login |
| RF-02 | Login por Google ou link no e-mail; sessão persistente |
| RF-03 | Perfil, vagas salvas, aderência às vagas e progresso nas trilhas (exigem login) |
| RF-04 | Envio de artigos e cadastro de palestrantes, com aviso à equipe |
| RF-05 | Painel `/admin` com totais, histórico e moderação (só admins) |
| RF-06 | Vagas e trilhas atualizadas toda semana, sem intervenção manual |
| RF-07 | Aviso por e-mail e evento no Agenda para cada artigo; lembrete semanal de revisão |
| RF-08 | Exclusão de conta e dos dados (LGPD) |

---

## 4. Requisitos não funcionais (mensuráveis)

| ID | Categoria | Requisito | Meta |
|---|---|---|---|
| RNF-01 | Desempenho | Páginas públicas (TTFB, p95) | ≤ 300 ms |
| RNF-02 | Desempenho | Chamadas ao banco via API (p95 / p99) | ≤ 300 ms / ≤ 800 ms |
| RNF-03 | Capacidade | Carga sustentada sem degradar | 150 req/s por 30 min; rajada de 400 req/s por 1 min |
| RNF-04 | Capacidade | Usuários simultâneos sem erro | 500 (teste), 300 (operação) |
| RNF-05 | Disponibilidade | Mensal, fases 1 e 2 | 99,5% (≈ 3,6 h de indisponibilidade) |
| RNF-06 | Disponibilidade | Mensal, fase 3 | 99,9% (≈ 43 min) |
| RNF-07 | Erros | Taxa de resposta 5xx | < 0,5% |
| RNF-08 | Degradação | Se o banco cair, o conteúdo público continua no ar | obrigatório |
| RNF-09 | Recuperação | RPO (perda máxima de dados) | 24 h na fase 1; ≤ 15 min na fase 2 |
| RNF-10 | Recuperação | RTO (tempo para voltar) | ≤ 4 h na fase 1; ≤ 1 h na fase 2 |
| RNF-11 | Segurança | RLS em todas as tabelas; nenhum segredo no front | obrigatório (já atendido) |
| RNF-12 | Abuso | Limite de requisições por IP e por conta | obrigatório antes de abrir ao público |
| RNF-13 | Privacidade | Política de privacidade publicada; exclusão de conta | obrigatório antes de abrir ao público |
| RNF-14 | Observabilidade | Painel de métricas e alertas (indisponibilidade, 5xx, latência, disco) | obrigatório na fase 1 |
| RNF-15 | Portabilidade | Todo componente em licença aberta e executável fora de um provedor específico | meta da fase 2 |
| RNF-16 | Custo | Teto mensal de infraestrutura | a definir (ver perguntas abertas) |

---

## 5. Restrições

- **Licença:** todo software em produção com licença aberta (OSI). Serviços gerenciados só onde não houver alternativa viável, e documentados como exceção.
- **Equipe pequena e voluntária:** a operação precisa ser simples; automação e alertas valem mais que arquitetura sofisticada.
- **Dados pessoais:** e-mail, habilidades e formulários. LGPD se aplica.
- **Dependência externa não controlável:** a coleta de vagas usa um endereço interno do portal da Gupy (já mudou uma vez, em outubro de 2026).

---

## 6. Diagnóstico: o que quebra primeiro (com evidência do código)

Ordenado por probabilidade de causar queda **antes** de 1.000 pessoas.

| # | Risco | Evidência / motivo | Severidade |
|---|---|---|---|
| 1 | **Banco pausa por inatividade** no plano gratuito do Supabase | limite do plano gratuito (confirmar na página atual de limites do Supabase) | Alta |
| 2 | **E-mail de login com limite baixo** | o envio padrão do Supabase tem teto de poucos e-mails por hora; 1.000 pessoas entrando no mesmo dia estouram | Alta |
| 3 | **Cota do Apps Script** | `MailApp` em conta Gmail comum ≈ 100 e-mails/dia; webhook síncrono e uma execução por envio | Média |
| 4 | **Hospedagem do front em plano pessoal** | plano gratuito da Vercel é para uso não comercial e tem limites de banda e funções | Média |
| 5 | **Sem monitoramento nem alertas** | hoje só sabemos que caiu se alguém avisar | Alta |
| 6 | **Sem rate limit** | formulários públicos aceitam inserção anônima (artigos, palestrantes, relatos); abuso enche o banco | Alta |
| 7 | **Políticas RLS sem otimização** | `auth.uid()` chamado por linha em vez de `(select auth.uid())`; `submissoes_artigos` e `palestrantes` filtram por `user_id` sem índice | Média (cresce com os dados) |
| 8 | **Várias chamadas por carga de página** | provider de conta faz sessão + perfil + salvas, mais `is_admin` no menu | Baixa hoje; vira custo com a escala |
| 9 | **Ponto único de falha** | um banco, um front, um script | Média |
| 10 | **Backup não verificado** | depende do plano do provedor; sem teste de restauração | Alta |
| 11 | **Coleta frágil** | endereço não documentado da Gupy; job falha inteiro se mudar | Média |

---

## 7. Arquitetura-alvo e fases

### Fase 1 (1 a 2 semanas): estabilizar sem trocar de plataforma
Objetivo: parar de depender de sorte. Custo baixo, risco baixo.

1. **Banco sem pausa e com backup real:** plano pago do Supabase **ou** já subir o Postgres próprio (ver fase 2). Agendar `pg_dump` diário para armazenamento S3-compatível e **testar a restauração**.
2. **E-mail de login:** SMTP próprio configurado no Supabase (relay com boa reputação; ver seção 9) e login com Google como caminho principal (já implementado).
3. **Rate limit** nos formulários públicos: limite por IP no proxy e por conta no banco (função de inserção com contagem, ou trigger).
4. **RLS otimizada:** trocar `auth.uid()` por `(select auth.uid())` nas políticas; criar índices em `user_id` de `submissoes_artigos` e `palestrantes`.
5. **Observabilidade mínima:** monitor de disponibilidade externo (Uptime Kuma) em `/`, `/vagas` e `/health` da API, com alerta para o e-mail da equipe.
6. **Teste de carga** (seção 8) antes de divulgar.
7. **Política de privacidade** no ar.

### Fase 2 (3 a 6 semanas): infraestrutura própria e 100% aberta

```
Internet
   │
[ Caddy ]  TLS automático, HTTP/2 e 3, rate limit, cache de estáticos, compressão
   │
   ├── Next.js (build "standalone", container)  × 2 réplicas
   │       └── páginas estáticas servidas direto do disco/cache
   │
   └── Supabase auto-hospedado (docker compose)
           ├── Kong (gateway) ── GoTrue (auth) ── PostgREST (API)
           ├── PgBouncer ou Supavisor (pool de conexões)
           └── PostgreSQL 15+  (primário)
                   └── WAL-G / pgBackRest ──► MinIO (S3 aberto), em outro disco/local

Observabilidade: Prometheus + Alertmanager + Grafana + Loki (logs) + Uptime Kuma
Automação:       GitHub Actions hoje; Forgejo/Woodpecker se quiser sair do GitHub
Dados de vagas:  job semanal (Python) grava JSON versionado; o site é reconstruído
```

Decisões (ADRs resumidas):

| Decisão | Escolha | Por quê |
|---|---|---|
| Front | Next.js em container (`output: "standalone"`) atrás do Caddy | roda em qualquer VPS; abandona dependência da Vercel |
| Auth + API de dados | Supabase auto-hospedado | o código do site já fala com ele; a RLS continua sendo a autorização; troca só a URL |
| Banco | PostgreSQL com PgBouncer | conexões previsíveis sob rajada; backups por WAL (RPO ≤ 15 min) |
| Cache | Caddy (ou Varnish) para estáticos e `Cache-Control` longo em `/_next/static` | a maior parte do tráfego nunca chega ao Next nem ao banco |
| Proxy / TLS | Caddy | configuração mínima, certificados automáticos, rate limit por IP |
| Métricas | Prometheus + Grafana + Alertmanager | padrão aberto |
| Logs | Loki (+ Promtail) | leve, mesma interface do Grafana |
| Backup | WAL-G ou pgBackRest para MinIO | restauração pontual; **teste de restauração mensal** |
| Notificações de formulário | worker próprio (Python) lendo uma fila no Postgres (`LISTEN/NOTIFY` ou tabela `outbox`) | tira o Apps Script e o `pg_net` do caminho crítico; reenvio garantido |
| Agenda | adaptador opcional (Google Agenda via API ou arquivo `.ics`) | é a única integração inerentemente do Google; fica isolada |
| Fila de tarefas pesadas (LLM, coleta) | cron + Python em job isolado | já é assim; nada disso fica no caminho do usuário |

Sizing inicial (a validar no teste de carga): **2 VPS** de 4 vCPU / 8 GB (um para app + proxy, outro para banco), disco SSD com margem, backup em um terceiro local.

### Fase 3 (conforme a necessidade): alta disponibilidade
- Réplica de leitura do Postgres (streaming) e failover manual documentado; depois automático (Patroni) se o RNF-06 exigir 99,9%.
- Segundo nó de aplicação em outra zona; balanceamento no Caddy/HAProxy.
- Só entra se o monitoramento mostrar necessidade: complexidade operacional é custo.

---

## 8. Plano de teste de carga (k6, open-source)

Executar **antes de divulgar** e depois de cada mudança relevante de infraestrutura.

| Cenário | O que simula | Passa se |
|---|---|---|
| Navegação pública | 300 usuários virtuais abrindo home, lista e páginas de vaga | p95 TTFB ≤ 300 ms; 0 erros 5xx |
| Pessoa logada | 150 usuários: sessão, perfil, vagas salvas, inscrições, marcar etapa | p95 ≤ 300 ms; 5xx < 0,5% |
| Pico de divulgação | rampa de 0 a 500 usuários em 2 min, platô de 5 min | sem queda; latência volta ao normal em 1 min após o pico |
| Formulários sob abuso | 50 req/s de inserções anônimas | rate limit responde 429; banco não degrada |
| Falha do banco | parar o Postgres por 2 min | páginas públicas continuam; áreas logadas mostram aviso (RNF-08) |
| Restauração | restaurar o backup do dia anterior em máquina limpa | RTO e RPO dentro das metas |

Dados de teste: contas sintéticas em um ambiente separado, **nunca** em produção.

---

## 9. E-mail: a exceção ao "100% open-source"

Rodar o próprio servidor de e-mail (Postal, Mailu, Postfix) é possível, mas **a entrega depende de reputação de IP e de DNS**, não de software:
pode cair em spam por semanas, e um IP novo costuma ser bloqueado. Recomendação:

1. Reduzir a dependência: **Google como login principal**; e-mail por link como alternativa.
2. Usar um **relay SMTP** com reputação estabelecida para os e-mails restantes; é a única peça não aberta, e fica isolada (basta trocar as credenciais SMTP).
3. Configurar SPF, DKIM e DMARC no domínio da DSE.

Decisão do time: aceitar essa exceção documentada, ou assumir o risco de entregabilidade do servidor próprio.

---

## 10. Segurança e LGPD

- Manter RLS como única fonte de autorização; nenhuma chave de serviço no front.
- Rate limit por IP (Caddy) e por conta (banco); CAPTCHA aberto (por exemplo, Altcha) nos formulários públicos, se o abuso aparecer.
- Cabeçalhos de segurança (CSP, HSTS) no proxy; dependências verificadas no CI.
- Segredos fora do repositório; rotação do token do webhook antes da produção.
- Política de privacidade, encarregado (DPO) e canal de contato definidos; exclusão de conta já existe (`excluir_minha_conta`).
- Logs sem dados pessoais; retenção definida.

---

## 11. Riscos e mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Voluntários sem tempo para operar o servidor | Média | Alto | automação, alertas, runbooks curtos; começar pela fase 1 |
| Migração do Supabase hospedado para auto-hospedado causar perda de dados | Baixa | Alto | ensaio com cópia, `pg_dump`/restore validado, janela combinada, rollback pelo DNS |
| E-mails caindo em spam | Alta | Médio | Google como login principal, SPF/DKIM/DMARC, relay SMTP |
| Gupy mudar o endereço de novo | Média | Médio | alerta quando a coleta vier vazia; manter o último JSON no ar |
| Crescimento acima de 5.000 pessoas | Baixa | Médio | seção 7, fase 3; revisar o dimensionamento |
| Custo da infraestrutura | Média | Médio | começar com 2 VPS; medir antes de ampliar |

---

## 12. Roadmap sugerido

| Semana | Entrega |
|---|---|
| 1 | Monitor de disponibilidade, backup diário com teste de restauração, índices e RLS otimizada, política de privacidade |
| 2 | SMTP próprio, rate limit nos formulários, primeiro teste de carga em ambiente separado |
| 3 a 4 | Ambiente com Supabase auto-hospedado e Next.js em container; ensaio de migração com cópia dos dados |
| 5 | Observabilidade completa (Prometheus, Grafana, Loki, alertas) |
| 6 | Migração, teste de carga final, divulgação gradual |
| depois | Worker de notificações próprio, réplica de leitura e failover |

---

## 13. Perguntas abertas para o time

1. **Orçamento mensal** de infraestrutura (RNF-16)?
2. **Quem opera?** Há pessoas com tempo para plantão e manutenção, ou preferimos manter o banco gerenciado e abrir só o resto?
3. **Domínio próprio** da DSE já existe? É pré-requisito para e-mail confiável e para sair do endereço `.vercel.app`.
4. **Aceitamos a exceção do relay SMTP** (seção 9)?
5. **Há previsão de eventos** (divulgação em massa, datas de pico) que definam a carga de teste?
6. **Meta de disponibilidade:** 99,5% basta para o piloto ampliado, ou o contrato com a comunidade exige 99,9%?
7. **Dados pessoais:** quem é o responsável legal (controlador) e o encarregado?

---

## 14. Primeiros passos que não dependem de decisão

Podem começar já, sem custo e sem conflito com nenhuma das opções:

- índices em `user_id` e `(select auth.uid())` nas políticas (migration 009);
- monitor de disponibilidade externo;
- script e rotina de backup com teste de restauração;
- cenários k6 versionados em `tests/carga/`;
- página de política de privacidade.
