import { MUSIC_GENRES, type MusicGenre } from "./music";
import { FORMS_OF_ADDRESS } from "./guest-memory";
export function safeRedirect(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}
export function profilePreferences(name: string, genre: string, volume: number, address = "", notes = "") {
  const selected = MUSIC_GENRES.find((item) => item.id === genre);
  if (!selected || !Number.isFinite(volume) || volume < 0 || volume > 1) throw new Error("Preferências inválidas.");
  return { display_name: name.trim().slice(0, 80), music_genre: selected.id as MusicGenre, music_volume: volume, form_of_address: (FORMS_OF_ADDRESS as readonly string[]).includes(address) ? address : "", food_notes: notes.trim().slice(0, 300) };
}