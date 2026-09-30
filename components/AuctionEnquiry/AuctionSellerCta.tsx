import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./auction-enquiry.module.css";

export function AuctionSellerCta() {
  return (
    <section className={styles.homeCta} aria-labelledby="auction-seller-title">
      <div className={styles.homeCtaCopy}>
        <h2 id="auction-seller-title">Seu próximo negócio pode começar com um leilão.</h2>
        <p>Animais, máquinas, veículos, propriedades ou outros bens. Conte com a PR Leilões para planejar, divulgar e realizar seu leilão.</p>
        <Link href="/faca-seu-leilao" className={styles.primaryButton}>Faça seu leilão conosco<ArrowUpRight size={19} aria-hidden="true" /></Link>
      </div>
      <div className={styles.homeCtaImage}><Image src="/images/auction-enquiry/rural-herd.webp" alt="Gado Nelore em uma paisagem rural" fill sizes="(max-width: 700px) 100vw, 400px" /></div>
    </section>
  );
}
