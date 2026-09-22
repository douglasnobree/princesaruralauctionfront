import assert from "node:assert/strict";
import test from "node:test";
import { parseManagementAmount } from "../lib/auctions/management-input.ts";

test("assisted amounts preserve cents in Brazilian and decimal notation", () => {
  for (const [value, expected] of [["1.234,56", "123456"], ["1234.56", "123456"], ["1.234", "123400"], ["100,5", "10050"], ["0,01", "1"]]) assert.equal(parseManagementAmount(value), expected);
});
test("invalid or unsafe amounts cannot silently become valid bids", () => {
  for (const value of ["", "-10", "0", "1,234", "1.2.3", "abc10", "10e3", "1,2,3", "99999999999999999"]) assert.equal(parseManagementAmount(value), null, value);
});
