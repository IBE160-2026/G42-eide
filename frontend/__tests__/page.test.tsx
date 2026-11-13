import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "../app/page";
import RootLayout, { metadata } from "../app/layout";

test("renders the header with the h1 and the decorative logo", () => {
  render(<Home />);
  const header = screen.getByRole("banner");
  const heading = within(header).getByRole("heading", { level: 1 });
  expect(heading.textContent).toBe("AI Study Buddy");
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

  const svg = header.querySelector("svg");
  expect(svg).not.toBeNull();
  expect(svg?.getAttribute("aria-hidden")).toBe("true");
  expect(svg?.getAttribute("focusable")).toBe("false");
  expect(svg?.querySelector("path")?.getAttribute("stroke")).toBe("currentColor");
});

test("renders main with the two named regions in order", () => {
  render(<Home />);
  const main = screen.getByRole("main");
  const regions = within(main).getAllByRole("region");
  expect(regions.map((r) => r.getAttribute("aria-label"))).toEqual([
    "Opplasting og innstillinger",
    "Resultater",
  ]);
  regions.forEach((r) => expect(r.tagName).toBe("SECTION"));
});

test("renders exactly one empty, visually hidden status region", () => {
  render(<Home />);
  const regions = screen.getAllByRole("status");
  expect(regions).toHaveLength(1);
  const region = regions[0];
  expect(region.tagName).toBe("DIV");
  expect(region.getAttribute("aria-live")).toBe("polite");
  expect(region.getAttribute("aria-atomic")).toBe("true");
  expect(region.className).toContain("sr-only");
  expect(region.textContent).toBe("");
});

test("the shell carries the classes the CSS targets", () => {
  render(<Home />);
  const header = screen.getByRole("banner");
  expect(header.classList.contains("app-header")).toBe(true);
  expect(screen.getByRole("heading", { level: 1 }).classList.contains("app-header__title")).toBe(true);
  expect(header.querySelector("svg")?.classList.contains("app-header__logo")).toBe(true);
  expect(screen.getByRole("main").classList.contains("page")).toBe(true);
});

test("root layout sets lang nb and the title", () => {
  const element = RootLayout({ children: null } as Parameters<typeof RootLayout>[0]);
  expect(element.type).toBe("html");
  expect((element.props as { lang: string }).lang).toBe("nb");
  expect(metadata.title).toBe("AI Study Buddy");
  expect(metadata.description).toBeUndefined();
});
