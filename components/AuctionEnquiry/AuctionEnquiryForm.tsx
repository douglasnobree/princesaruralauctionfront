"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { AUCTION_ASSET_TYPES, getAuctionEnquiryUrl } from "@/lib/auction-enquiries";
import styles from "./auction-enquiry.module.css";

export function AuctionEnquiryForm() {
  const [messageUrl, setMessageUrl] = useState("");
  const [phoneError, setPhoneError] = useState("");

  function prepareMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const phone = value("phone").replace(/\D/g, "");
    if (!/^(?:55)?[1-9]{2}\d{8,9}$/.test(phone)) {
      setPhoneError("Informe um telefone com DDD, por exemplo (88) 99999-9999.");
      form.querySelector<HTMLInputElement>("#enquiry-phone")?.focus();
      return;
    }
    setPhoneError("");
    setMessageUrl(getAuctionEnquiryUrl([
      "Olá! Quero realizar um leilão com a PR Leilões.",
      "",
      `Nome: ${value("name")}`,
      `WhatsApp: ${value("phone")}`,
      `Cidade/UF: ${value("location")}`,
      `Tipo de bem: ${value("assetType")}`,
      value("quantity") ? `Quantidade aproximada: ${value("quantity")}` : "",
      value("message") ? `Sobre os bens: ${value("message")}` : "",
    ].filter((line, index) => line || index === 1).join("\n")));
  }

  return (
    <form className={styles.form} onSubmit={prepareMessage} onChange={() => { setMessageUrl(""); setPhoneError(""); }}>
      <h3>Conte o que você quer leiloar.</h3>
      <p>Com essas informações, nossa equipe pode entender melhor sua proposta.</p>
      <div className={styles.fields}>
        <label htmlFor="enquiry-name">Nome<input id="enquiry-name" name="name" autoComplete="name" required maxLength={100} placeholder="Seu nome ou nome da empresa" /></label>
        <label htmlFor="enquiry-phone">Telefone / WhatsApp<input id="enquiry-phone" name="phone" type="tel" autoComplete="tel" required maxLength={20} placeholder="(88) 99999-9999" aria-invalid={phoneError ? true : undefined} aria-describedby={phoneError ? "enquiry-phone-error" : undefined} /></label>
        <label htmlFor="enquiry-location">Cidade / estado<input id="enquiry-location" name="location" required maxLength={100} placeholder="Ex.: Quixadá / CE" /></label>
        <label htmlFor="enquiry-type">O que deseja leiloar?<select id="enquiry-type" name="assetType" required defaultValue=""><option value="" disabled>Selecione o tipo de bem</option>{AUCTION_ASSET_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label htmlFor="enquiry-quantity" className={styles.fullField}>Quantidade aproximada <span>(opcional)</span><input id="enquiry-quantity" name="quantity" maxLength={100} placeholder="Ex.: 20 animais, 2 máquinas ou 1 propriedade" /></label>
        <label htmlFor="enquiry-message" className={styles.fullField}>Quer acrescentar algo? <span>(opcional)</span><textarea id="enquiry-message" name="message" rows={3} maxLength={1000} placeholder="Conte um pouco sobre os bens ou sua ideia para o leilão." /></label>
      </div>
      {phoneError ? <p id="enquiry-phone-error" className={styles.error} role="alert">{phoneError}</p> : null}
      {messageUrl ? (
        <div className={styles.messageReady} data-pr-feedback>
          <p role="status">Sua mensagem está pronta. Abra o WhatsApp e confirme o envio para falar com a equipe.</p>
          <a href={messageUrl} target="_blank" rel="noopener noreferrer" className={styles.primaryButton}><MessageCircle size={19} aria-hidden="true" />Abrir WhatsApp e enviar<ArrowUpRight size={18} aria-hidden="true" /></a>
        </div>
      ) : <button type="submit" className={styles.primaryButton}>Preparar mensagem para o WhatsApp<ArrowUpRight size={19} aria-hidden="true" /></button>}
      <p className={styles.formNote}>Os dados serão incluídos na mensagem. O envio acontece apenas quando você confirmar no WhatsApp.</p>
      <noscript><p>Para falar com nossa equipe, <a href={getAuctionEnquiryUrl()}>abra o WhatsApp</a>.</p></noscript>
    </form>
  );
}
