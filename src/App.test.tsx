import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./lib/api/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ error: null }),
      signUp: async () => ({ error: null }),
    },
  },
}));

import App from "./App";

describe("App cold start", () => {
  it("renders the sign-in screen with no crash", async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy());
    expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy();
  });

  it("switches to signup mode and shows the name field", async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => screen.getByText("Create one"));
    await user.click(screen.getByText("Create one"));
    expect(screen.getByPlaceholderText("How you'll appear in your groups")).toBeTruthy();
  });

  it("switches to forgot-password mode", async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => screen.getByText("Forgot password?"));
    await user.click(screen.getByText("Forgot password?"));
    expect(screen.getByText("Send reset link")).toBeTruthy();
  });
});
