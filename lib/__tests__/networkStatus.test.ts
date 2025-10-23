import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetNetworkStatusForTesting,
  getFailureCount,
  getNetworkStatus,
  logFailure,
  onNetworkStatusChange,
  resetFailureCount,
  restoreFromDegraded,
  waitForOnline,
} from "@/lib/networkStatus";
import { SyncConnectionStatus } from "@/types/sync";

describe("networkStatus", () => {
  beforeEach(() => {
    __resetNetworkStatusForTesting();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetNetworkStatusForTesting();
  });

  it("transitions to degraded after consecutive failures", () => {
    expect(getNetworkStatus()).toBe(SyncConnectionStatus.Online);

    logFailure();
    logFailure();

    expect(getNetworkStatus()).toBe(SyncConnectionStatus.Online);

    logFailure();

    expect(getNetworkStatus()).toBe(SyncConnectionStatus.Degraded);
    expect(getFailureCount()).toBe(3);
  });

  it("restores from degraded state after reset", () => {
    logFailure();
    logFailure();
    logFailure();

    expect(getNetworkStatus()).toBe(SyncConnectionStatus.Degraded);

    resetFailureCount();
    expect(getFailureCount()).toBe(0);

    restoreFromDegraded();

    expect(getNetworkStatus()).toBe(SyncConnectionStatus.Online);
  });

  it("notifies listeners when browser connectivity changes", () => {
    const statuses: Array<SyncConnectionStatus> = [];

    const unsubscribe = onNetworkStatusChange((status) => {
      statuses.push(status);
    });

    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));

    unsubscribe();

    expect(statuses.length).toBeGreaterThanOrEqual(3);
    expect(statuses[0]).toBe(SyncConnectionStatus.Online);
    expect(statuses).toContain(SyncConnectionStatus.Offline);
    expect(statuses[statuses.length - 1]).toBe(SyncConnectionStatus.Online);
  });

  it("waits for connectivity to return", async () => {
    window.dispatchEvent(new Event("offline"));

    const waitPromise = waitForOnline(1000);

    setTimeout(() => {
      window.dispatchEvent(new Event("online"));
    }, 0);

    await expect(waitPromise).resolves.toBe(true);
  });

  it("times out when connectivity does not return", async () => {
    window.dispatchEvent(new Event("offline"));
    vi.useFakeTimers();

    const waitPromise = waitForOnline(50);

    vi.advanceTimersByTime(75);

    await expect(waitPromise).resolves.toBe(false);
  });
});
