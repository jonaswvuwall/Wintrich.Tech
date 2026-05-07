import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { networkApi, type FullReportResponse, type ReportFinding } from '../../infrastructure/api/networkApi';
import { theme } from '../styles/theme';

const Page = styled.div`
  position: relative;
  min-height: 100vh;
  width: 100%;
  padding: clamp(6rem, 9vh, 9rem) clamp(1rem, 4vw, 3rem) 4rem;
`;

const Wrap = styled.div`
  width: min(960px, 100%);
  margin: 0 auto;
`;

const HeroCard = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 1.6rem 1.8rem;
  border-radius: 22px;
  background: rgba(14, 17, 23, 0.6);
  border: 1px solid ${theme.colors.border};
  backdrop-filter: blur(16px) saturate(140%);
  margin-bottom: 1.5rem;
`;

const Host = styled.div`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 1.4rem;
  color: ${theme.colors.text};
  font-weight: 700;
`;

const When = styled.div`
  font-size: 0.78rem;
  color: ${theme.colors.textMuted};
  margin-top: 0.25rem;
`;

const gradeColor = (g: string): string => {
  if (g.startsWith('A')) return theme.colors.success;
  if (g === 'B' || g === 'C') return theme.colors.warning;
  return theme.colors.error;
};

const GradeBadge = styled.div<{ $grade: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 110px; height: 110px;
  border-radius: 50%;
  background: ${p => `radial-gradient(circle at 30% 30%, ${gradeColor(p.$grade)}33, transparent 70%)`};
  border: 2px solid ${p => gradeColor(p.$grade)};
  color: ${p => gradeColor(p.$grade)};
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2.6rem;
  font-weight: 700;
  small {
    display: block;
    font-size: 0.7rem;
    color: ${theme.colors.textMuted};
    font-weight: 400;
    margin-top: -4px;
  }
`;

const Section = styled.section`
  padding: 1.4rem 1.6rem;
  margin-bottom: 1.2rem;
  border-radius: 18px;
  background: rgba(14, 17, 23, 0.55);
  border: 1px solid ${theme.colors.border};
`;

const SectionTitle = styled.h2`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.05rem;
  margin: 0 0 0.8rem;
  color: ${theme.colors.text};
`;

const FindingItem = styled.li<{ $severity: string }>`
  list-style: none;
  padding: 0.55rem 0.85rem;
  margin-bottom: 0.4rem;
  border-radius: 10px;
  font-size: 0.85rem;
  color: ${theme.colors.text};
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid ${p =>
    p.$severity === 'critical' ? theme.colors.error
    : p.$severity === 'warning' ? theme.colors.warning
    : theme.colors.info};
  span.cat {
    display: inline-block;
    font-size: 0.7rem;
    text-transform: uppercase;
    color: ${theme.colors.textMuted};
    margin-right: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
`;

const Kv = styled.div`
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 0.5rem 1rem;
  font-size: 0.85rem;
  color: ${theme.colors.textSecondary};
  span.k { color: ${theme.colors.textMuted}; }
  span.v { color: ${theme.colors.text}; font-family: 'JetBrains Mono', ui-monospace, monospace; word-break: break-all; }
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const BackLink = styled(Link)`
  display: inline-block;
  margin-bottom: 1rem;
  color: ${theme.colors.primary};
  text-decoration: none;
  font-size: 0.85rem;
  &:hover { text-decoration: underline; }
`;

const renderFindings = (findings: ReportFinding[]) => {
  if (!findings || findings.length === 0) return <div style={{ color: theme.colors.success }}>All checks passed.</div>;
  return (
    <ul style={{ padding: 0, margin: 0 }}>
      {findings.map((f, i) => (
        <FindingItem key={i} $severity={f.severity}>
          <span className="cat">[{f.category}]</span>{f.message}
        </FindingItem>
      ))}
    </ul>
  );
};

export const SharedReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<FullReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    networkApi.getSharedReport(id)
      .then(setReport)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load report'));
  }, [id]);

  if (error) {
    return (
      <Page>
        <Wrap>
          <BackLink to="/dashboard">← Back to dashboard</BackLink>
          <Section><SectionTitle>Report not found</SectionTitle><div>{error}</div></Section>
        </Wrap>
      </Page>
    );
  }

  if (!report) {
    return (
      <Page>
        <Wrap>
          <Section>Loading report…</Section>
        </Wrap>
      </Page>
    );
  }

  return (
    <Page>
      <Wrap>
        <BackLink to="/dashboard">← Back to dashboard</BackLink>

        <HeroCard>
          <div>
            <Host>{report.host}</Host>
            <When>Generated {new Date(report.generatedAt).toLocaleString()}</When>
            <div style={{ marginTop: '0.6rem', color: theme.colors.textSecondary, fontSize: '0.9rem' }}>
              {report.summary}
            </div>
          </div>
          <GradeBadge $grade={report.grade}>
            {report.grade}<small>{report.score}/{report.maxScore}</small>
          </GradeBadge>
        </HeroCard>

        <Section>
          <SectionTitle>Findings ({report.findings.length})</SectionTitle>
          {renderFindings(report.findings)}
        </Section>

        {report.tls && !report.tls.error && (
          <Section>
            <SectionTitle>TLS Certificate</SectionTitle>
            <Kv>
              <span className="k">Issuer</span><span className="v">{report.tls.issuer ?? '—'}</span>
              <span className="k">Subject</span><span className="v">{report.tls.subject ?? '—'}</span>
              <span className="k">Valid until</span><span className="v">{report.tls.validUntil ?? '—'} ({report.tls.daysUntilExpiry} day(s))</span>
              <span className="k">Protocol</span><span className="v">{report.tls.protocol ?? '—'}</span>
              <span className="k">Cipher</span><span className="v">{report.tls.cipherSuite ?? '—'}</span>
            </Kv>
          </Section>
        )}

        {report.dns && !report.dns.error && (
          <Section>
            <SectionTitle>DNS Records</SectionTitle>
            <Kv>
              <span className="k">A</span><span className="v">{report.dns.aRecords.join(', ') || '—'}</span>
              <span className="k">AAAA</span><span className="v">{report.dns.aaaaRecords.join(', ') || '—'}</span>
              <span className="k">MX</span><span className="v">{report.dns.mxRecords.join(', ') || '—'}</span>
              <span className="k">NS</span><span className="v">{report.dns.nsRecords.join(', ') || '—'}</span>
            </Kv>
          </Section>
        )}

        {report.securityHeaders && !report.securityHeaders.error && (
          <Section>
            <SectionTitle>Security Headers — Grade {report.securityHeaders.grade}</SectionTitle>
            <Kv>
              {report.securityHeaders.checks.map(c => (
                <React.Fragment key={c.name}>
                  <span className="k">{c.name}</span>
                  <span className="v" style={{
                    color: c.status === 'good' ? theme.colors.success
                      : c.status === 'warning' ? theme.colors.warning
                      : theme.colors.error,
                  }}>{c.status}{c.value ? ` — ${c.value.slice(0, 80)}${c.value.length > 80 ? '…' : ''}` : ''}</span>
                </React.Fragment>
              ))}
            </Kv>
          </Section>
        )}

        {report.emailAuth && !report.emailAuth.error && (
          <Section>
            <SectionTitle>Email Authentication — Grade {report.emailAuth.grade}</SectionTitle>
            <Kv>
              {[report.emailAuth.spf, report.emailAuth.dmarc, report.emailAuth.dkim].map(c => (
                <React.Fragment key={c.name}>
                  <span className="k">{c.name}</span>
                  <span className="v" style={{
                    color: c.status === 'good' ? theme.colors.success
                      : c.status === 'warning' ? theme.colors.warning
                      : theme.colors.error,
                  }}>{c.status}</span>
                </React.Fragment>
              ))}
            </Kv>
          </Section>
        )}

        {report.whois && !report.whois.error && (
          <Section>
            <SectionTitle>Domain Registration</SectionTitle>
            <Kv>
              <span className="k">Registrar</span><span className="v">{report.whois.registrar ?? '—'}</span>
              <span className="k">Created</span><span className="v">{report.whois.createdOn ?? '—'}</span>
              <span className="k">Expires</span><span className="v">{report.whois.expiresOn ?? '—'} {report.whois.daysUntilExpiry != null && `(${report.whois.daysUntilExpiry} day(s))`}</span>
            </Kv>
          </Section>
        )}
      </Wrap>
    </Page>
  );
};
