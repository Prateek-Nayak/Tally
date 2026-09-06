import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { rpcMock, fromMock } = vi.hoisted(() => {
  const membersData = [
    { id: "member-1", group_id: "group-1", user_id: "user-1", display_name: null, role: "admin", joined_at: "t", profile: { name: "You" } },
    { id: "member-2", group_id: "group-1", user_id: null, display_name: "Priya", role: "member", joined_at: "t", profile: null },
  ];
  const groupsData = [{ id: "group-1", name: "Goa trip", created_by: "user-1", created_at: "t", deleted_at: null, member_count: [{ count: 2 }] }];
  const balancesData = [
    { member_id: "member-1", balance_paise: 50000 },
    { member_id: "member-2", balance_paise: -50000 },
  ];

  const rpcMock = vi.fn(async (fn: string) => {
    if (fn === "get_group_balances") return { data: balancesData, error: null };
    if (fn === "remove_member") return { data: { id: "member-2" }, error: null };
    return { data: null, error: null };
  });

  const fromMock = vi.fn((table: string) => ({
    select: () => ({
      is: () => ({
        order: async () => (table === "groups" ? { data: groupsData, error: null } : { data: [], error: null }),
        eq: () => ({ order: async () => ({ data: [], error: null }) }),
      }),
      eq: () => ({
        is: () => ({
          order: async () => {
            if (table === "group_members") return { data: membersData, error: null };
            return { data: [], error: null };
          },
        }),
        order: async () => ({ data: [], error: null }),
      }),
      order: async () => ({ data: [], error: null }),
    }),
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

describe("Balances and removal", () => {
  it("shows each member's balance and disables Remove while unsettled", async () => {
    renderApp();
    await waitFor(() => screen.getByText("Goa trip"));
    await userEvent.click(screen.getByText("Goa trip"));

    await waitFor(() => expect(screen.getByText(/gets back/)).toBeTruthy());
    expect(screen.getByText(/owes ₹500\.00/)).toBeTruthy();

    const removeButtons = screen.getAllByText("Remove") as HTMLButtonElement[];
    // Both members have a non-zero balance, so neither can be removed yet.
    for (const btn of removeButtons) {
      expect(btn.disabled).toBe(true);
    }
  });
});

describe("Balances query failure - fail closed, not open", () => {
  it("keeps Remove disabled when the balance can't be verified at all", async () => {
    // This is the exact bug found in production: an unknown balance
    // (query failed) was being treated as "settled", which let Remove
    // become clickable when it should stay blocked until proven safe.
    rpcMock.mockImplementationOnce((async (fn: string) => {
      if (fn === "get_group_balances")
        return { data: null, error: { message: "structure of query does not match function result type" } };
      return { data: null, error: null };
    }) as typeof rpcMock);

    renderApp();
    await waitFor(() => screen.getByText("Goa trip"));
    await userEvent.click(screen.getByText("Goa trip"));

    await waitFor(() => expect(screen.getByText(/Couldn't check balances/)).toBeTruthy());
    const removeButtons = screen.getAllByText("Remove") as HTMLButtonElement[];
    for (const btn of removeButtons) {
      expect(btn.disabled).toBe(true);
    }
  });
});
