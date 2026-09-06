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
  const expensesListData = [
    {
      id: "exp-1",
      group_id: "group-1",
      description: "Dinner",
      amount_paise: 100000,
      created_at: "t",
      paid_by_member: { display_name: null, profile: { name: "You" } },
      splits: [{ count: 2 }],
    },
  ];
  const expenseDetailData = {
    id: "exp-1",
    group_id: "group-1",
    description: "Dinner",
    amount_paise: 100000,
    paid_by: "member-1",
    created_by: "user-1", // created by "You" -> canEdit should be true
    created_at: "t",
    expense_splits: [
      { member_id: "member-1", share_paise: 50000, member: { display_name: null, profile: { name: "You" } } },
      { member_id: "member-2", share_paise: 50000, member: { display_name: "Priya", profile: null } },
    ],
  };
  const balancesData = [
    { member_id: "member-1", balance_paise: 50000 },
    { member_id: "member-2", balance_paise: -50000 },
  ];

  const rpcMock = vi.fn(async (fn: string) => {
    if (fn === "get_group_balances") return { data: balancesData, error: null };
    if (fn === "delete_expense") return { data: { id: "exp-1" }, error: null };
    if (fn === "update_expense") return { data: { id: "exp-1" }, error: null };
    return { data: null, error: null };
  });

  const fromMock = vi.fn((table: string) => ({
    select: () => ({
      is: () => ({
        order: async () => (table === "groups" ? { data: groupsData, error: null } : { data: [], error: null }),
      }),
      eq: (_col: string, val: string) => ({
        is: () => ({
          order: async () => {
            if (table === "group_members") return { data: membersData, error: null };
            if (table === "expenses") return { data: expensesListData, error: null };
            return { data: [], error: null };
          },
        }),
        single: async () => {
          if (table === "expenses" && val === "exp-1") return { data: expenseDetailData, error: null };
          return { data: null, error: { message: "not found" } };
        },
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

describe("Expense detail, edit, delete", () => {
  it("opens an expense, shows the split, edits it, and deletes it", async () => {
    renderApp();
    await waitFor(() => screen.getByText("Goa trip"));
    await userEvent.click(screen.getByText("Goa trip"));

    await waitFor(() => screen.getByText("Dinner"));
    await userEvent.click(screen.getByText("Dinner"));

    // Detail view: split breakdown visible, Edit/Delete available (creator)
    await waitFor(() => expect(screen.getAllByText("Priya").length).toBeGreaterThan(0));
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();

    await userEvent.click(screen.getByText("Edit"));
    const descInput = screen.getByDisplayValue("Dinner") as HTMLInputElement;
    await userEvent.clear(descInput);
    await userEvent.type(descInput, "Dinner (updated)");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith(
        "update_expense",
        expect.objectContaining({ p_expense_id: "exp-1", p_description: "Dinner (updated)" }),
      ),
    );

    // Back on the detail view after save; now delete it.
    await waitFor(() => screen.getByText("Delete"));
    await userEvent.click(screen.getByText("Delete"));
    await waitFor(() => screen.getByText(/Delete this expense\?/));
    await userEvent.click(screen.getByText("Yes, delete"));

    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith("delete_expense", expect.objectContaining({ p_expense_id: "exp-1" })),
    );
  });
});
