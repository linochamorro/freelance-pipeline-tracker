import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = path.join(directory, entry);
    return statSync(entryPath).isDirectory()
      ? listSourceFiles(entryPath)
      : /\.(css|tsx?)$/.test(entryPath)
        ? [entryPath]
        : [];
  });
}

describe("fixed light color scheme", () => {
  it("declares a light browser color scheme", () => {
    const styles = readFileSync(path.join(projectRoot, "src/app/globals.css"), "utf8");

    expect(styles).toMatch(/color-scheme:\s*light\s*;/);
    expect(styles).not.toMatch(/color-scheme:\s*light\s+dark/);
  });

  it("does not define dark-mode variants in app routes or components", () => {
    const sourceFiles = [
      ...listSourceFiles(path.join(projectRoot, "src/app")),
      ...listSourceFiles(path.join(projectRoot, "src/components")),
    ];
    const darkVariants = sourceFiles.flatMap((file) => {
      const contents = readFileSync(file, "utf8");
      return /\bdark:/.test(contents) ? [path.relative(projectRoot, file)] : [];
    });

    expect(darkVariants).toEqual([]);
  });
});
