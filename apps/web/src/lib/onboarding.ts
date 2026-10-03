/** Lembra, nesta sessão do navegador, que a pessoa pulou o onboarding (para não insistir a cada página). */

const CHAVE = "dse:onboarding-pulado";

export function jaPulouOnboarding(): boolean {
  try { return sessionStorage.getItem(CHAVE) === "1"; } catch { return false; }
}

export function marcarOnboardingPulado(): void {
  try { sessionStorage.setItem(CHAVE, "1"); } catch { /* sem storage: vale só até recarregar */ }
}
