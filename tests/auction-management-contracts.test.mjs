import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(join(root, path), "utf8");

const routeFiles = [
  "app/(management)/admin/leiloes/page.tsx",
  "app/(management)/admin/leiloes/novo/page.tsx",
  "app/(management)/admin/leiloes/[id]/page.tsx",
  "app/(management)/admin/leiloes/[id]/broadcast/page.tsx",
  "app/(management)/admin/leiloes/[id]/relatorio/page.tsx",
];
for (const route of routeFiles) await read(route);

const session = await read("lib/auth/server/session.ts");
assert.match(session, /httpOnly: true/);
assert.match(session, /refreshSession/);
assert.match(session, /destroySession/);

const access = await read("lib/permissions/server/auction-access.ts");
assert.match(access, /PERMISSION_MODULE_KEYS\.AUCTIONS/);
assert.match(access, /redirect\("\/acesso-negado"\)/);
assert.match(access, /AUCTION_MANAGEMENT_ROLES/);

const capabilities = await read("components/Management/capabilities.ts");
for (const key of ["AUCTIONS_VIEW", "AUCTIONS_MANAGE_STATUS", "AUCTIONS_MANAGE_LOTS", "AUCTIONS_MANAGE_BIDS"]) {
  assert.match(capabilities, new RegExp(key));
}

const broadcast = await read("hooks/actions/broadcastActions.ts");
assert.match(broadcast, /getFreshSession/);
assert.match(await read("hooks/actions/broadcastActions.ts"), /broadcast:read/);

const managementShell = await read("components/Management/AuctionManagementShell.tsx");
assert.match(managementShell, /logoutAuctionAction/);
assert.doesNotMatch(managementShell, /localStorage/);

const broadcastPanel = await read("components/Broadcast/broadcast-control-panel.tsx");
assert.match(broadcastPanel, /canManageBroadcast/);

console.log("auction-management-contracts: ok");
