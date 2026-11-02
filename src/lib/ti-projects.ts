export type TiProject = { id: string; name: string; url: string };

export const INITIAL_TI_PROJECTS: TiProject[] = [
  { id: "zoord", name: "Zoord Dakkai AI", url: "https://atendimentohumanoideaizoord.lovable.app" },
  { id: "project-2", name: "Projeto 2", url: "" },
];

export function createTiProject(projects: TiProject[], name: string, url: string, id: string): TiProject {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 120) throw new Error("Informe um nome de até 120 caracteres.");
  if (projects.some((p) => p.name.toLocaleLowerCase("pt-BR") === cleanName.toLocaleLowerCase("pt-BR"))) {
    throw new Error("Já existe um projeto com esse nome.");
  }
  let cleanUrl = url.trim();
  if (cleanUrl) {
    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
      if (parsed.username || parsed.password) throw new Error();
      cleanUrl = parsed.href;
    } catch { throw new Error("Informe um endereço http ou https válido, sem senhas."); }
  }
  return { id, name: cleanName, url: cleanUrl };
}