import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

vi.mock("../global.jsx", () => {
  const socket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
  };

  return {
    api: "http://localhost/",
    socket,
    getCookie: vi.fn(() => null),
  };
});

vi.mock("../Chat.jsx", () => ({ default: () => <div>Chat</div> }));
vi.mock("../Timer.jsx", () => ({ default: () => <div>Timer</div> }));
vi.mock("../Waiting.jsx", () => ({ default: ({ topText, bottomText }) => (
  <div>{topText} {bottomText}</div>
) }));
vi.mock("../DebugPanel.jsx", () => ({ default: () => <div>Debug</div> }));

vi.mock("../Utility.jsx", () => {
  return {
    loginUser: vi.fn(),
    postUser: vi.fn(),
    fetchCurrentStory: vi.fn(),
    fetchGameStories: vi.fn(),
    fetchVotingSession: vi.fn(),
    fetchScores: vi.fn(),
    fetchResults: vi.fn(),
  };
});
import { socket } from "../global.jsx";
import * as Utility from "../Utility.jsx";

import Lobby from "../Lobby";
import LoginPage from "../Login";
import SignUpPage from "../SignUp";
import StorytellingPage from "../StoryTelling";
import VotingPage from "../Voting";
import ScoreboardPage from "../Scoreboard";
import ResultsPage from "../results";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() =>
    Promise.resolve({ json: async () => ({ username: "Player", user_id: "user-1" }) })
  ));
});

describe("Frontend page components", () => {
  test("Lobby page renders create/join sections and shows how-to modal", async () => {
    const setUsername = vi.fn();

    render(
      <MemoryRouter>
        <Lobby username="testuser" setUsername={setUsername} currentUserId={null} isAuthenticated={false} />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /Create Game/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Join Game/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /How to Play/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /How to Play/i }));
    expect(await screen.findByRole("heading", { name: /How to Play/i })).toBeInTheDocument();
  });

  test("Login page enables submit when fields are filled and calls onSuccess", async () => {
    const loginResult = { ok: true, username: "testuser", user_id: "1", authenticated: true };
    Utility.loginUser.mockResolvedValueOnce(loginResult);
    const onSuccess = vi.fn();

    render(<LoginPage onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Username:/i), { target: { value: "testuser" } });
    fireEvent.change(screen.getByLabelText(/Password:/i), { target: { value: "password" } });

    const button = screen.getByRole("button", { name: /Login/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(loginResult));
  });

  test("SignUp page toggles submit disabled until valid password confirmation", async () => {
    const signupResult = { ok: true, username: "newuser", user_id: "2", authenticated: true };
    Utility.postUser.mockResolvedValueOnce(signupResult);
    const onSuccess = vi.fn();

    render(<SignUpPage onSuccess={onSuccess} />);

    const submitButton = screen.getByRole("button", { name: /Submit/i });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Choose a username:/i), { target: { value: "newuser" } });
    fireEvent.change(screen.getByLabelText(/Choose a password:/i), { target: { value: "secret" } });
    fireEvent.change(screen.getByLabelText(/Re-enter password:/i), { target: { value: "secret" } });

    expect(submitButton).toBeEnabled();

    fireEvent.click(submitButton);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(signupResult));
  });

  test("Storytelling page renders prompt after loading current story", async () => {
    const storyData = {
      ok: true,
      game_id: "game-1",
      story_id: "story-1",
      inner_round_number: 1,
      outer_round_number: 1,
      max_round: 3,
      user_id: "user-1",
      parent_story_last_part: "Once upon a test",
    };
    Utility.fetchCurrentStory.mockResolvedValueOnce(storyData);

    render(
      <MemoryRouter initialEntries={["/story?game_id=game-1"]}>
        <Routes>
          <Route path="/story" element={<StorytellingPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Write your story/i)).toBeInTheDocument();
    expect(await screen.findByText(/Once upon a test/i)).toBeInTheDocument();
  });

  test("Voting page loads voting session and story cards", async () => {
    Utility.fetchGameStories.mockResolvedValueOnce({ stories: [{ story_id: "s1", story_parts: [{ part_content: "Hello" }] }] });
    Utility.fetchVotingSession.mockResolvedValueOnce({ voting_session_number: 1, num_voting_sessions: 1, cat_1: "Cat One", cat_2: "Cat Two", timer_ends_at: new Date(Date.now() + 10000).toISOString() });

    render(
      <MemoryRouter initialEntries={["/vote"]}>
        <Routes>
          <Route path="/vote" element={<VotingPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(socket.on).toHaveBeenCalledWith("voting_started", expect.any(Function));
    });

    const votingStartedCallback = socket.on.mock.calls.find((call) => call[0] === "voting_started")?.[1];
    expect(votingStartedCallback).toBeDefined();
    await waitFor(() => {
      votingStartedCallback({ game_id: "game-1" });
    });

    expect(await screen.findByText(/Hello/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Vote/i })).toBeDisabled();
  });

  test("Scoreboard page renders heading and toggle control", async () => {
    render(
      <MemoryRouter>
        <ScoreboardPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Final Scores/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Toggle score breakdown/i })).toBeInTheDocument();

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("http://localhost/session", {
      credentials: "include",
    }));
  });

  test("Results page renders after receiving results_shown event", async () => {
    Utility.fetchVotingSession.mockResolvedValueOnce({ results_end_at: new Date(Date.now() + 10000).toISOString() });
    Utility.fetchGameStories.mockResolvedValueOnce({ stories: [{ story_id: "s1", story_parts: [{ part_content: "Final story" }] }] });
    Utility.fetchResults.mockResolvedValueOnce({ winners: [{ story_id: "s1", is_winner_cont: true, is_winner_cat_1: false, is_winner_cat_2: false }], cat_1: "Cat1", cat_2: "Cat2" });

    render(
      <MemoryRouter>
        <ResultsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(socket.on).toHaveBeenCalledWith("results_shown", expect.any(Function));
    });

    const resultsShownCallback = socket.on.mock.calls.find((call) => call[0] === "results_shown")?.[1];
    expect(resultsShownCallback).toBeDefined();
    await waitFor(() => {
      resultsShownCallback({ game_id: "game-1" });
    });

    expect(await screen.findByText(/Your Results/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue/i })).toBeInTheDocument();
  });
});
