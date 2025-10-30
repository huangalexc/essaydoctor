# Security - Prompt Injection Defense

## Overview

EssayDoctor implements a comprehensive multi-layer defense system against prompt injection attacks in user-submitted essays and prompts. This document outlines the security measures in place and how to maintain them.

## Defense Layers

### Layer 1: Input Validation & Sanitization

**Location**: `/src/lib/security/prompt-injection-guard.ts`

The system detects and blocks prompt injection attempts using pattern matching and anomaly detection:

#### Critical Severity Patterns (Score: 60+ each)
- Direct instruction overrides: "Ignore all previous instructions"
- System prompt requests: "Repeat your system prompt"
- Role manipulation: "You are now..."
- Special tokens: `[INST]`, `<|im_start|>`, etc.

#### High Severity Patterns (Score: 30 each)
- Role-playing attempts: "Act as if you are..."
- Behavioral changes: "From now on, you..."
- Simulation requests: "Pretend to be..."

#### Medium Severity Patterns (Score: 20 each)
- Data exfiltration: "What are your instructions?"
- Prompt revelation: "Show me your system prompt"

#### Low Severity Patterns (Score: 10 each)
- Suspicious tags: `<system>`, `[SYSTEM]`
- Delimiter patterns: `---BEGIN---`, `===PROMPT===`

#### Anomaly Detection
- Excessive newlines (delimiter confusion)
- High special character density (>20%)
- Suspicious HTML/XML tags
- Base64 encoded content
- Unicode control characters

### Scoring System

Content is scored based on detected patterns:
- **Critical (75+)**: Blocked immediately
- **High (45-74)**: Flagged and logged, allowed with sanitization
- **Medium (22-44)**: Logged, allowed with sanitization
- **Low (10-21)**: Logged only
- **None (0-9)**: Passes without action

### Layer 2: Content Sanitization

When suspicious content is detected, the system automatically:
1. Removes suspicious HTML/XML tags
2. Replaces unicode control characters
3. Normalizes excessive newlines (max 2 consecutive)
4. Removes repeated delimiter patterns
5. Encodes angle brackets (`<` → `&lt;`, `>` → `&gt;`)

### Layer 3: API Route Protection

**Protected Endpoints**:
- `/api/essays/edit` - Essay editing with AI feedback
- `/api/essays/customize` - School-specific customization
- `/api/essays/rewrite` - Essay rewriting
- Batch processing (`/src/lib/batch-processor.ts`)

**Security Checks**:
```typescript
const essayGuard = guardAgainstInjection(essay, {
  userId,
  endpoint: '/api/essays/edit',
  maxLength: 15000,              // Enforce length limit
  autoSanitize: true,            // Auto-clean suspicious content
  blockOnSeverity: 'critical',   // Block only critical threats
});

if (!essayGuard.allowed) {
  return NextResponse.json({
    error: 'Content security check failed',
    reason: essayGuard.reason,
    severity: essayGuard.result.severity,
  }, { status: 400 });
}

const safeContent = essayGuard.sanitizedContent || essay;
```

### Layer 4: Monitoring & Alerting

**Security Event Logging**:
- All suspicious content is logged with context
- Events include: timestamp, userId, endpoint, severity, patterns
- High/Critical events trigger console warnings

**Accessing Security Stats**:
```typescript
import { getSecurityStats, getSecurityEvents } from '@/lib/security/prompt-injection-guard';

// Get overall statistics
const stats = getSecurityStats();
console.log(stats.totalEvents);
console.log(stats.bySeverity);
console.log(stats.topPatterns);

// Get recent events
const events = getSecurityEvents({
  limit: 50,
  minSeverity: 'high',
  since: new Date('2025-10-30'),
});
```

## API Usage

### Basic Detection

```typescript
import { detectInjection } from '@/lib/security/prompt-injection-guard';

const result = detectInjection(userEssay, {
  userId: 'user123',
  endpoint: '/api/essays/edit',
});

if (result.isSuspicious) {
  console.log(`Severity: ${result.severity}`);
  console.log(`Score: ${result.score}`);
  console.log(`Patterns: ${result.detectedPatterns}`);
}
```

### Content Sanitization

```typescript
import { sanitizeContent } from '@/lib/security/prompt-injection-guard';

const clean = sanitizeContent(suspiciousEssay);
// Returns sanitized version with threats removed
```

### Full Guard (Recommended)

```typescript
import { guardAgainstInjection } from '@/lib/security/prompt-injection-guard';

const guard = guardAgainstInjection(userInput, {
  userId: session.user.id,
  endpoint: request.url,
  maxLength: 15000,
  autoSanitize: true,
  blockOnSeverity: 'critical',
});

if (!guard.allowed) {
  // Handle blocked content
  return { error: guard.reason };
}

// Use sanitized content
const safeContent = guard.sanitizedContent || userInput;
```

## Testing

### Manual Testing

Run the comprehensive test suite:

```bash
npx tsx src/lib/security/test-manual.ts
```

This tests:
- ✅ Detection accuracy on known attack patterns
- ✅ False positive rate on legitimate content
- ✅ Sanitization effectiveness
- ✅ Guard function behavior
- ✅ Security statistics tracking

### Integration Testing

```typescript
import { testDetectionSystem } from '@/lib/security/prompt-injection-guard';

const results = testDetectionSystem();
console.log(`Pass rate: ${results.passed}/${results.results.length}`);
```

## Configuration

### Adjusting Severity Thresholds

Edit `/src/lib/security/prompt-injection-guard.ts`:

```typescript
// Determine severity based on score
let severity: InjectionDetectionResult['severity'] = 'none';
if (score >= 75) severity = 'critical';      // Adjust these thresholds
else if (score >= 45) severity = 'high';
else if (score >= 22) severity = 'medium';
else if (score >= 10) severity = 'low';
```

### Adding New Patterns

```typescript
const INJECTION_PATTERNS = {
  critical: [
    /your_new_critical_pattern/i,
    // Add more patterns here
  ],
  high: [
    /your_new_high_pattern/i,
  ],
  // ...
};
```

### Adjusting Content Limits

```typescript
// In API routes
const essayGuard = guardAgainstInjection(essay, {
  maxLength: 20000,  // Increase max length
  blockOnSeverity: 'high',  // Block high severity too
});
```

## Security Best Practices

### DO
- ✅ Always use `guardAgainstInjection()` for user input
- ✅ Enable `autoSanitize` for all endpoints
- ✅ Log security events for forensics
- ✅ Monitor security stats regularly
- ✅ Test with known attack vectors
- ✅ Keep patterns updated with new threats

### DON'T
- ❌ Disable security checks in production
- ❌ Trust user input without validation
- ❌ Ignore low/medium severity warnings
- ❌ Expose raw security event data to users
- ❌ Set `blockOnSeverity` below 'critical' without careful testing

## Performance Impact

- Detection: ~1-5ms per check
- Sanitization: ~0.5-2ms per operation
- Memory: <1MB for 1000 logged events

## Future Enhancements

1. **Database Logging**: Move from in-memory to persistent storage
2. **Admin Dashboard**: UI for viewing security events
3. **ML-based Detection**: Train model on attack patterns
4. **Rate Limiting by Severity**: Throttle users with repeated attacks
5. **Webhook Alerts**: Real-time notifications for critical events
6. **Pattern Updates**: Automated updates from security feeds

## Incident Response

### If an attack is detected:

1. **Check the logs**:
   ```typescript
   const events = getSecurityEvents({ userId: 'suspect', minSeverity: 'high' });
   ```

2. **Review the patterns**:
   - What patterns were triggered?
   - Is this a false positive?

3. **Take action**:
   - For critical: Content is already blocked
   - For high: Review and potentially flag user
   - For medium/low: Monitor for patterns

4. **Update defenses**:
   - Add new patterns if novel attack discovered
   - Adjust scoring if false positives occur

## Support

For security concerns or questions:
- Review code: `/src/lib/security/prompt-injection-guard.ts`
- Run tests: `npx tsx src/lib/security/test-manual.ts`
- Check stats: Call `getSecurityStats()` in your code

## Version History

- **v1.0.0** (2025-10-30): Initial implementation
  - Multi-layer detection system
  - Auto-sanitization
  - Security event logging
  - Integration with all API routes
