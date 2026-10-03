import assert from "node:assert/strict";
import { test } from "node:test";
import { EMAIL_CONTATO, LINKTREE_URL, linkedinValido, linktreeValido } from "./contato.ts";

test("linkedinValido aceita https em linkedin.com e subdomínios", () => {
  assert.equal(linkedinValido("https://www.linkedin.com/company/dse-community/"), "https://www.linkedin.com/company/dse-community/");
  assert.equal(linkedinValido("https://br.linkedin.com/company/x"), "https://br.linkedin.com/company/x");
  assert.equal(linkedinValido("https://linkedin.com/company/x"), "https://linkedin.com/company/x");
});

test("linkedinValido recusa vazio, http, outros domínios e imitações", () => {
  assert.equal(linkedinValido(undefined), null);
  assert.equal(linkedinValido(""), null);
  assert.equal(linkedinValido("http://www.linkedin.com/company/x"), null);
  assert.equal(linkedinValido("https://exemplo.com/linkedin.com"), null);
  assert.equal(linkedinValido("https://linkedin.com.golpe.com/company/x"), null);
  assert.equal(linkedinValido("https://notlinkedin.com/company/x"), null);
  assert.equal(linkedinValido("javascript:alert(1)"), null);
});

test("o e-mail de contato padrão é o oficial", () => {
  assert.equal(EMAIL_CONTATO, "academydserec@gmail.com");
});

test("linktreeValido aceita só https em linktr.ee", () => {
  assert.equal(linktreeValido("https://linktr.ee/dsebrasil"), "https://linktr.ee/dsebrasil");
  assert.equal(linktreeValido("http://linktr.ee/dsebrasil"), null);
  assert.equal(linktreeValido("https://linktr.ee.golpe.com/dsebrasil"), null);
  assert.equal(linktreeValido("https://notlinktr.ee/x"), null);
  assert.equal(linktreeValido(undefined), null);
});

test("o Linktree padrão é o da DSE Brasil", () => {
  assert.equal(LINKTREE_URL, "https://linktr.ee/dsebrasil");
});
