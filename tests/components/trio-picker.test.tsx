import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  TRIO_MONTHS,
  type TrioDate,
  TrioPicker,
  trioClampDay,
  trioDaysInMonth,
  trioYears,
} from "@/components/ui/trio-picker";

const EMPTY: TrioDate = { day: null, month: null, year: null };

// Radix Select drives its open state through pointer capture and scroll
// helpers that jsdom does not implement. Stub the missing pieces so the
// interaction tests exercise the real open plus pick path.
if (typeof Element !== "undefined") {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
}

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: () => ({
      matches,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe("trio helpers (covers: AC-8)", () => {
  it("counts February days with leap years", () => {
    expect(trioDaysInMonth(2024, 2)).toBe(29);
    expect(trioDaysInMonth(2023, 2)).toBe(28);
    expect(trioDaysInMonth(2023, 1)).toBe(31);
    expect(trioDaysInMonth(2023, 4)).toBe(30);
    expect(trioDaysInMonth(null, null)).toBe(31);
  });

  it("clamps an impossible day to the month length", () => {
    expect(trioClampDay({ day: 31, month: 2, year: 2023 })).toEqual({
      day: 28,
      month: 2,
      year: 2023,
    });
    expect(trioClampDay({ day: 29, month: 2, year: 2024 })).toEqual({
      day: 29,
      month: 2,
      year: 2024,
    });
    expect(trioClampDay({ day: 15, month: 2, year: 2023 })).toEqual({
      day: 15,
      month: 2,
      year: 2023,
    });
    expect(trioClampDay(EMPTY)).toEqual(EMPTY);
  });

  it("lists one hundred years descending by default", () => {
    const years = trioYears(2026);
    expect(years).toHaveLength(100);
    expect(years[0]).toBe(2026);
    expect(years[99]).toBe(1927);
  });

  it("names twelve short months", () => {
    expect(TRIO_MONTHS).toHaveLength(12);
    expect(TRIO_MONTHS[0]).toBe("Jan");
    expect(TRIO_MONTHS[11]).toBe("Dec");
  });
});

describe("TrioPicker (covers: AC-8)", () => {
  it("renders three labelled selects with placeholders", () => {
    mockMatchMedia(false);
    render(
      <TrioPicker
        value={EMPTY}
        onChange={() => {}}
        helper="We use this to shape your study plan."
      />,
    );

    expect(screen.getByText("Birth date")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Day" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Month" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Year" })).toBeInTheDocument();
    expect(
      screen.getByText("We use this to shape your study plan."),
    ).toBeInTheDocument();
  });

  it("marks the selects invalid and announces the error", () => {
    mockMatchMedia(false);
    render(
      <TrioPicker
        value={EMPTY}
        onChange={() => {}}
        error="Pick a full date to continue."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Pick a full date to continue.",
    );
    expect(screen.getByRole("combobox", { name: "Day" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("picks a day through the select and reports it", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TrioPicker value={EMPTY} onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: "Day" }));
    await user.click(screen.getByRole("option", { name: "15" }));

    expect(onChange).toHaveBeenCalledWith({
      day: 15,
      month: null,
      year: null,
    });
  });

  it("disables impossible days once month and year are known", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(
      <TrioPicker
        value={{ day: null, month: 2, year: 2023 }}
        onChange={() => {}}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Day" }));
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByRole("option", { name: "30" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("clamps the day when the month shortens it", async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TrioPicker
        value={{ day: 31, month: 1, year: 2023 }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Month" }));
    await user.click(screen.getByRole("option", { name: "Feb" }));

    expect(onChange).toHaveBeenCalledWith({
      day: 28,
      month: 2,
      year: 2023,
    });
  });

  it("falls back to a native date input on a small touch screen", async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TrioPicker value={EMPTY} onChange={onChange} />);

    const input = screen.getByLabelText("Birth date");
    expect(input).toHaveAttribute("type", "date");

    await user.click(input);
    await input.focus();
    expect(input).toBeInTheDocument();
  });
});
