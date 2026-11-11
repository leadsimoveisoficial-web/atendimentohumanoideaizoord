import { describe, expect, it, vi } from "vitest";
import { browseMenu } from "./menu-interaction";

describe("silent menu browsing", () => {
  it.each(["open", "category", "dish", "close"])("stops narration without starting another on %s", () => {
    const commands = { stop: vi.fn(), present: vi.fn(), say: vi.fn() };
    const select = vi.fn();
    browseMenu(commands, select);
    expect(commands.stop).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(1);
    expect(commands.present).not.toHaveBeenCalled();
    expect(commands.say).not.toHaveBeenCalled();
  });
});