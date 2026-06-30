import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders with default size", () => {
    const { container } = render(<Spinner />);
    const div = container.firstChild as HTMLElement;
    expect(div).toBeInTheDocument();
    expect(div.style.width).toBe("20px");
  });

  it("renders with custom size", () => {
    const { container } = render(<Spinner size={32} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("32px");
    expect(div.style.height).toBe("32px");
  });
});
