import { describe, it, expect } from "vitest";
import { cameraKind, mergeSecurityEvents, tapoLocalStream, validateCameraUrl } from "./security-camera";

describe("Tapo C200 first-stage registration", () => {
  it("prepares local RTSP on port 554 without credentials", () => {
    expect(tapoLocalStream("192.168.1.50")).toBe("rtsp://192.168.1.50:554/stream1");
  });
  it("does not mark RTSP as browser-playable video", () => {
    expect(cameraKind(tapoLocalStream("192.168.1.50"))).toBe("rtsp");
  });
  it("rejects public IPs instead of encouraging camera exposure", () => {
    expect(() => tapoLocalStream("8.8.8.8")).toThrow();
  });
  it.each(["192.168.1.256", "192.168.1", "localhost", "192.168.1.1/password"])("rejects invalid IP %s", value => {
    expect(() => tapoLocalStream(value)).toThrow();
  });
  it("rejects embedded camera credentials", () => {
    expect(() => validateCameraUrl("https://user:password@example.com/live.m3u8")).toThrow();
  });
  it("requires encrypted browser streams", () => {
    expect(() => validateCameraUrl("http://example.com/live.m3u8")).toThrow();
    expect(validateCameraUrl("https://example.com/live.m3u8")).toBe("https://example.com/live.m3u8");
  });
  it("deduplicates realtime and refresh events", () => {
    const event = { id: "a", created_at: "2026-10-18T22:00:00Z" };
    expect(mergeSecurityEvents([event], [event])).toEqual([event]);
  });
});