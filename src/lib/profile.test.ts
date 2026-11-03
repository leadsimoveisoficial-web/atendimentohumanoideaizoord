import { describe, expect, it } from "vitest";
import { profilePreferences, safeRedirect } from "./profile";
describe("private user preferences", () => {
  it("preserves the chosen name and music settings", () => expect(profilePreferences(" Natan ", "jazz", 0.45)).toEqual({ display_name: "Natan", music_genre: "jazz", music_volume: 0.45, form_of_address: "", food_notes: "" }));
  it("saves form of address and food notes, dropping unknown address", () => { expect(profilePreferences("N", "jazz", 0.4, "senhor", " sem camarão ")).toMatchObject({ form_of_address: "senhor", food_notes: "sem camarão" }); expect(profilePreferences("N", "jazz", 0.4, "rei").form_of_address).toBe(""); });
  it("rejects an invalid volume", () => expect(() => profilePreferences("Natan", "jazz", 1.5)).toThrow());
  it("rejects an unknown genre", () => expect(() => profilePreferences("Natan", "unknown", 0.35)).toThrow());
  it("keeps authentication redirects on this app", () => { expect(safeRedirect("//evil.example")).toBe("/"); expect(safeRedirect("/seguranca")).toBe("/seguranca"); });
});