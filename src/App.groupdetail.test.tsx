import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { rpcMock, fromMock } = vi.hoisted(() => {
  const membersData = [
    { id: "member-1", group_id: "group-1", user_id: "user-1", display_name: null, role: "admin", joined_at: "t", profile: { name: "You" } },
    { id: "member-2", group_id: "group-1", user_id: null, display_name: "Priya", role: "member", joined_at: "t", profile: null },
  ];
  const expensesData = [
    {
      id: "exp-1",
      group_id: "group-1",
      description: "Dinner",
      amount_paise: 150000,
      created_at: "t",
      paid_by_member: { display_name: null, profile: { name: "You" } },
      splits: [{ count: 2 }],
    },
  ];
  const groupsData = [{ id: "group-1", name: "Goa trip", created_by: "user-1", created_at: "t", deleted_at: null, member_count: [{ count: 2 }] }];

  const rpcMock = vi.fn(async () => ({ data: { id: "new-id" }, error: null }));

  const fromMock = vi.fn((table: string) => ({
    select: () => ({
      is: () => ({
        order: async () => {
          if (table === "groups") return { data: groupsData, error: null };
          throw new Error(`unexpected is().order() on ${table}`);
        },
        eq: () => ({
          order: async () => {
            if (table === "group_members") return { data: membersData, error: null };
            if (table === "expenses") return { data: expensesData, error: null };
            throw new Error(`unexpected query on ${table}`);
          },
        }),
      }),
      eq: () => ({
        is: () => ({
          order: async () => {
            if (table === "group_members") return { data: membersData, error: null };
            if (table === "expenses") return { data: expensesData, error: null };
            throw new Error(`unexpected query on ${table}`);
          },
        }),
      }),
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

describe("Group detail", () => {
  it("navigates into a group and shows members + expenses with no crash", async () => {
    renderApp();
    await waitFor(() => screen.getByText("Goa trip"));
    await userEvent.click(screen.getByText("Goa trip"));

    await waitFor(() => expect(screen.getByText("Priya")).toBeTruthy());
    expect(screen.getByText("You")).toBeTruthy();
    expect(screen.getByText(/no account/)).toBeTruthy();

    await waitFor(() => expect(screen.getByText("Dinner")).toBeTruthy());
    expect(screen.getByText("₹1,500.00")).toBeTruthy();
  });

  it("opens the add-expense sheet with member chips populated", async () => {
    renderApp();
    await waitFor(() => screen.getByText("Goa trip"));
    await userEvent.click(screen.getByText("Goa trip"));
    await waitFor(() => screen.getByText("+ Add expense"));
    await userEvent.click(screen.getByText("+ Add expense"));

    expect(screen.getByPlaceholderText("e.g. Dinner, Hotel booking")).toBeTruthy();
    // "You" and "Priya" each appear as a chip in both Paid-by and Split-with
    expect(screen.getAllByText("Priya").length).toBeGreaterThanOrEqual(2);
  });
});
