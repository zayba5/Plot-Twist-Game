import { render, screen } from "@testing-library/react";
import App from "../App";
import { test, expect } from "vitest";

test("renders the app shell", () => {
  render(<App />);
  expect(screen.getByText(/Plot Twist/i)).toBeInTheDocument();
});