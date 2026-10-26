// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { WebSiteSchema } from "@/components/seo/WebSiteSchema";

/**
 * The two JSON-LD blocks, from spec 0021 AC-6. What matters to a crawler is
 * that exactly one parseable block of each type lands in the document, and
 * that the block carries the fields a rich result reads.
 */
function schemasIn(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll('script[type="application/ld+json"]'),
  ).map((node) => JSON.parse(node.textContent ?? "null"));
}

describe("the Organization block (AC-6)", () => {
  it("renders one parseable block of type Organization", () => {
    const { container } = render(<OrganizationSchema />);
    const schemas = schemasIn(container);

    expect(schemas).toHaveLength(1);
    expect(schemas[0]["@type"]).toBe("Organization");
  });

  it("names TiCLearn and links its own site", () => {
    const { container } = render(<OrganizationSchema />);
    const [schema] = schemasIn(container);

    expect(schema.name).toBe("TiCLearn");
    expect(schema.url).toBe("https://ticlearn.ticsummit.org");
    expect(schema["@context"]).toBe("https://schema.org");
  });
});

describe("the WebSite block (AC-6)", () => {
  it("renders one parseable block of type WebSite", () => {
    const { container } = render(<WebSiteSchema />);
    const schemas = schemasIn(container);

    expect(schemas).toHaveLength(1);
    expect(schemas[0]["@type"]).toBe("WebSite");
  });

  it("points at the one host", () => {
    const { container } = render(<WebSiteSchema />);
    const [schema] = schemasIn(container);

    expect(schema.url).toBe("https://ticlearn.ticsummit.org");
  });
});
