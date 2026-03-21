import Link from 'next/link';
import s from './termos.module.css';

export default function TermosPage() {
  return (
    <div className={s.page}>
      <div className={s.container}>
        <div className={s.hero}>
          <div className={s.heroTitle}>Termos de Uso e Política de Cookies</div>
          <p className={s.heroText}>
            O Sistema SEL é uma plataforma de gestão operacional para equipes políticas e eleitorais. Como lida com dados sensíveis de eleitores,
            apoiadores, zonas, sessões e promessas de campanha, exige compromisso explícito com integridade, confidencialidade e uso responsável das informações.
          </p>
        </div>

        <section className={s.card}>
          <div className={s.sectionTitle}>1. Finalidade do sistema</div>
          <p className={s.text}>
            O sistema existe para organizar bases eleitorais, apoiar acompanhamento de relacionamento com eleitores e facilitar a operação interna da campanha.
            Ele não deve ser utilizado para exposição indevida de dados, discriminação, perseguição, venda de cadastros ou qualquer uso incompatível com a legislação aplicável.
          </p>
        </section>

        <section className={s.card}>
          <div className={s.sectionTitle}>2. Responsabilidades de Admin e Cabo Eleitoral</div>
          <ul className={s.list}>
            <li><strong>Admin:</strong> responde pela governança da base, cadastro de cabos, revisão de acessos e supervisão do uso adequado da plataforma.</li>
            <li><strong>Cabo Eleitoral:</strong> deve acessar apenas dados necessários ao seu trabalho, manter sigilo e registrar informações com exatidão e boa-fé.</li>
            <li>Qualquer credencial é pessoal e intransferível. Compartilhamento de senha ou acesso é vedado.</li>
            <li>Incidentes de segurança, suspeita de vazamento ou acesso indevido devem ser reportados imediatamente.</li>
          </ul>
        </section>

        <section className={s.card}>
          <div className={s.sectionTitle}>3. Integridade, confidencialidade e proteção de dados</div>
          <ul className={s.list}>
            <li>Dados devem ser coletados e usados apenas para fins legítimos da operação política e administrativa autorizada.</li>
            <li>Informações sensíveis devem receber tratamento cuidadoso, evitando exportações, cópias paralelas e exposição em canais inseguros.</li>
            <li>O uso do sistema pressupõe observância à LGPD, às normas internas da equipe e aos deveres de confidencialidade.</li>
            <li>Registros inexatos, manipulados ou utilizados de forma indevida poderão gerar bloqueio de acesso e responsabilização interna.</li>
          </ul>
        </section>

        <section className={s.card}>
          <div className={s.sectionTitle}>4. Cookies utilizados</div>
          <p className={s.text}>
            O painel utiliza cookies estritamente necessários para autenticação e segurança, além de um cookie opcional para lembrar preferências visuais.
            Cookies essenciais não podem ser recusados porque sem eles o painel autenticado não funciona com segurança.
          </p>

          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Tipo</th>
                  <th>Finalidade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>sistema_sel_auth</td>
                  <td>Essencial / HttpOnly</td>
                  <td>Armazena o JWT da sessão autenticada para proteger o acesso ao painel e às rotas internas.</td>
                </tr>
                <tr>
                  <td>sistema_sel_consent</td>
                  <td>Essencial</td>
                  <td>Registra a aceitação dos termos e as escolhas de cookies feitas pelo usuário.</td>
                </tr>
                <tr>
                  <td>sistema_sel_theme</td>
                  <td>Preferência</td>
                  <td>Guarda o tema visual escolhido no navegador quando o usuário autoriza cookies de preferência.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={s.card}>
          <div className={s.sectionTitle}>5. Aceite e vigência</div>
          <p className={s.text}>
            O aceite é solicitado no primeiro acesso autenticado de cada usuário e pode ser renovado quando houver atualização da versão dos termos ou da política de cookies.
            Sem o aceite, o uso do painel autenticado não é permitido.
          </p>
        </section>

        <Link href="/login" className={s.backLink}>← Voltar para o login</Link>
      </div>
    </div>
  );
}