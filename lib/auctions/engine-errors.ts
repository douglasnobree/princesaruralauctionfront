type EngineErrorDetails = Record<string, unknown> | undefined;

function formatCents(value: unknown) {
	if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
	}).format(Number(value) / 100);
}

function statusLabel(status: unknown) {
	const labels: Record<string, string> = {
		DRAFT: "rascunho",
		REVIEW: "em revisão",
		SCHEDULED: "agendado",
		RUNNING: "em andamento",
		PAUSED: "pausado",
		FINISHED: "encerrado",
		QUEUED: "na fila",
		OPEN: "aberto para lances",
		CLOSING: "em fechamento",
		SOLD: "vendido",
		UNSOLD: "não vendido",
		CANCELLED: "cancelado",
	};
	return typeof status === "string" ? labels[status] ?? status.toLowerCase() : "estado atual";
}

export function explainEngineError(code: string | undefined, fallback: string, details?: EngineErrorDetails) {
	if (code === "INVALID_AUCTION_TRANSITION") {
		const allowed = Array.isArray(details?.allowedTransitions) ? details.allowedTransitions.map(statusLabel).join(", ") : "nenhuma";
		return `O leilão está ${statusLabel(details?.from)} e não pode seguir para essa etapa. Próximas etapas: ${allowed}. Atualize o estado antes de tentar novamente.`;
	}
	if (code === "INVALID_LOT_TRANSITION") {
		const allowed = Array.isArray(details?.allowedTransitions) ? details.allowedTransitions.map(statusLabel).join(", ") : "nenhuma";
		return `O lote está ${statusLabel(details?.from)} e essa ação não está disponível. Próximas etapas: ${allowed}. Atualize o estado antes de tentar novamente.`;
	}
	if (code === "LOT_NOT_FOUND") return "Este lote ainda não está sincronizado com o motor. Recarregue o leilão ou publique a execução antes de tentar de novo.";
	if (code === "AUCTION_NOT_FOUND") return "Este leilão ainda não está sincronizado com o motor. Publique a execução e atualize esta tela.";
	if (code === "VERSION_CONFLICT") return "A tela estava desatualizada. Atualizamos o estado oficial; confira os dados e repita a ação.";
	if (code === "REGISTRATION_REQUIRED") return "Seu cadastro ainda não foi aprovado para este leilão. Solicite a habilitação e aguarde a validação da equipe Princesa Rural.";
	if (code === "SHOPPING_ALREADY_SOLD") return "Este lote acabou de ser comprado por outro participante. Atualize a página para conferir o estado oficial.";
	if (code === "SHOPPING_PURCHASE_REQUIRED") return "No Shopping, o lote é comprado pelo preço fixo; não é possível enviar lances tradicionais.";
	if (code === "UNAUTHORIZED" || code === "AUTH_REQUIRED") return "Sua sessão expirou. Entre novamente para continuar participando.";
	if (code === "FORBIDDEN") return "Sua conta não tem permissão para executar esta ação neste leilão.";
	if (code === "AUCTION_NOT_OPEN") return "Este leilão ainda não está aceitando lances. No pré-lance, confira se a etapa está aberta; no ao vivo, aguarde o início da disputa.";
	if (code === "LOT_NOT_OPEN") return "Este lote não está aberto para receber lances agora.";
	if (code === "LOT_NOT_STARTED") return "O período de lances deste lote ainda não começou.";
	if (code === "LOT_ENDED") return "O prazo deste lote terminou e novos lances não são aceitos.";
	if (code === "PREBID_NOT_STARTED") return "O período de pré-lance deste leilão ainda não começou.";
	if (code === "PREBID_CLOSED") return "O período de pré-lance deste leilão já foi encerrado.";
	if (code === "INVALID_AMOUNT") return "Informe um valor de lance válido.";
	if (code === "BID_BELOW_MINIMUM") {
		const minimum = formatCents(details?.minimumAmountCents);
		return minimum ? `O lance precisa ser de pelo menos ${minimum}.` : "O lance precisa ser igual ou maior que o próximo lance exibido.";
	}
	if (code === "BID_PROXY_BELOW_CURRENT_PRICE") {
		const current = formatCents(details?.currentPriceCents);
		return current ? `O teto automático não pode ser menor que o lance atual de ${current}.` : "O teto automático não pode ser menor que o lance atual.";
	}
	if (code === "BID_BELOW_ACTIVE_PROXY") return "O lance precisa superar o teto automático vigente.";
	if (code === "BID_NOT_HIGHER") return "O novo teto automático precisa ser maior que o teto atual.";
	if (code === "BID_NO_CHANGE") return "Informe um valor diferente do atual.";
	if (code === "BID_COVERED_BY_PROXY") return `Seu teto automático já cobre esse valor${typeof details?.maxBidCents === "string" ? ` (até ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(details.maxBidCents) / 100)})` : ""}. Aumente o teto automático para continuar disputando.`;
	if (code === "SANDBOX_DISABLED") return "A criação rápida de leilões está disponível apenas no ambiente de desenvolvimento.";
	return fallback;
}

export function getEngineErrorCode(payload: { error?: unknown; code?: unknown }) {
	if (payload.code && typeof payload.code === "string") return payload.code;
	if (payload.error && typeof payload.error === "object" && "code" in payload.error) {
		const code = (payload.error as { code?: unknown }).code;
		return typeof code === "string" ? code : undefined;
	}
	if (typeof payload.error === "string" && /^[A-Z0-9_]+$/.test(payload.error)) return payload.error;
	return undefined;
}
