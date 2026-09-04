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

const refreshCoordinator = await read("lib/auth/server/refresh-coordinator.ts");
assert.match(refreshCoordinator, /createRefreshCoordinator/);
assert.match(refreshCoordinator, /createHash\("sha256"\)/);
assert.match(refreshCoordinator, /flights\.get/);

const authenticatedRequest = await read("lib/auth/server/authenticated-request.ts");
assert.match(authenticatedRequest, /response\.status !== 401/);
assert.match(authenticatedRequest, /refreshAttempted/);
assert.match(authenticatedRequest, /safelyClearSession/);

const engineActions = await read("hooks/actions/auctionEngineActions.ts");
assert.match(engineActions, /authenticatedFetch/);
assert.doesNotMatch(engineActions, /authenticatedHeaders/);

const access = await read("lib/permissions/server/auction-access.ts");
assert.match(access, /PERMISSION_MODULE_KEYS\.AUCTIONS/);
assert.match(access, /redirect\("\/acesso-negado"\)/);
assert.match(access, /AUCTION_MANAGEMENT_ROLES/);
assert.match(access, /errorCode === "AUTH_REQUIRED"/);

const capabilities = await read("components/Management/capabilities.ts");
for (const key of ["AUCTIONS_VIEW", "AUCTIONS_MANAGE_STATUS", "AUCTIONS_MANAGE_LOTS", "AUCTIONS_MANAGE_BIDS", "AUCTIONS_NOTIFY_PARTICIPANTS"]) {
  assert.match(capabilities, new RegExp(key));
}

const broadcast = await read("hooks/actions/broadcastActions.ts");
assert.match(broadcast, /authenticatedFetch/);
assert.match(await read("hooks/actions/broadcastActions.ts"), /broadcast:read/);

const managementShell = await read("components/Management/AuctionManagementShell.tsx");
assert.match(managementShell, /logoutAuctionAction/);
assert.doesNotMatch(managementShell, /localStorage/);

const auctionHeader = await read("components/AuctionHeader/AuctionHeader.tsx");
assert.match(auctionHeader, /AUCTION_MANAGEMENT_ROLES/);
assert.match(auctionHeader, /href="\/admin\/leiloes"/);
assert.match(auctionHeader, /Administração/);

const broadcastPanel = await read("components/Broadcast/broadcast-control-panel.tsx");
assert.match(broadcastPanel, /canManageBroadcast/);

assert.match(engineActions, /createQuickParticipantAction/);
assert.match(engineActions, /manager\/participants\/quick/);
assert.match(engineActions, /Idempotency-Key/);
assert.match(engineActions, /listManagerPendingEligibilityBidsAction/);
assert.match(engineActions, /pending-eligibility-bids/);

const engineTypes = await read("lib/auctions/engine-types.ts");
assert.match(engineTypes, /participantType: "USER" \| "QUICK"/);
assert.match(engineTypes, /maskedDocument\?: string/);
assert.match(engineTypes, /status: "PENDING_ELIGIBILITY"/);

const pendingEligibility = await read("components/Management/AuctionPendingEligibilityBids.tsx");
assert.match(pendingEligibility, /Lances aguardando análise/);
assert.match(pendingEligibility, /aria-label="Status: Aguardando análise"/);
assert.match(pendingEligibility, /Ver dados/);
assert.match(pendingEligibility, /Habilitar usuário/);
assert.match(pendingEligibility, /setAuctionRegistrationEnabledAction/);

const auctionWorkspace = await read("components/Management/AuctionWorkspace.tsx");
assert.match(auctionWorkspace, /value: "lances", label: "Lances e pré-lances"/);
assert.match(auctionWorkspace, /tab === "lotes" \? <AuctionLotsPanel/);
assert.match(auctionWorkspace, /tab === "lances" \? \(/);
assert.match(auctionWorkspace, /id="pending-bids-title"/);
assert.match(auctionWorkspace, /label: "Comunicação"/);
assert.match(auctionWorkspace, /capabilities\.canNotifyParticipants/);

const operationPanel = await read("components/Management/AuctionOperationPanel.tsx");
assert.match(operationPanel, /Cadastrar participante rápido/);
assert.match(operationPanel, /CPF ou CNPJ/);
assert.match(operationPanel, /Esse cadastro não cria conta/);
assert.match(operationPanel, /Origem do participante/);
assert.match(operationPanel, /O participante autorizou receber mensagens/);

const acquisitionSources = await read("lib/auctions/acquisition-sources.ts");
assert.match(acquisitionSources, /utm_source/);
assert.match(acquisitionSources, /FACEBOOK/);
assert.match(acquisitionSources, /REFERRAL/);

const report = await read("app/(management)/admin/leiloes/[id]/relatorio/page.tsx");
assert.match(report, /Origem dos participantes/);
assert.match(report, /Book final/);
assert.match(report, /Último lance por lote/);
assert.match(report, /report\/pdf/);

const reportPrintButton = await read("components/Management/ReportPrintButton.tsx");
assert.match(reportPrintButton, /Baixar PDF final/);
assert.match(reportPrintButton, /Imprimir \/ salvar PDF/);

const reportProxy = await read("app/api/auctions/[id]/report/pdf/route.ts");
assert.match(reportProxy, /report\/pdf/);
assert.match(reportProxy, /authenticatedFetch/);

const participantsPanel = await read("components/Management/AuctionParticipantsPanel.tsx");
assert.match(participantsPanel, /participant\.participantType === "QUICK"/);
assert.match(participantsPanel, /Apenas lance assistido/);
assert.match(participantsPanel, /Enviar WhatsApp/);
assert.match(participantsPanel, /Confirmo o envio sem consentimento/);
assert.match(participantsPanel, /maxLength=\{4096\}/);

const communication = await read("components/Management/AuctionCommunicationPanel.tsx");
assert.match(communication, /Automação geral/);
assert.match(communication, /Histórico de mensagens/);
assert.match(communication, /message\.attempts/);
assert.match(communication, /message\.maskedPhone/);
assert.doesNotMatch(communication, /normalizedPhone/);

console.log("auction-management-contracts: ok");
