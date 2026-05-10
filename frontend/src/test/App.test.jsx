import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import App from "../App";

vi.mock("../Lobby", () => ({
  default: () => <div>Lobby page</div>,
}));
vi.mock("../Login", () => ({
  default: () => <div>Login page</div>,
}));
vi.mock("../SignUp", () => ({
  default: () => <div>SignUp page</div>,
}));
vi.mock("../StoryTelling", () => ({
  default: () => <div>Story page</div>,
}));
vi.mock("../Voting", () => ({
  default: () => <div>Voting page</div>,
}));
vi.mock("../Scoreboard", () => ({
  default: () => <div>Scoreboard page</div>,
}));
vi.mock("../results", () => ({
  default: () => <div>Results page</div>,
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("App", () => {
  test("shows a loading state while the session initializes", () => {
    const pendingFetch = new Promise(() => {});
    fetch.mockReturnValue(pendingFetch);

    render(<App />);

    expect(screen.getByText(/Starting session/i)).toBeInTheDocument();
  });

  test("renders the app shell and login button when session is not authenticated", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: "", authenticated: false, user_id: null }),
    });

    render(<App />);

    expect(await screen.findByText(/Plot Twist/i)).toBeInTheDocument();
    expect(await screen.findByText(/Lobby page/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  test("renders the username and logout button when session is authenticated", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: "TestUser", authenticated: true, user_id: 123 }),
    });

    render(<App />);

    expect(await screen.findByText(/Plot Twist/i)).toBeInTheDocument();
    expect(screen.getByText("TestUser")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });
});