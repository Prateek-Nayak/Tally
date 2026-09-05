import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { rpcMock, fromMock } = vi.hoisted(() => {
  const rpcMock = vi.fn(async (fn: string) => {
    if (fn === "preview_invite_link") return { data: { group_name: "Flat 4B" }, error: null };
    if (fn === "join_group_via_link") return { data: { group_id: "group-9" }, error: null };
    if (fn === "respond_to_invite") return { data: { accepted: true }, error: null };
    return { data: null, error: null };
  });

  const emptyTail = () => ({
    is: () => ({ order: async () => ({ data: [], error: null }) }),
    eq: () => ({ order: async () => ({ data: [], error: null }) }),
    order: async () => ({ data: [], error: null }),
  });

  const pendingInvite = {
    id: "invite-1",
    group_id: "group-9",
    group_name: "Flat 4B",
    invited_by: "someone",
    status: "pending",
    created_at: "t",
  };

  const fromMock = vi.fn((table: string) => ({
    select: () => {
      if (table === "group_invites") {
        return { eq: () => ({ order: async () => ({ data: [pendingInvite], error: null }) }) };
      }
      if (table === "groups") {
        return { is: () => ({ order: async () => ({ data: [], error: null }) }) };
      }
      return emptyTail();
    },
  }));

  return { rpcMock, fromMock };
});

vi.mock("./lib/api/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "user-1" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
    from: fromMock,
    rpc: rpcMock,
  },
}));

import App from "./App";

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe("Pending invites", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    sessionStorage.clear();
  });

  it("shows a pending invite and accepts it", async () => {
    renderApp();
    await waitFor(() => expect(screen.getByText("Flat 4B")).toBeTruthy());
    await userEvent.click(screen.getByText("Accept"));
    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith(
        "respond_to_invite",
        expect.objectContaining({ p_invite_id: "invite-1", p_accept: true }),
      ),
    );
  });
});

describe("Join via link", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/?invite=abc123");
    sessionStorage.clear();
  });

  it("previews the group and joins on confirm", async () => {
    renderApp();
    await waitFor(() => expect(screen.getByText(/You've been invited to join/)).toBeTruthy());
    expect(screen.getByText("Flat 4B")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /Join Flat 4B/ }));

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith(
        "join_group_via_link",
        expect.objectContaining({ p_code: "abc123" }),
      ),
    );
    // Navigated into the group - the join screen is gone, GroupDetail's
    // header (using the name passed through from the preview) is up.
    await waitFor(() => expect(screen.queryByText(/You've been invited/)).toBeNull());
  });
});
