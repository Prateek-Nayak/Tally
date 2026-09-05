import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { rpcMock, fromSelectMock } = vi.hoisted(() => {
  const rpcMock = vi.fn(async () => ({
    data: { id: "group-1", name: "Goa trip", created_by: "user-1", created_at: "2026-01-01", deleted_at: null },
    error: null,
  }));
  const fromSelectMock = vi.fn(() => ({
    is: () => ({
      order: async () => ({
        data: [
          {
            id: "group-1",
            name: "Goa trip",
            created_by: "user-1",
            created_at: "2026-01-01",
            deleted_at: null,
            member_count: [{ count: 3 }],
          },
        ],
        error: null,
      }),
    }),
  }));
  return { rpcMock, fromSelectMock };
});

const fakeSession = {
  access_token: "token",
  user: { id: "user-1", email: "test@example.com" },
};

vi.mock("./lib/api/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: fakeSession } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({ select: fromSelectMock }),
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

describe("Signed-in app", () => {
  it("renders the groups list with no crash", async () => {
    renderApp();
    await waitFor(() => expect(screen.getByText("Goa trip")).toBeTruthy());
    expect(screen.getByText("3 people")).toBeTruthy();
    expect(screen.getByText("Sign out")).toBeTruthy();
  });

  it("opens the new-group sheet and creates a group", async () => {
    const user = userEvent.setup();
    renderApp();
    await waitFor(() => screen.getByText("+ New group"));
    await user.click(screen.getByText("+ New group"));
    expect(screen.getByPlaceholderText("e.g. Goa trip, Flat 4B")).toBeTruthy();

    await user.type(screen.getByPlaceholderText("e.g. Goa trip, Flat 4B"), "Flat 4B");
    await user.click(screen.getByRole("button", { name: "Create group" }));

    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith("create_group", expect.objectContaining({ p_name: "Flat 4B" })));
  });
});
