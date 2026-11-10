import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "../app/page";

test("renders the home page", () => {
  render(<Home />);
  expect(screen.getByRole("main")).toBeDefined();
});
