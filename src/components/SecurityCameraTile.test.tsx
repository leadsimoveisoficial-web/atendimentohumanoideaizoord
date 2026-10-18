import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SecurityCameraTile } from "./SecurityCameraTile";

afterEach(cleanup);
const cam = { id: "camera-1", name: "Tapo entrada", zone: "entrada", stream_url: "rtsp://192.168.1.50:554/stream1", snapshot_url: "" };

describe("camera communication state", () => {
  it("keeps a registered Tapo pending instead of reporting it online", async () => {
    const onStatus = vi.fn();
    const view = render(<SecurityCameraTile cam={cam} register={vi.fn()} onStatus={onStatus} />);
    await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith("camera-1", "pending"));
    expect(view.container.querySelector("video")).toBeNull();
    expect(onStatus).not.toHaveBeenCalledWith("camera-1", "live");
  });
  it("uses the HTTPS snapshot when local RTSP awaits its bridge", async () => {
    const onStatus = vi.fn();
    const view = render(<SecurityCameraTile cam={{ ...cam, snapshot_url: "https://example.com/snapshot.jpg" }} register={vi.fn()} onStatus={onStatus} />);
    const image = view.container.querySelector("img");
    if (!image) throw new Error("Snapshot not mounted");
    fireEvent.load(image);
    await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith("camera-1", "live"));
    fireEvent.error(image);
    await waitFor(() => expect(onStatus).toHaveBeenLastCalledWith("camera-1", "unavailable"));
  });
  it("cleans up the frame capture when the tile unmounts", () => {
    const register = vi.fn();
    const view = render(<SecurityCameraTile cam={cam} register={register} onStatus={vi.fn()} />);
    view.unmount();
    expect(register).toHaveBeenLastCalledWith("camera-1");
  });
});