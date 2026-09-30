import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, CarFront, Check, Gavel, MapPinned, MessageCircle, Monitor, Package, Radio, ShieldCheck, Tractor, UsersRound, Wrench } from "lucide-react";
import { AuctionEnquiryForm } from "@/components/AuctionEnquiry/AuctionEnquiryForm";
import { getAuctionEnquiryUrl } from "@/lib/auction-enquiries";
import styles from "@/components/AuctionEnquiry/auction-enquiry.module.css";

const title = "Faça seu leilão conosco";
const description = "Quer leiloar animais, máquinas, veículos ou propriedades? Conte com a PR Leilões para planejar, divulgar e realizar seu leilão. Fale com nossa equipe.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faca-seu-leilao" },
  openGraph: { title: `${title} | PR Leilões`, description, url: "/faca-seu-leilao", images: [{ url: "/brand/pr-leiloes/share-preview.png", width: 1200, height: 630, alt: "PR Leilões" }] },
  twitter: { card: "summary_large_image", title: `${title} | PR Leilões`, description, images: ["/brand/pr-leiloes/share-preview.png"] },
};

const benefits = [
  { icon: UsersRound, title: "Seu leilão, além da sua região.", text: "Apresente seus bens a compradores de diferentes lugares, com acesso aos lotes pela internet." },
  { icon: Radio, title: "Divulgação com direção.", text: "Planejamos a apresentação e a divulgação do leilão nos nossos canais, de acordo com o perfil dos bens." },
  { icon: Monitor, title: "Estrutura para lances online.", text: "Os compradores consultam os lotes, solicitam habilitação e participam pela plataforma." },
  { icon: Gavel, title: "Uma equipe junto de você.", text: "Do planejamento à realização, você conta com nossa equipe para organizar cada etapa do leilão." },
];

const steps = [
  { title: "Você conta o que quer leiloar.", text: "Fale com a equipe e apresente os bens, a quantidade e a localização. Começamos entendendo sua necessidade." },
  { title: "Planejamos juntos.", text: "Alinhamos o formato, a data, a organização dos lotes e a estratégia de divulgação." },
  { title: "Apresentamos aos compradores.", text: "Publicamos as informações dos lotes e divulgamos o leilão nos nossos canais." },
  { title: "Realizamos o leilão.", text: "A PR Leilões oferece a plataforma e acompanha a realização do evento com você." },
];

const otherAssets = [
  { icon: CarFront, title: "Veículos", text: "Carros, caminhões e utilitários." },
  { icon: MapPinned, title: "Imóveis e propriedades", text: "Fazendas, sítios, terrenos e imóveis." },
  { icon: Wrench, title: "Equipamentos", text: "Implementos, ferramentas e equipamentos." },
  { icon: Package, title: "Outros bens", text: "Conte sua proposta. Nossa equipe avalia com você." },
];

export default function AuctionEnquiryPage() {
  const whatsappUrl = getAuctionEnquiryUrl();
  return (
    <div className={styles.landing}>
      <section className={styles.hero} aria-labelledby="seller-hero-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1 id="seller-hero-title">Você tem os bens.<br />Nós temos a <span>estrutura para o seu leilão.</span></h1>
            <p>Animais, máquinas, veículos ou propriedades. Apresente seu patrimônio a novos compradores com a equipe da PR Leilões ao seu lado, do planejamento à realização.</p>
            <div className={styles.heroActions}>
              <a href="#contato" className={styles.primaryButton}>Quero realizar um leilão<ArrowUpRight size={19} aria-hidden="true" /></a>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.lightLink}><MessageCircle size={18} aria-hidden="true" />Falar com nossa equipe</a>
            </div>
            <a className={styles.exploreLink} href="#como-funciona" data-pr-loop>Conheça o processo<ArrowDown size={16} aria-hidden="true" /></a>
          </div>
          <figure className={styles.heroVisual}>
            <Image src="/images/auction-enquiry/rural-herd.webp" alt="Rebanho Nelore no pasto, com paisagem rural ao amanhecer" width={1536} height={1024} sizes="(max-width: 760px) 100vw, 55vw" priority />
            <figcaption><span>Do campo para novas oportunidades.</span><span>PR Leilões</span></figcaption>
          </figure>
        </div>
        <div className={styles.heroBottom}><span>Planejamento com você.</span><span>Divulgação dos seus bens.</span><span>Lances pela plataforma.</span></div>
      </section>

      <section className={`${styles.section} ${styles.benefits}`} aria-labelledby="seller-benefits-title">
        <div className={styles.sectionIntro}>
          <h2 id="seller-benefits-title">Você cuida do seu negócio.<br />A gente organiza o leilão.</h2>
          <p>Um leilão exige mais que colocar bens à venda. É preciso apresentar os lotes, chegar aos compradores e ter uma estrutura preparada para a disputa.</p>
        </div>
        <div className={styles.benefitList}>{benefits.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={26} strokeWidth={1.5} aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
      </section>

      <section className={styles.assetsSection} aria-labelledby="seller-assets-title">
        <div className={styles.section}>
          <div className={styles.sectionHeading}><div><h2 id="seller-assets-title">O que você quer leiloar?</h2><p>Do rebanho à propriedade, o primeiro passo é conversar.</p></div><a href="#contato" className={styles.textLink}>Apresentar meus bens<ArrowUpRight size={18} aria-hidden="true" /></a></div>
          <div className={styles.assetPhotos}>
            <a href="#contato" className={styles.assetPhoto}><Image src="/images/auction-enquiry/rural-herd.webp" alt="Bovinos Nelore no pasto" width={768} height={512} sizes="(max-width: 600px) 100vw, 50vw" /><div><h3>Bovinos e outros animais</h3><p>Gado de corte, leite, equinos e outros animais.</p></div><ArrowUpRight size={24} aria-hidden="true" /></a>
            <a href="#contato" className={styles.assetPhoto}><Image src="/images/auction-enquiry/tractor.webp" alt="Trator agrícola azul" width={667} height={500} sizes="(max-width: 600px) 100vw, 50vw" /><div><h3>Máquinas agrícolas</h3><p>Tratores, colheitadeiras e máquinas para o campo.</p></div><Tractor size={24} aria-hidden="true" /></a>
          </div>
          <div className={styles.otherAssets}>{otherAssets.map(({ icon: Icon, title, text }) => <a key={title} href="#contato"><Icon size={25} strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3><p>{text}</p><ArrowUpRight size={17} aria-hidden="true" /></a>)}</div>
        </div>
      </section>

      <section id="como-funciona" className={`${styles.section} ${styles.processSection}`} aria-labelledby="seller-process-title">
        <div className={styles.sectionHeading}><div><h2 id="seller-process-title">Do primeiro contato<br />ao dia do leilão.</h2><p>Quatro etapas, com nossa equipe acompanhando você.</p></div><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.textLink}>Vamos conversar<ArrowUpRight size={18} aria-hidden="true" /></a></div>
        <ol className={styles.steps}>{steps.map(({ title, text }, index) => <li key={title}><span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
      </section>

      <section className={styles.trustSection} aria-labelledby="seller-trust-title">
        <div className={styles.trustInner}>
          <div><ShieldCheck size={40} strokeWidth={1.3} aria-hidden="true" /><h2 id="seller-trust-title">Seu patrimônio merece<br />um processo bem conduzido.</h2><p>Informações claras, compradores habilitados e uma equipe presente. É assim que organizamos a participação no seu leilão.</p><Link href="/leiloes#agenda" className={styles.lightLink}>Conheça nossa agenda<ArrowRight size={18} aria-hidden="true" /></Link></div>
          <ul className={styles.trustList}><li><Check size={20} aria-hidden="true" /><div><h3>Planejamento alinhado com você</h3><p>Formato, condições e próximos passos definidos em conversa com a equipe.</p></div></li><li><Check size={20} aria-hidden="true" /><div><h3>Lotes apresentados com clareza</h3><p>Fotos e informações para o comprador conhecer os bens antes de participar.</p></div></li><li><Check size={20} aria-hidden="true" /><div><h3>Participação com habilitação</h3><p>Cadastro e habilitação dos compradores para participar dos lances online.</p></div></li></ul>
        </div>
      </section>

      <section id="contato" className={`${styles.section} ${styles.contactSection}`} aria-labelledby="seller-contact-title">
        <div className={styles.contactCopy}><h2 id="seller-contact-title">Tem algo<br />para leiloar?<span>Vamos conversar.</span></h2><p>Conte o que você tem em mãos. Nossa equipe ajuda a entender o melhor caminho para organizar seu leilão.</p><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.textLink}><MessageCircle size={20} aria-hidden="true" />Prefiro falar direto pelo WhatsApp<ArrowUpRight size={18} aria-hidden="true" /></a><div className={styles.contactNote}><p>Para produtores, empresas e proprietários.</p><p>Não precisa ter o leilão planejado.<br />É para isso que estamos aqui.</p></div></div>
        <AuctionEnquiryForm />
      </section>

      <section className={styles.faqSection} aria-labelledby="seller-faq-title"><div className={styles.section}><h2 id="seller-faq-title">Antes de começar.</h2><div className={styles.faqList}><details><summary>Preciso ter todos os lotes definidos?</summary><p>Não. Você pode começar contando o tipo de bem e a quantidade aproximada. A equipe orienta os próximos passos para organizar a proposta.</p></details><details><summary>Como são definidos os custos e as condições?</summary><p>São alinhados com a equipe de acordo com os bens, o formato e a estrutura do leilão. Entre em contato para conversar sobre sua proposta.</p></details><details><summary>Posso apresentar um único bem?</summary><p>Sim, você pode apresentar sua proposta mesmo com um único bem. A equipe avalia com você a possibilidade e o formato adequado.</p></details></div></div></section>

      <footer className={styles.footer}><div><Image src="/brand/pr-leiloes/logo-horizontal-color.svg" alt="PR Leilões" width={180} height={48} loading="eager" /><p>Seu patrimônio. Novas oportunidades.</p></div><Link href="/leiloes">Ver agenda de leilões<ArrowUpRight size={16} aria-hidden="true" /></Link><a href={whatsappUrl} target="_blank" rel="noopener noreferrer">Falar com a equipe<ArrowUpRight size={16} aria-hidden="true" /></a></footer>
    </div>
  );
}
