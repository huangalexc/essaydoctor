# Task Dependency Graph

## Visual Workflow

```
PARALLEL TRACKS (Can Start Immediately)
═══════════════════════════════════════

Track 1: INFRA                Track 7: FRONTEND
┌─────────────┐              ┌─────────────┐
│ INFRA-001   │              │   FE-001    │ (React setup)
│  (Postgres) │              │   FE-008    │ (Components)
└──────┬──────┘              │   FE-002    │ (Landing)
       │                     │   FE-009    │ (State mgmt)
       ↓                     └─────────────┘
┌─────────────┐
│ INFRA-002   │ ← START HERE: Critical Path
│  (DB Schema)│
└──────┬──────┘
       │
       ├──────────────────────────────────┬──────────────────┐
       ↓                                  ↓                  ↓
┌─────────────┐                  ┌─────────────┐   ┌─────────────┐
│ INFRA-003   │                  │  AUTH-001   │   │   AI-001    │
│   (Redis)   │                  │    (JWT)    │   │  (OpenAI)   │
└─────────────┘                  └──────┬──────┘   └──────┬──────┘
                                        │                  │
                  ┌─────────────────────┼──────────────────┤
                  ↓                     ↓                  ↓
           ┌─────────────┐      ┌─────────────┐   ┌─────────────┐
           │  AUTH-002   │      │  DRAFT-001  │   │   AI-002    │
           │  (Register) │      │  (Prompts)  │   │(Principles) │
           └─────────────┘      └─────────────┘   └──────┬──────┘
                  ↓                                       ↓
           ┌─────────────┐                       ┌─────────────┐
           │  AUTH-003   │                       │   AI-003    │
           │   (Login)   │                       │   (Edit)    │
           └─────────────┘                       └──────┬──────┘
                                                        │
                                                        ↓
                                 ┌──────────────────────────────┐
                                 │         AI-005               │
                                 │   (Essay Customization)      │
                                 └──────────────┬───────────────┘
                                                ↓
                                        MILESTONE 3
                                     (Week 5: AI Ready)

SCHOOL KNOWLEDGE AUTO-PULL PIPELINE
════════════════════════════════════

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ SCHOOL-001  │────▶│ SCHOOL-002  │────▶│ SCHOOL-003  │
│  (Search)   │     │  (Scraping) │     │(Summarize)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ↓
                    ┌───────────────────────────────────────┐
                    │         SCHOOL-004 (Status)           │
                    │         SCHOOL-005 (Data)             │
                    │         SCHOOL-006 (Fetch) ← KEY!     │
                    │         SCHOOL-007 (Delete)           │
                    │         SCHOOL-008 (Freshness)        │
                    └───────────────┬───────────────────────┘
                                    ↓
                            MILESTONE 4
                        (Week 6: Auto-Pull Ready)

TIER & PAYMENT SYSTEM
═════════════════════

┌─────────────┐
│  TIER-001   │ (Tier management)
│             │
└──────┬──────┘
       │
       ├──────────────┬──────────────┐
       ↓              ↓              ↓
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  TIER-002   │ │  TIER-003   │ │  TIER-004   │
│  (Tracking) │ │(Rate Limit) │ │  (Stripe)   │
└─────────────┘ └─────────────┘ └─────────────┘


FRONTEND INTEGRATION
════════════════════

         ┌─────────────┐
         │   FE-010    │ (API Client)
         │             │
         └──────┬──────┘
                │
    ┌───────────┼───────────┬───────────┐
    ↓           ↓           ↓           ↓
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ FE-003  │ │ FE-004  │ │ FE-005  │ │ FE-006  │
│ (Auth)  │ │ (Dash)  │ │ (Edit)  │ │(School) │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
                            ↓
                    MILESTONE 6
                (Week 9: Frontend Complete)


TESTING, SECURITY, DEPLOYMENT
══════════════════════════════

All Previous Tracks Complete
            ↓
    ┌───────┴───────┐
    ↓               ↓
┌─────────┐    ┌─────────┐
│  TEST   │    │   SEC   │
│ (Track8)│    │(Track9) │
└────┬────┘    └────┬────┘
     │              │
     └──────┬───────┘
            ↓
      ┌─────────┐
      │ DEPLOY  │
      │(Track10)│
      └────┬────┘
           ↓
    MILESTONE 8
 (Week 12: LAUNCH!)
```

## Dependency Matrix

| Task ID | Depends On | Blocks |
|---------|------------|--------|
| **INFRA-001** | - | INFRA-002 |
| **INFRA-002** | INFRA-001 | AUTH-001, AI-001, DRAFT-001, TIER-001, SCHOOL-004 |
| **INFRA-003** | - | SCHOOL-005 |
| **AUTH-001** | INFRA-002 | AUTH-002, AUTH-003, AUTH-004, AUTH-005 |
| **AI-001** | INFRA-002 | AI-002, AI-004 |
| **AI-002** | AI-001 | AI-003 |
| **AI-003** | AI-002 | AI-005 |
| **AI-004** | AI-001 | SCHOOL-003, SCHOOL-006 |
| **AI-005** | AI-003, SCHOOL-002 | TEST-003 |
| **SCHOOL-001** | - | SCHOOL-002 |
| **SCHOOL-002** | SCHOOL-001 | SCHOOL-003, AI-005 |
| **SCHOOL-003** | SCHOOL-002, AI-001 | SCHOOL-006 |
| **SCHOOL-004** | INFRA-002 | SCHOOL-005, SCHOOL-006 |
| **SCHOOL-006** | SCHOOL-003, SCHOOL-004 | FE-006 |
| **DRAFT-001** | INFRA-002 | FE-005 |
| **DRAFT-002** | INFRA-002 | DRAFT-003, DRAFT-004, DRAFT-005 |
| **TIER-001** | INFRA-002 | TIER-002, TIER-004 |
| **TIER-002** | TIER-001 | TIER-003 |
| **FE-001** | - | FE-002 through FE-010 |
| **FE-010** | FE-001, AUTH-001 | FE-003, FE-004, FE-005, FE-006 |
| **TEST-001** | - | All TEST tasks |
| **DEPLOY-004** | DEPLOY-003, SEC-001 | LAUNCH |

## Parallel Work Opportunities

### Week 1-2: Maximum Parallelization
```
Backend Team A:  INFRA-001 → INFRA-002 → AUTH-001
Backend Team B:  INFRA-003, INFRA-005
Frontend Team:   FE-001 → FE-008 → FE-002
AI Team:         AI-001, SCHOOL-001
```

### Week 3-4: Feature Development
```
Auth Developer:       AUTH-002, AUTH-003, AUTH-004
AI Developer:         AI-002 → AI-003
School Developer:     SCHOOL-002 → SCHOOL-003
Draft Developer:      DRAFT-001, DRAFT-002
Frontend Developer:   FE-003, FE-009, FE-010
```

### Week 5-6: Integration Phase
```
Backend Dev 1:   SCHOOL-004 through SCHOOL-008
Backend Dev 2:   DRAFT-003 through DRAFT-006
AI Developer:    AI-005 (depends on SCHOOL-002)
Tier Developer:  TIER-001 through TIER-004
Frontend Dev:    FE-004, FE-005
```

### Week 7-8: Full Stack Integration
```
Frontend Team:   FE-006, FE-007, connecting all APIs
Backend Team:    Bug fixes, optimization
```

### Week 9-10: Quality Assurance
```
QA Team:         TEST-002 through TEST-007
Security Team:   SEC-001 through SEC-005
Frontend:        DOC-004 (UI polish)
```

### Week 11-12: Deployment
```
DevOps:          DEPLOY-001 through DEPLOY-004
Documentation:   DOC-001, DOC-002
Everyone:        Final testing and bug fixes
```

## Bottleneck Tasks (Watch These Closely!)

### Critical Bottlenecks
1. **INFRA-002** (Database Schema)
   - Blocks: 15+ downstream tasks
   - *Mitigation*: Complete in Week 1, review thoroughly

2. **AUTH-001** (JWT Authentication)
   - Blocks: All auth flows, frontend integration
   - *Mitigation*: Start immediately after INFRA-002

3. **AI-003** (Essay Editing Endpoint)
   - Blocks: Core product value
   - *Mitigation*: Allocate senior developer, 10-hour buffer

4. **SCHOOL-006** (Auto-Pull Endpoint)
   - Blocks: Key differentiator feature
   - *Mitigation*: Complex task, needs full pipeline working first

### Risk Mitigation Strategy

For bottleneck tasks:
- ✓ Assign most experienced developers
- ✓ Start as early as dependencies allow
- ✓ Add 20% time buffer
- ✓ Have backup plan (simplified version)
- ✓ Daily progress checks

## Fast Track Option (Aggressive Timeline)

If you need to launch faster, consider:

1. **Defer Google OAuth** (AUTH-004) → Post-launch
2. **Simplify versioning** (DRAFT-003) → Basic only
3. **Manual school data** initially → Reduce SCHOOL complexity
4. **Single paid tier** → Skip Pro tier (TIER complexity)
5. **Basic UI** → Defer polish (DOC-004)

This could reduce timeline to **8-10 weeks** but with reduced feature set.

## Long Pole Items (Need Extra Time)

These tasks often take longer than estimated:

- **AI-003**: Essay editing (complex prompts)
- **SCHOOL-002**: Web scraping (site variation)
- **TIER-004**: Stripe integration (payment edge cases)
- **FE-005**: Editor view (UI complexity)
- **TEST-006**: Integration tests (comprehensive scenarios)

*Recommendation*: Add 50% buffer to these estimates.

---

**Use this graph to**:
- Identify what can start immediately
- Plan team assignments
- Spot potential bottlenecks early
- Track critical path progress
- Coordinate parallel work streams
