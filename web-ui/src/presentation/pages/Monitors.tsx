import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { networkApi, type MonitorEntry } from '../../infrastructure/api/networkApi';
import { theme } from '../styles/theme';
import {
  Card, CardHeader, CardIcon, CardTitle, CardDescription,
  InputGroup, Label, Input, Button, ErrorMessage, LoadingSpinner,
} from '../components/StyledComponents';
import { BellIcon } from '../components/common/ToolIcons';

const Page = styled.div`
  position: relative;
  min-height: 100vh;
  padding: clamp(6rem, 9vh, 9rem) clamp(1rem, 4vw, 3rem) 4rem;
`;

const Wrap = styled.div`
  width: min(960px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Header = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  span { background: ${theme.gradients.brand}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
`;

const Sub = styled.p`
  color: ${theme.colors.textSecondary};
  margin-top: 0.4rem;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  @media (max-width: 540px) { grid-template-columns: 1fr; }
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${theme.colors.border};
  margin-bottom: 0.5rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
`;

const HostText = styled.div`
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: ${theme.colors.text};
  font-size: 0.95rem;
`;

const Meta = styled.div`
  font-size: 0.75rem;
  color: ${theme.colors.textMuted};
  margin-top: 0.2rem;
`;

const StatusPill = styled.span<{ $status: string | null }>`
  font-size: 0.7rem;
  padding: 3px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  font-weight: 700;
  background: ${p =>
    p.$status === 'ok' ? 'rgba(34,197,94,0.15)'
    : p.$status === 'fail' ? 'rgba(239,68,68,0.15)'
    : 'rgba(255,255,255,0.06)'};
  color: ${p =>
    p.$status === 'ok' ? theme.colors.success
    : p.$status === 'fail' ? theme.colors.error
    : theme.colors.textMuted};
`;

const DeleteBtn = styled.button`
  background: transparent;
  border: 1px solid ${theme.colors.border};
  color: ${theme.colors.textSecondary};
  padding: 0.35rem 0.8rem;
  border-radius: 8px;
  font-size: 0.75rem;
  cursor: pointer;
  &:hover { color: ${theme.colors.error}; border-color: ${theme.colors.error}; }
`;

const Empty = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${theme.colors.textMuted};
  font-size: 0.9rem;
`;

export const Monitors: React.FC = () => {
  const [monitors, setMonitors] = useState<MonitorEntry[]>([]);
  const [host, setHost] = useState('');
  const [email, setEmail] = useState('');
  const [warnDays, setWarnDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try { setMonitors(await networkApi.listMonitors()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load monitors'); }
  };

  useEffect(() => { void reload(); }, []);

  const add = async () => {
    const h = host.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!h) return;
    setLoading(true); setError(null);
    try {
      await networkApi.createMonitor({
        host: h,
        email: email.trim() || undefined,
        certWarnDays: warnDays,
        checkHttp: true,
        checkTls: true,
      });
      setHost(''); setEmail('');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create monitor');
    } finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this monitor?')) return;
    try { await networkApi.deleteMonitor(id); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to delete'); }
  };

  return (
    <Page>
      <Wrap>
        <div>
          <Header>Site <span>Monitoring</span></Header>
          <Sub>
            Wintrich.tech checks each registered host every 15 minutes and sends an email
            when the certificate is expiring or the site is down.
          </Sub>
        </div>

        <Card>
          <CardHeader>
            <CardIcon><BellIcon /></CardIcon>
            <div>
              <CardTitle>Add monitor</CardTitle>
              <CardDescription>Receive email alerts for downtime and cert expiry</CardDescription>
            </div>
          </CardHeader>

          <InputGroup>
            <Label>Host</Label>
            <Input type="text" placeholder="example.com" value={host}
              onChange={e => setHost(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()} />
          </InputGroup>

          <TwoCol>
            <InputGroup>
              <Label>Email (optional)</Label>
              <Input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} />
            </InputGroup>
            <InputGroup>
              <Label>Cert warning (days)</Label>
              <Input type="number" min={1} max={120} value={warnDays}
                onChange={e => setWarnDays(parseInt(e.target.value) || 30)} />
            </InputGroup>
          </TwoCol>

          <Button onClick={add} disabled={loading || !host.trim()}>
            {loading ? <LoadingSpinner /> : 'Create monitor'}
          </Button>

          {error && <ErrorMessage>{error}</ErrorMessage>}
        </Card>

        <Card>
          <CardHeader>
            <CardIcon><BellIcon /></CardIcon>
            <div>
              <CardTitle>Active monitors</CardTitle>
              <CardDescription>{monitors.length} configured</CardDescription>
            </div>
          </CardHeader>

          {monitors.length === 0 ? (
            <Empty>No monitors yet. Add one above.</Empty>
          ) : monitors.map(m => (
            <Row key={m.id}>
              <div>
                <HostText>{m.host}</HostText>
                <Meta>
                  {m.email ? `→ ${m.email} · ` : 'no email · '}
                  warn at {m.certWarnDays}d ·{' '}
                  {m.lastCheckedAt
                    ? `checked ${new Date(m.lastCheckedAt).toLocaleString()}`
                    : 'pending first check'}
                  {m.lastDaysUntilExpiry != null && ` · cert ${m.lastDaysUntilExpiry}d`}
                  {m.lastHttpStatus != null && ` · HTTP ${m.lastHttpStatus}`}
                </Meta>
                {m.lastError && <Meta style={{ color: theme.colors.error }}>{m.lastError}</Meta>}
              </div>
              <StatusPill $status={m.lastStatus}>{m.lastStatus ?? 'pending'}</StatusPill>
              <DeleteBtn onClick={() => remove(m.id)}>Delete</DeleteBtn>
            </Row>
          ))}
        </Card>
      </Wrap>
    </Page>
  );
};
