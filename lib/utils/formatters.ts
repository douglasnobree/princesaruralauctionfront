/**
 * Formata CPF ou CNPJ com pontuação adequada
 * @param value - CPF ou CNPJ sem formatação
 * @returns String formatada ou valor original se inválido
 */
export function formatCpfCnpj(value: string): string {
	const numericValue = value.replace(/\D/g, "");

	if (numericValue.length === 11) {
		// Formata como CPF: 000.000.000-00
		return numericValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
	}

	if (numericValue.length === 14) {
		// Formata como CNPJ: 00.000.000/0000-00
		return numericValue.replace(
			/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
			"$1.$2.$3/$4-$5",
		);
	}

	return value;
}

/**
 * Formata CNPJ com pontuação
 * @param value - CNPJ sem formatação
 * @returns String formatada
 */
export function formatCnpj(value: string): string {
	const numericValue = value.replace(/\D/g, "").slice(0, 14);

	if (numericValue.length <= 2) {
		return numericValue;
	}
	if (numericValue.length <= 5) {
		return numericValue.replace(/(\d{2})(\d{0,3})/, "$1.$2");
	}
	if (numericValue.length <= 8) {
		return numericValue.replace(/(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
	}
	if (numericValue.length <= 12) {
		return numericValue.replace(
			/(\d{2})(\d{3})(\d{3})(\d{0,4})/,
			"$1.$2.$3/$4",
		);
	}
	return numericValue.replace(
		/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,
		"$1.$2.$3/$4-$5",
	);
}

/**
 * Formata CPF com pontuação
 * @param value - CPF sem formatação
 * @returns String formatada
 */
export function formatCpf(value: string): string {
	const numericValue = value.replace(/\D/g, "").slice(0, 11);

	if (numericValue.length <= 3) {
		return numericValue;
	}
	if (numericValue.length <= 6) {
		return numericValue.replace(/(\d{3})(\d{0,3})/, "$1.$2");
	}
	if (numericValue.length <= 9) {
		return numericValue.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
	}
	return numericValue.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
}

/**
 * Formata telefone brasileiro
 * @param value - Telefone sem formatação
 * @returns String formatada ou valor original se inválido
 */
export function formatPhone(value: string): string {
	const numericValue = value.replace(/\D/g, "");

	if (numericValue.length === 11) {
		// Formata celular: (00) 0 0000-0000
		return numericValue.replace(/(\d{2})(\d)(\d{4})(\d{4})/, "($1) $2 $3-$4");
	}

	if (numericValue.length === 10) {
		// Formata telefone fixo: (00) 0000-0000
		return numericValue.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
	}

	return value;
}

/**
 * Formata data ISO para formato brasileiro
 * @param isoDate - Data no formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
 * @returns Data formatada como DD/MM/YYYY
 */
export function formatDateBR(isoDate: string): string {
	const dateOnly = isoDate.split("T")[0];
	const [year, month, day] = dateOnly.split("-");
	return `${day}/${month}/${year}`;
}

/**
 * Valida formato de email
 * @param email - Email a ser validado
 * @returns true se o email for válido
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Adiciona protocolo HTTPS a uma URL se não tiver protocolo
 * @param url - URL a ser processada
 * @returns URL com protocolo
 */
export function ensureHttpsProtocol(url: string): string {
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url;
	}
	return `https://${url}`;
}

/**
 * Formata valor como moeda brasileira (BRL)
 * @param value - Número a ser formatado
 * @param currency - Código da moeda (padrão: 'BRL')
 * @returns String formatada como R$ 1.234,56
 */
export function formatCurrency(value: number, currency: string = 'BRL'): string {
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: currency,
	}).format(value);
}

export const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

/**
 * Formata data ISO para formato brasileiro com hora
 * @param date - Data no formato ISO ou objeto Date
 * @returns Data formatada como DD/MM/YYYY HH:mm
 */
export function formatDateTime(date: string | Date): string {
	return new Intl.DateTimeFormat('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: BRAZIL_TIME_ZONE,
	}).format(new Date(date));
}

/**
 * Formata porcentagem
 * @param value - Número a ser formatado
 * @returns String formatada como "12.50%"
 */
export function formatPercentage(value: number): string {
	return `${value.toFixed(2)}%`;
}
