import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { rpcMock, fromMock } = vi.hoisted(() => {
  const membersData = [
    { id: "member-1", group_id: "group-1", user_id: "user-1", display_name: null, role: "admin", joined_at: "t", profile: { name: "You" } },
    { id: "member-2", group_id: "group-1", user_id: null, display_name: "Priya", role: "member", joined_at: "t", profile: null },
  ];
  const groupsData = [{ id: "group-1", name: "Flat 4B", created_by: "user-1", created_at: "t", deleted_at: null, member_count: [{ count: 2 }] }];
  // Both settled - zero balance, removal should be allowed.
  const balancesData = [
    { member_id: "member-1", balance_paise: 0 },
    { member_id: "member-2", balance_paise: 0 },
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

describe("Removing a settled member", () => {
  it("shows 'settled up' and allows removal when balance is zero", async () => {
    renderApp();
    await waitFor(() => screen.getByText("Flat 4B"));
    await userEvent.click(screen.getByText("Flat 4B"));

    await waitFor(() => expect(screen.getAllByText("settled up").length).toBe(2));

    const removeButtons = screen.getAllByText("Remove") as HTMLButtonElement[];
    for (const btn of removeButtons) {
      expect(btn.disabled).toBe(false);
    }

    await userEvent.click(removeButtons[1]); // Priya
    await waitFor(() => screen.getByText(/Remove Priya from this group\?/));
    await userEvent.click(screen.getByText("Yes, remove"));

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith(
        "remove_member",
        expect.objectContaining({ p_group_id: "group-1", p_member_id: "member-2" }),
      ),
    );
  });
});
