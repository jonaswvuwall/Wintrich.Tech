# Data Interpretation System

## Overview

The application now includes a comprehensive interpretation system that helps users understand the technical data returned from network analysis tools. Each data point has contextual explanations displayed via interactive tooltips.

## Features

### 1. **InfoTooltip Component**
- **Location:** `src/presentation/components/common/InfoTooltip.tsx`
- **Purpose:** Displays helpful explanations when users hover over or click the `?` icon
- **Color-coded by severity:**
  - 🔵 **Blue (Info):** General information
  - 🟢 **Green (Success):** Positive indicators
  - 🟡 **Yellow (Warning):** Caution required
  - 🔴 **Red (Error):** Critical issues

### 2. **Interpretation Utilities**
- **Location:** `src/shared/utils/interpretations.ts`
- **Purpose:** Provides context-aware explanations for all network data

## Interpretation Categories

### Ping Tool
- **Latency:** Explains connection speed quality
  - < 20ms: Excellent (gaming, real-time)
  - < 50ms: Good (streaming, browsing)
  - < 100ms: Acceptable (general use)
  - < 200ms: Slow (noticeable delays)
  - 200ms+: Very slow (poor experience)

- **Reachability:** Host connectivity status
- **IP Address:** Public vs private network identification

### DNS Lookup
- **TTL (Time To Live):** Cache duration explanation
  - Short (< 5 min): Frequently changing IPs
  - Standard (< 1 hour): Normal caching
  - Long (< 24 hours): Stable infrastructure
  - Very long (24+ hours): Rarely changes

- **Record Types:**
  - **A Records:** IPv4 addresses
  - **AAAA Records:** IPv6 addresses
  - **MX Records:** Email server routing
  - **NS Records:** Authoritative name servers
  - **TXT Records:** Domain verification and policies

### HTTP Analysis
- **Status Codes:** HTTP response meaning
  - 2xx: Success responses
  - 3xx: Redirections
  - 4xx: Client errors
  - 5xx: Server errors

- **Response Time:** Server performance assessment
  - < 100ms: Very fast
  - < 300ms: Fast
  - < 1000ms: Acceptable
  - < 3000ms: Slow
  - 3000ms+: Very slow

- **Content Type:** Data format identification
- **Headers:** Security and metadata information

### TLS/SSL Inspector
- **Certificate Expiry:** Validity status
  - < 0 days: EXPIRED (critical)
  - < 7 days: Expiring soon (urgent)
  - < 30 days: Renew soon (warning)
  - < 90 days: Monitor renewal
  - 90+ days: Valid and secure

- **Signature Algorithm:** Cryptographic security
  - SHA-256/384/512: Strong and modern
  - SHA-1: Weak and deprecated
  - MD5: Insecure (broken)

- **Certificate Version:** TLS protocol version
- **SANs:** Domain coverage (wildcard/multi-domain)

## Usage

### Adding Interpretations to New Fields

1. **Define the interpretation function** in `interpretations.ts`:
```typescript
export const interpretNewField = (value: any): Interpretation => {
  return {
    meaning: 'Brief summary',
    context: 'Detailed explanation for users',
    severity: 'info' | 'success' | 'warning' | 'error',
  };
};
```

2. **Import in your tool component:**
```typescript
import { InfoTooltip } from './common/InfoTooltip';
import { interpretNewField } from '../../shared/utils/interpretations';
```

3. **Add to ResultLabel:**
```tsx
<ResultLabel>
  Field Name
  <InfoTooltip interpretation={interpretNewField(value)} />
</ResultLabel>
```

## Benefits

✅ **User Education:** Users learn networking concepts while using the tool
✅ **Better Decision Making:** Context helps users understand when action is needed
✅ **Reduced Support:** Self-explanatory data reduces confusion
✅ **Professional UX:** Makes complex technical data accessible

## Future Enhancements

Potential additions:
- Click-to-copy functionality for technical values
- Expandable detailed views for complex data
- Recommendations for resolving issues
- Historical data comparisons
- Export explanations with data

## Customization

To modify tooltip appearance, edit the styled components in `InfoTooltip.tsx`:
- **Colors:** Adjust theme colors in `src/presentation/styles/theme.ts`
- **Positioning:** Modify `TooltipContent` position properties
- **Animation:** Update transition and hover effects
- **Mobile:** Customize responsive breakpoints

---

**Note:** All interpretations are designed to be accurate yet accessible for both technical and non-technical users.
