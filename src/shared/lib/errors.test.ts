import { describe, it, expect } from "vitest";
import { getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
  it("extracts message from a real Error instance", () => {
    expect(getErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("extracts message from a Supabase-shaped PostgrestError (plain object, not an Error instance)", () => {
    // This is the actual shape that broke every catch block in the app:
    // it has a .message but fails `instanceof Error`.
    const postgrestError = { message: "No Tally account found for that email yet.", code: "P0001" };
    expect(getErrorMessage(postgrestError, "fallback")).toBe("No Tally account found for that email yet.");
  });

  it("falls back when there is no usable message", () => {
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
    expect(getErrorMessage(undefined, "fallback")).toBe("fallback");
    expect(getErrorMessage("a plain string", "fallback")).toBe("fallback");
    expect(getErrorMessage({ message: 42 }, "fallback")).toBe("fallback");
    expect(getErrorMessage({}, "fallback")).toBe("fallback");
  });
});
