import { afterEach, describe, expect, it, vi } from "vitest";

import { computeBackoffDelay } from "@/lib/syncQueue";

describe("computeBackoffDelay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds jitter to the base delay on the first retry", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const delay = computeBackoffDelay(1);

    expect(delay).toBeCloseTo(1500, 5);
  });

  it("grows exponentially with each attempt", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const thirdAttemptDelay = computeBackoffDelay(3);
    const fourthAttemptDelay = computeBackoffDelay(4);

    expect(thirdAttemptDelay).toBeCloseTo(4000, 5);
    expect(fourthAttemptDelay).toBeCloseTo(8000, 5);
  });

  it("normalises attempts below 1", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const delay = computeBackoffDelay(0);

    expect(delay).toBeCloseTo(1000, 5);
  });

  it("caps the backoff at the configured maximum", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);

    const delay = computeBackoffDelay(10);

    expect(delay).toBe(300000);
  });
});
