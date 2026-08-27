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

const engineActions = await read("hooks/actions/auctionEngineActions.ts");
assert.match(engineActions, /createQuickParticipantAction/);
assert.match(engineActions, /manager\/participants\/quick/);
assert.match(engineActions, /Idempotency-Key/);

const engineTypes = await read("lib/auctions/engine-types.ts");
assert.match(engineTypes, /participantType: "USER" \| "QUICK"/);
assert.match(engineTypes, /maskedDocument\?: string/);

const operationPanel = await read("components/Management/AuctionOperationPanel.tsx");
assert.match(operationPanel, /Cadastrar participante rápido/);
assert.match(operationPanel, /CPF ou CNPJ/);
assert.match(operationPanel, /Esse cadastro não cria conta/);
assert.match(operationPanel, /Origem do participante/);

const acquisitionSources = await read("lib/auctions/acquisition-sources.ts");
assert.match(acquisitionSources, /utm_source/);
assert.match(acquisitionSources, /FACEBOOK/);
assert.match(acquisitionSources, /REFERRAL/);

const report = await read("app/(management)/admin/leiloes/[id]/relatorio/page.tsx");
assert.match(report, /Origem dos participantes/);
assert.match(report, /Lances recentes/);

const participantsPanel = await read("components/Management/AuctionParticipantsPanel.tsx");
assert.match(participantsPanel, /participant\.participantType === "QUICK"/);
assert.match(participantsPanel, /Apenas lance assistido/);

console.log("auction-management-contracts: ok");
