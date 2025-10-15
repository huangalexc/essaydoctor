# Sprint Planning Template

Use this template to plan 1-week sprints and track progress.

---

## Sprint [X] - Week [Y] of 12

**Sprint Goal**: [One-sentence description of what you'll achieve this week]

**Dates**: [Start Date] - [End Date]

### Team Capacity
- Developer 1: [X] hours available
- Developer 2: [X] hours available
- Developer 3: [X] hours available
- **Total**: [X] hours

---

## Planned Tasks

### Critical Priority (Must Complete)
- [ ] **TASK-ID**: Task Name (`X hours`, Assigned to: [Name])
  - [ ] Subtask 1
  - [ ] Subtask 2
  - Dependencies: [List dependencies]
  - Completion criteria: [How we know it's done]

### High Priority (Should Complete)
- [ ] **TASK-ID**: Task Name (`X hours`, Assigned to: [Name])
  - [ ] Subtask 1

### Medium Priority (Nice to Have)
- [ ] **TASK-ID**: Task Name (`X hours`, Assigned to: [Name])

**Total Committed Hours**: [X] hours (aim for 80% of capacity)

---

## Daily Standups

### Monday
**What we did**:
- [Update progress]

**What we're doing today**:
- [Today's focus]

**Blockers**:
- [Any issues]

### Tuesday
**What we did**:
**What we're doing today**:
**Blockers**:

### Wednesday
**What we did**:
**What we're doing today**:
**Blockers**:

### Thursday
**What we did**:
**What we're doing today**:
**Blockers**:

### Friday
**What we did**:
**What we're doing today**:
**Blockers**:

---

## Sprint Retrospective

### Completed Tasks ✅
- [x] TASK-ID: Task Name (Actual: `X hours`)
- [x] TASK-ID: Task Name (Actual: `X hours`)

**Total Completed**: [X] hours

### Incomplete Tasks 🔄
- [ ] TASK-ID: Task Name (Reason: [Why incomplete])
  - Roll over to Sprint [X+1]?

### What Went Well 🎉
- [Success 1]
- [Success 2]

### What Could Be Improved 🔧
- [Challenge 1]
- [Challenge 2]

### Action Items for Next Sprint 📋
- [ ] [Action 1]
- [ ] [Action 2]

### Velocity Metrics
- **Planned hours**: [X]
- **Completed hours**: [X]
- **Velocity**: [X]% (completed/planned)
- **Tasks committed**: [X]
- **Tasks completed**: [X]

---

## Sprint [X] Notes
[Any additional context, decisions made, or important discussions]

---

# Example Sprints

## Sprint 1 - Week 1 of 12

**Sprint Goal**: Set up infrastructure foundation and begin authentication

**Dates**: Oct 15 - Oct 21, 2025

### Team Capacity
- Backend Dev: 35 hours
- Frontend Dev: 40 hours
- **Total**: 75 hours

---

## Planned Tasks

### Critical Priority (Must Complete)
- [ ] **INFRA-001**: Set up PostgreSQL with pgvector (`4 hours`, Assigned to: Backend Dev)
  - [ ] Install PostgreSQL 15+
  - [ ] Install pgvector extension
  - [ ] Configure connection pooling
  - [ ] Test vector operations
  - Dependencies: None
  - Completion criteria: Can connect, store, and query vectors

- [ ] **INFRA-002**: Database schema implementation (`8 hours`, Assigned to: Backend Dev)
  - [ ] Create users table
  - [ ] Create drafts table with versioning
  - [ ] Create school_major_data table
  - [ ] Add all indexes
  - [ ] Write seed data
  - Dependencies: INFRA-001
  - Completion criteria: All migrations run, seed data loads

- [ ] **INFRA-003**: Redis caching setup (`3 hours`, Assigned to: Backend Dev)
  - [ ] Install Redis
  - [ ] Configure connection
  - [ ] Test cache operations
  - Dependencies: None
  - Completion criteria: Can set/get cached data

- [ ] **FE-001**: React + Tailwind setup (`4 hours`, Assigned to: Frontend Dev)
  - [ ] Initialize React with Vite
  - [ ] Configure TailwindCSS
  - [ ] Set up routing
  - [ ] Create base layout
  - Dependencies: None
  - Completion criteria: Dev server runs, Tailwind working

### High Priority (Should Complete)
- [ ] **AUTH-001**: JWT authentication system (`6 hours`, Assigned to: Backend Dev)
  - [ ] JWT generation/verification
  - [ ] Auth middleware
  - [ ] Token refresh
  - Dependencies: INFRA-002
  - Completion criteria: Can generate and validate JWTs

- [ ] **FE-008**: Component library basics (`8 hours`, Assigned to: Frontend Dev)
  - [ ] Button component
  - [ ] Input/TextArea
  - [ ] Modal
  - [ ] Card
  - [ ] Loading states
  - Dependencies: FE-001
  - Completion criteria: Storybook with all components

### Medium Priority (Nice to Have)
- [ ] **FE-002**: Landing page (`6 hours`, Assigned to: Frontend Dev)
  - [ ] Hero section
  - [ ] Features showcase
  - Dependencies: FE-001, FE-008
  - Completion criteria: Responsive landing page deployed

- [ ] **INFRA-005**: Docker setup (`4 hours`, Assigned to: Backend Dev)
  - [ ] Backend Dockerfile
  - [ ] Frontend Dockerfile
  - [ ] docker-compose.yml
  - Dependencies: None
  - Completion criteria: Full stack runs in Docker

**Total Committed Hours**: 43 hours (57% capacity - conservative for first sprint)

---

## Sprint 2 - Week 2 of 12

**Sprint Goal**: Complete core authentication flows and begin AI integration

**Dates**: Oct 22 - Oct 28, 2025

### Planned Tasks

### Critical Priority
- [ ] **AUTH-002**: Registration with email verification (`5 hours`)
- [ ] **AUTH-003**: Login with security features (`4 hours`)
- [ ] **AI-001**: OpenAI API integration (`3 hours`)
- [ ] **FE-003**: Authentication pages (`8 hours`)
- [ ] **FE-010**: API client layer (`6 hours`)

### High Priority
- [ ] **AUTH-004**: Google OAuth (`5 hours`)
- [ ] **AI-002**: Essay principles framework (`8 hours`)
- [ ] **FE-009**: State management (`5 hours`)

**Total Committed**: 44 hours

---

## Sprint 3 - Week 3 of 12

**Sprint Goal**: Launch AI essay editing capability and school data pipeline

### Critical Priority
- [ ] **AI-003**: Essay editing endpoint (`10 hours`)
- [ ] **SCHOOL-001**: Search API integration (`4 hours`)
- [ ] **SCHOOL-002**: Playwright scraping (`8 hours`)
- [ ] **DRAFT-001**: Prompt upload (`5 hours`)
- [ ] **DRAFT-002**: Draft creation (`5 hours`)
- [ ] **FE-004**: Dashboard page (`10 hours`)

**Total Committed**: 42 hours

---

## Sprint 4 - Week 4 of 12

**Sprint Goal**: Complete school auto-pull system and draft management

### Critical Priority
- [ ] **SCHOOL-003**: AI summarization pipeline (`6 hours`)
- [ ] **SCHOOL-004**: Status endpoint (`3 hours`)
- [ ] **SCHOOL-005**: Data endpoint (`4 hours`)
- [ ] **SCHOOL-006**: Fetch endpoint (`10 hours`)
- [ ] **DRAFT-003**: Version control (`6 hours`)
- [ ] **DRAFT-004**: Tagging system (`4 hours`)
- [ ] **FE-005**: Editor view (Part 1) (`6 hours`)

**Total Committed**: 39 hours

---

## Sprint 5 - Week 5 of 12

**Sprint Goal**: Essay customization engine and tier management

### Critical Priority
- [ ] **AI-005**: Essay customization (`10 hours`)
- [ ] **SCHOOL-007**: Delete endpoint (`2 hours`)
- [ ] **SCHOOL-008**: Freshness logic (`4 hours`)
- [ ] **TIER-001**: Tier management (`6 hours`)
- [ ] **TIER-002**: Usage tracking (`6 hours`)
- [ ] **FE-005**: Editor view (Part 2) (`6 hours`)
- [ ] **FE-006**: School selector modal (`6 hours`)

**Total Committed**: 40 hours

---

## Sprint 6 - Week 6 of 12

**Sprint Goal**: Payment integration and frontend feature completion

### Critical Priority
- [ ] **TIER-003**: Rate limiting (`5 hours`)
- [ ] **TIER-004**: Stripe integration (`8 hours`)
- [ ] **DRAFT-005**: Draft storage limits (`4 hours`)
- [ ] **DRAFT-006**: Draft CRUD endpoints (`5 hours`)
- [ ] **FE-007**: Pricing page (`6 hours`)
- [ ] **AI-004**: Text embeddings (`5 hours`)

**Total Committed**: 33 hours

---

## Sprint 7 - Week 7-8 of 12

**Sprint Goal**: Integration testing and bug fixes

### Critical Priority
- [ ] **TEST-001**: Testing infrastructure (`4 hours`)
- [ ] **TEST-002**: Auth tests (`6 hours`)
- [ ] **TEST-003**: AI tests (`8 hours`)
- [ ] **TEST-004**: School pipeline tests (`8 hours`)
- [ ] **TEST-005**: Tier tests (`6 hours`)
- [ ] **TIER-005**: Upgrade flows (`5 hours`)
- [ ] Integration bug fixes (`20 hours buffer`)

**Total Committed**: 57 hours (2-week sprint)

---

## Sprint 8 - Week 9-10 of 12

**Sprint Goal**: Security hardening and staging deployment

### Critical Priority
- [ ] **SEC-001**: HTTPS setup (`3 hours`)
- [ ] **SEC-002**: Security headers (`3 hours`)
- [ ] **SEC-003**: Input validation (`6 hours`)
- [ ] **SEC-004**: Security monitoring (`4 hours`)
- [ ] **SEC-005**: Backup strategy (`4 hours`)
- [ ] **TEST-006**: Integration tests (`10 hours`)
- [ ] **TEST-007**: Load testing (`8 hours`)
- [ ] **DEPLOY-001**: CI/CD pipeline (`6 hours`)
- [ ] **DEPLOY-002**: Monitoring setup (`5 hours`)
- [ ] **DEPLOY-003**: Staging deployment (`4 hours`)

**Total Committed**: 53 hours (2-week sprint)

---

## Sprint 9 - Week 11-12 of 12

**Sprint Goal**: Production launch and documentation

### Critical Priority
- [ ] **DEPLOY-004**: Production deployment (`6 hours`)
- [ ] **DEPLOY-005**: Migration workflow (`4 hours`)
- [ ] **DOC-001**: API documentation (`6 hours`)
- [ ] **DOC-002**: User documentation (`8 hours`)
- [ ] **DOC-004**: UI polish (`8 hours`)
- [ ] **INFRA-004**: AWS production setup (`6 hours`)
- [ ] Final testing and fixes (`20 hours buffer`)

### Nice to Have
- [ ] **DOC-003**: Developer docs (`4 hours`)
- [ ] **DOC-005**: Marketing materials (`6 hours`)

**Total Committed**: 58 hours (2-week sprint)

---

## How to Use This Template

1. **Copy** a sprint section for each week
2. **Update** task IDs from tasks.json
3. **Assign** tasks based on team skills
4. **Commit** to 70-80% of capacity (buffer for unknowns)
5. **Track** daily progress in standup section
6. **Review** in retrospective at sprint end
7. **Adjust** next sprint based on velocity

## Tips for Success

- ✓ Start each sprint with clear, measurable goals
- ✓ Break down tasks > 8 hours into subtasks
- ✓ Have daily check-ins (even async)
- ✓ Don't overcommit - leave buffer time
- ✓ Celebrate wins in retrospectives
- ✓ Learn from blockers and adjust
- ✓ Keep tasks visible and update status daily

---

*Track your sprints here to stay on target for Week 12 launch!*
