import { describe, expect, it } from "vitest";
import { createTiProject, INITIAL_TI_PROJECTS, requireTiUser } from "./ti-projects";

describe("projetos futuros do painel de TI", () => {
  it("permite qualquer conta autenticada sem exigir papel de administrador", () => {
    expect(() => requireTiUser("123e4567-e89b-12d3-a456-426614174000")).not.toThrow();
  });
  it("nega identidade ausente ou inválida", () => {
    for (const identity of [null, undefined, "", true, "admin"]) expect(() => requireTiUser(identity)).toThrow();
  });
  it("adiciona projetos além dos dois iniciais sem alterar os existentes", () => {
    const next = createTiProject(INITIAL_TI_PROJECTS, " Novo projeto ", "https://example.org", "new");
    expect([...INITIAL_TI_PROJECTS, next].map((p) => p.name)).toEqual(["Zoord Dakkai AI", "Projeto 2", "Novo projeto"]);
    expect(next.url).toBe("https://example.org/");
  });
  it("mantém nomes distintos para separar tarefas por projeto", () => {
    expect(() => createTiProject(INITIAL_TI_PROJECTS, "zoord dakkai ai", "", "duplicate")).toThrow();
  });
  it("não aceita links executáveis ou credenciais", () => {
    expect(() => createTiProject([], "Teste", "javascript:alert(1)", "x")).toThrow();
    expect(() => createTiProject([], "Teste", "https://user:pass@example.org", "x")).toThrow();
  });
});