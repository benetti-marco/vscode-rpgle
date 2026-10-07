import setupParser from "../parserSetup";
import { test, expect } from "vitest";
import { assertCache, assertFound } from "../utils";
import tables from "../tables";
import { dspffdToRecordFormats } from "../../extension/server/src/data";

test("concurrent_table_fetch", async () => {
  const parser = setupParser();

  // A slow fetch, like a real one going to the server, so both parses ask for the table while it is loading
  let fetches = 0;
  parser.setTableFetch(async (table: string, aliases = false) => {
    fetches++;
    await new Promise(resolve => setTimeout(resolve, 50));
    return dspffdToRecordFormats(tables[table.toUpperCase()] || [], aliases);
  });

  const lines = [
    `**free`,
    ``,
    `dcl-f employee disk usage(*input);`,
    ``,
    `return;`
  ].join(`\n`);

  const [first, second] = await Promise.all([
    parser.getDocs(`first.rpgle`, lines, { withIncludes: true, ignoreCache: true }),
    parser.getDocs(`second.rpgle`, lines, { withIncludes: true, ignoreCache: true })
  ]);

  expect(fetches).toBe(1);

  for (const cache of [first, second]) {
    const fileDef = assertFound(assertCache(cache).find(`employee`), `employee`);
    expect(fileDef.subItems.length).toBe(1);
    expect(fileDef.subItems[0].subItems.length).toBe(14);
  }
});
