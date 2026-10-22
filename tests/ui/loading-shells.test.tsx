import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardLoading from "@/app/(dashboard)/dashboard/loading";
import { RootFallback } from "@/components/layout/RootFallback";

describe("loading shells", () => {
  it("renders the dashboard loading shape without a spinner", () => {
    const { container } = render(<DashboardLoading />);

    expect(
      container.querySelector("[data-slot='dashboard-loading']"),
    ).not.toBeNull();
    expect(
      container.querySelectorAll("[data-slot='skeleton']").length,
    ).toBeGreaterThan(0);
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  it("renders a branded neutral fallback with decorative skeletons", () => {
    const { container } = render(<RootFallback />);

    expect(screen.getByAltText("TiCLearn")).toBeInTheDocument();
    expect(screen.getByText("TiCLearn")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-slot='skeleton']").length).toBe(5);
  });
});
