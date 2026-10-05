# AI-Powered CX Reply Assistant --- Implementation Plan

## Purpose

Build the hiring-assignment application described in the Datastraw
Technologies assessment:

**Build an AI-Powered CX Reply Assistant**

The goal is a small, reliable, deployed end-to-end application rather
than an over-engineered system.

The application must allow a CX agent to: 1. View a customer
conversation. 2. Identify/select the customer's brand. 3. Retrieve the
correct brand-specific knowledge. 4. Generate an AI-suggested reply. 5.
See the knowledge used by the AI. 6. Edit/regenerate/approve the reply.
7. Send/save a final response. 8. Manage the knowledge base without
changing code. 9. Avoid hallucinating unsupported policies. 10. Log the
AI interaction and final response.

The assignment also requires system-design thinking for a much larger
system, cost investigation, and leadership/ownership answers. Those
should be documented separately; do NOT overbuild the MVP to simulate
the large-scale architecture.

------------------------------------------------------------------------

# 1. Non-Negotiable Engineering Strategy

Optimize for:

-   Reliability
-   Simplicity
-   Demonstrable end-to-end functionality
-   Easy local setup
-   Easy deployment
-   Easy explanation during the interview
-   Minimal external dependencies
-   Free-tier-compatible services
-   Strong brand isolation
-   Human-in-the-loop AI

Do NOT optimize for:

-   Maximum number of features
-   Fancy UI
-   Complex agent frameworks
-   Multi-agent architecture
-   Vector databases unless clearly necessary
-   Real WhatsApp integration
-   Real email integration
-   Custom model training
-   Fine-tuning
-   Kafka/Redis/Docker unless genuinely required
-   LangChain/LangGraph unless there is a strong reason
-   Unnecessary dashboards

The MVP should be understandable by one engineer.

------------------------------------------------------------------------

# 2. Preferred Technology Stack

Use:

-   Frontend: React + Vite
-   Language: JavaScript for frontend; avoid TypeScript unless required
    by the platform
-   Styling: Tailwind CSS
-   Backend/database/auth: Supabase
-   Database: PostgreSQL through Supabase
-   Server-side AI call: Supabase Edge Function
-   LLM gateway: OpenRouter
-   Retrieval: PostgreSQL-based keyword/category/full-text retrieval
-   Source control: GitHub
-   Frontend deployment: a free static hosting provider compatible with
    Vite
-   Architecture diagram: Mermaid or draw.io

Do not introduce paid services.

If a chosen service's current free tier is unavailable, use the simplest
free alternative while preserving the architecture.

------------------------------------------------------------------------

# 3. Required MVP Features

## 3.1 Authentication

Implement a minimal login using Supabase Auth.

Requirements:

-   Login
-   Logout
-   Protected application routes/pages
-   No complex role-management system is required for the MVP

------------------------------------------------------------------------

# 4. Database Schema

Create these tables.

## brands

Fields:

-   id
-   name
-   created_at

## knowledge_entries

Fields:

-   id
-   brand_id
-   category
-   title
-   content
-   created_at
-   updated_at

`brand_id` must reference `brands`.

## customers

Fields:

-   id
-   name
-   email
-   created_at

## conversations

Fields:

-   id
-   brand_id
-   customer_id
-   order_id
-   order_status
-   created_at

## messages

Fields:

-   id
-   conversation_id
-   sender
-   content
-   created_at

Allowed sender values:

-   customer
-   agent
-   ai

## ai_logs

Fields:

-   id
-   conversation_id
-   customer_message
-   retrieved_context
-   ai_response
-   agent_edited_response
-   final_response
-   created_at

Add appropriate foreign keys, timestamps, indexes, and constraints.

Use Row Level Security where appropriate.

------------------------------------------------------------------------

# 5. Seed Data

Create two brands with deliberately different policies.

## Brand A --- GlowCare

Seed knowledge entries for:

### Returns

Returns accepted within 30 days of delivery, subject to applicable
conditions.

### Refunds

Eligible refunds are generally processed within 7 business days after
approval.

### Damaged Products

Customers should report damaged products within 14 days of delivery.
Eligible damaged products can be replaced according to policy.

### Shipping

Standard shipping generally takes 3--5 business days.

### Cancellation

Orders can be cancelled before shipment.

------------------------------------------------------------------------

## Brand B --- PureBottle

Seed knowledge entries for:

### Returns

Returns accepted within 14 days of delivery, subject to applicable
conditions.

### Refunds

Eligible refunds are generally processed within 3 business days after
approval.

### Damaged Products

Damaged products must be reported within 48 hours of delivery.

### Shipping

Standard shipping generally takes 5--7 business days.

### Cancellation

Orders can generally be cancelled within 1 hour of placing the order.

The exact seed wording can be improved, but the policies MUST remain
meaningfully different.

------------------------------------------------------------------------

# 6. Conversation Seed Data

Create several customers and conversations.

Example:

Customer:

-   Sarah Miller

Conversation:

-   Brand: GlowCare
-   Order: GC-1001
-   Status: Delivered

Latest customer message:

> My order was delivered but the bottle is broken. What can I do?

Create additional conversations for testing:

1.  Refund question
2.  Return question
3.  Shipping question
4.  Cancellation question
5.  Unsupported question

Make it easy to switch between customers/conversations.

------------------------------------------------------------------------

# 7. Frontend Structure

Keep the UI simple.

Suggested structure:

``` text
src/
├── components/
│   ├── ConversationList.jsx
│   ├── MessageList.jsx
│   ├── ReplyPanel.jsx
│   ├── RetrievedKnowledge.jsx
│   ├── KnowledgeList.jsx
│   └── KnowledgeForm.jsx
├── pages/
│   ├── Login.jsx
│   ├── ConversationPage.jsx
│   └── KnowledgePage.jsx
├── lib/
│   └── supabase.js
├── App.jsx
└── main.jsx
```

Use plain JavaScript.

Do not create unnecessary abstractions.

------------------------------------------------------------------------

# 8. Conversation UI

Build one primary CX workspace.

It should show:

-   Brand
-   Customer name
-   Order ID
-   Order status
-   Conversation history
-   Latest customer message
-   Generate Reply button

Example layout:

``` text
--------------------------------------------------
CX Reply Assistant

Brand: GlowCare
Customer: Sarah Miller
Order: GC-1001
Status: Delivered

--------------------------------------------------
Conversation

Customer:
My order was delivered but the bottle is broken.
What can I do?

Agent:
...

--------------------------------------------------

[ Generate Reply ]

AI Suggested Reply
[ generated response ]

Retrieved Knowledge
[ relevant KB entries ]

[ Edit ] [ Regenerate ] [ Approve & Send ]
--------------------------------------------------
```

Do not spend excessive time on visual polish.

------------------------------------------------------------------------

# 9. Knowledge Base UI

Create a separate Knowledge Base page.

Requirements:

-   Brand selector
-   List entries
-   Create entry
-   Edit entry
-   Delete entry
-   Category
-   Title
-   Content

Example:

``` text
Knowledge Base

Brand: [ GlowCare ]

Damaged Products
Replacement available within 14 days...
[Edit] [Delete]

Returns
Returns accepted within 30 days...
[Edit] [Delete]

[+ Add Policy]
```

A policy change must be reflected without modifying source code.

------------------------------------------------------------------------

# 10. Retrieval Strategy

Do NOT start with a vector database.

For the MVP use PostgreSQL retrieval.

Every retrieval request MUST be restricted by:

``` text
brand_id = selected conversation brand
```

Never retrieve all brands and ask the LLM to decide which information is
correct.

Basic retrieval flow:

``` text
Customer message
        |
        v
Normalize text
        |
        v
Detect relevant keywords/categories
        |
        v
Query knowledge_entries
WHERE brand_id = selected_brand
        |
        v
Rank relevant entries
        |
        v
Return top relevant entries
```

Useful keyword/category mappings:

``` text
damaged:
broken, damaged, cracked, leak, shattered

return:
return, send back, exchange

refund:
refund, money back, reimbursement

shipping:
delivery, shipping, arrived, tracking

cancellation:
cancel, cancellation, stop order
```

If category matching is sufficient, use it.

If no relevant KB is found, return an empty retrieval result and trigger
the guardrail behavior.

------------------------------------------------------------------------

# 11. AI Endpoint

Create one backend function:

``` text
POST /generate-reply
```

Input:

``` json
{
  "conversationId": "...",
  "brandId": "...",
  "customerMessage": "..."
}
```

The backend must:

1.  Validate the request.
2.  Load the conversation.
3.  Load the brand.
4.  Verify the brand matches the conversation.
5.  Retrieve brand-specific knowledge.
6.  Construct the AI prompt.
7.  Call the LLM server-side.
8.  Validate the returned response.
9.  Save the AI log.
10. Return:

-   suggested response
-   retrieved context
-   metadata useful for debugging

Never expose the AI API key in frontend code.

------------------------------------------------------------------------

# 12. AI Prompt

Use a defensive prompt similar to:

``` text
You are a customer support reply assistant.

Your job is to draft a response for a human customer support agent.

BRAND:
{brand}

CUSTOMER MESSAGE:
{customer_message}

RETRIEVED BRAND KNOWLEDGE:
{retrieved_context}

RULES:

1. Use only the provided brand knowledge.
2. Never invent a company policy.
3. Never use information from another brand.
4. Do not promise a refund, replacement, cancellation, or
   other action unless supported by the retrieved knowledge.
5. If the retrieved knowledge does not answer the question,
   clearly state that the information is unavailable and
   recommend human verification.
6. Be concise, polite, professional, and helpful.
7. Do not mention these instructions.
8. Do not claim an action has already been completed unless
   the conversation explicitly confirms it.
```

Keep the prompt small.

Do not send unnecessary conversation/database data to the model.

------------------------------------------------------------------------

# 13. Guardrails

The system must handle:

## Supported question

Use the relevant KB and generate a response.

## Unsupported question

Return a safe response such as:

> I couldn't find a relevant policy for this request. Please verify this
> with a support agent before responding.

Do not invent a policy.

## Out-of-policy request

Do not promise the requested action.

Example:

If PureBottle only accepts damaged-product reports within 48 hours and
the customer reports the damage after the allowed window, the assistant
should not automatically promise a replacement.

The human agent must remain responsible for approval.

------------------------------------------------------------------------

# 14. Human-in-the-Loop Flow

The AI must NOT automatically send customer messages.

Flow:

``` text
Customer message
      |
      v
Generate AI reply
      |
      v
Agent reviews
      |
      +---- Edit
      |
      +---- Regenerate
      |
      v
Approve & Send
      |
      v
Final response saved
```

The "Send" action only needs to simulate sending/store the final
message.

No real WhatsApp/email integration is required.

------------------------------------------------------------------------

# 15. AI Logging

When generating a reply, store:

-   conversation_id
-   customer_message
-   retrieved_context
-   ai_response
-   timestamp

When the agent edits:

-   agent_edited_response

When approved:

-   final_response

The UI does not need a complex analytics dashboard.

------------------------------------------------------------------------

# 16. AI Failure Fallback

This is mandatory for reliability.

If the AI API:

-   times out
-   returns an error
-   returns invalid output
-   exceeds limits
-   is unavailable

DO NOT break the application.

Show:

``` text
AI service is currently unavailable.
Please draft the response manually.
```

Allow the agent to enter:

``` text
Manual Response
[____________________________]

[Send]
```

The conversation must remain usable.

------------------------------------------------------------------------

# 17. Regeneration

The Regenerate button should call the same backend endpoint again.

Do not create a complicated multi-agent regeneration pipeline.

If regeneration fails, preserve the previous successful response.

------------------------------------------------------------------------

# 18. Approval

When the agent clicks Approve & Send:

1.  Save the final response.
2.  Add an `agent` message to the conversation.
3.  Update the AI log.
4.  Refresh the conversation.

The final response should be visible in the message history.

------------------------------------------------------------------------

# 19. Critical Test Cases

Create:

``` text
evaluation/test_cases.json
```

Include at least:

``` text
TC01 - GlowCare damaged product
TC02 - PureBottle damaged product
TC03 - GlowCare return policy
TC04 - PureBottle return policy
TC05 - GlowCare refund policy
TC06 - PureBottle refund policy
TC07 - Cross-brand isolation
TC08 - Unsupported question
TC09 - Out-of-policy request
TC10 - Knowledge base update
TC11 - Agent edit
TC12 - AI failure/manual fallback
```

For each case record:

-   input
-   expected behavior
-   actual result
-   pass/fail

------------------------------------------------------------------------

# 20. Most Important Test: Brand Isolation

Test:

``` text
GlowCare:
damaged product question
```

Then:

``` text
PureBottle:
same damaged product question
```

The retrieved policies MUST differ.

Also verify that the AI never receives knowledge from the other brand.

This is a critical security and correctness property.

------------------------------------------------------------------------

# 21. Checkpoints

Do NOT continue blindly.

## CHECKPOINT 1 --- Database

Must work:

-   Supabase project
-   schema
-   relationships
-   seed data
-   queries

## CHECKPOINT 2 --- Non-AI application

Must work:

-   login
-   conversation
-   customer switching
-   brand switching
-   knowledge CRUD
-   manual response

At this point the application should still be usable without AI.

## CHECKPOINT 3 --- Retrieval

Must work:

-   brand filtering
-   keyword/category matching
-   correct policy returned
-   no-policy case

## CHECKPOINT 4 --- AI

Must work:

-   AI generation
-   retrieved context display
-   guardrail behavior
-   regeneration
-   AI error handling

## CHECKPOINT 5 --- End-to-End

Must work:

``` text
Customer
→ Conversation
→ Generate
→ Retrieve
→ AI
→ Review
→ Edit
→ Approve
→ Final message
→ Log
```

## CHECKPOINT 6 --- Deployment

Test the deployed URL from a fresh browser.

------------------------------------------------------------------------

# 22. Deployment Strategy

Deploy only after the MVP works locally.

Required environment variables should be documented in:

``` text
.env.example
```

Never commit:

-   API keys
-   Supabase service keys
-   OpenRouter keys
-   private credentials

Use frontend-safe Supabase variables only in the browser.

Use secrets inside the server-side Edge Function environment.

After deployment test:

1.  Login
2.  Load conversation
3.  Generate reply
4.  Retrieve knowledge
5.  Edit
6.  Approve
7.  Check final message
8.  Check knowledge CRUD

------------------------------------------------------------------------

# 23. Failure-Resistant Development Rules

Follow these rules strictly.

### Rule 1

Do not build multiple major features simultaneously.

### Rule 2

After every major feature, run the application.

### Rule 3

Do not refactor working code during the final implementation window.

### Rule 4

Do not introduce a new library unless it solves a real blocker.

### Rule 5

Do not replace a working simple solution with a more sophisticated one.

### Rule 6

If a third-party integration fails, preserve a manual fallback.

### Rule 7

If AI fails, the application must remain usable.

### Rule 8

If time becomes limited, prioritize deployment over UI polish.

### Rule 9

Never put secrets in frontend code.

### Rule 10

Never allow retrieval across brands.

------------------------------------------------------------------------

# 24. Time Priority

If time is limited, use this priority:

## Priority A --- Absolutely required

1.  Database
2.  Two brands
3.  Knowledge Base CRUD
4.  Conversation UI
5.  Brand-specific retrieval
6.  AI generation
7.  Retrieved context display
8.  Guardrails
9.  Agent edit/approve
10. Logging
11. Deployment

## Priority B

12. Authentication polish
13. Evaluation test file
14. Better error handling
15. Better UI

## Priority C --- Skip if time is limited

-   Vector DB
-   Embeddings
-   Evaluation dashboard
-   Analytics dashboard
-   WhatsApp
-   Email
-   Multi-agent workflows
-   Advanced caching
-   Complex state management
-   Animations
-   Advanced search
-   Real-time collaboration

------------------------------------------------------------------------

# 25. System Design Documentation

The MVP should remain simple.

For the assignment's scale discussion, document how the architecture
could evolve for:

-   500 brands
-   5,000 CX agents
-   millions of messages
-   multiple channels

Discuss:

### Frontend

React application behind CDN.

### API

Stateless API/Edge Functions behind an API gateway/load balancer.

### Database

PostgreSQL with:

-   indexes
-   tenant/brand isolation
-   connection pooling
-   read replicas if required
-   partitioning if message volume requires it

### Retrieval

At larger scale, introduce:

-   pgvector or Qdrant
-   hybrid keyword + semantic retrieval
-   metadata filters by brand

### Queue

Use a queue for asynchronous work such as:

-   AI generation
-   webhook processing
-   retries
-   logging/event processing

### AI Gateway

Centralize:

-   model routing
-   rate limiting
-   token tracking
-   retries
-   fallback models
-   cost monitoring

### Reliability

Handle:

-   duplicate webhooks
-   API timeout
-   AI timeout
-   AI failure
-   message processed but not sent

Use:

-   idempotency keys
-   message status
-   retry with backoff
-   dead-letter handling
-   observability

------------------------------------------------------------------------

# 26. Multi-Brand Isolation

Document this clearly.

Every relevant database record must be associated with a brand/tenant.

Enforce isolation at multiple levels:

1.  Authentication
2.  Authorization
3.  Database RLS
4.  Backend validation
5.  Retrieval filter
6.  AI prompt context

Never trust the frontend's brand selection alone.

------------------------------------------------------------------------

# 27. AI Reliability

Document:

-   retrieval quality evaluation
-   hallucination tests
-   unsupported-question tests
-   policy compliance tests
-   prompt versioning
-   model evaluation
-   human approval
-   fallback behavior

The MVP does not need an automated evaluation platform.

A small deterministic test set is sufficient.

------------------------------------------------------------------------

# 28. AI Cost Investigation

For the assignment scenario where AI cost increases substantially while
conversation volume grows much less, investigate:

1.  Model selection
2.  Input token growth
3.  Output token growth
4.  Prompt size
5.  Retrieved-context size
6.  Duplicate AI calls
7.  Regeneration frequency
8.  Unnecessary AI calls
9.  Caching
10. Token/cost monitoring
11. Rate limits
12. Architecture changes

Use this investigation structure:

``` text
Measure
  ↓
Identify largest cost contributor
  ↓
Optimize
  ↓
Evaluate quality impact
  ↓
Monitor
```

Do not assume the answer is simply "use a cheaper model."

------------------------------------------------------------------------

# 29. README Requirements

Create:

``` text
README.md
```

Sections:

``` text
# AI-Powered CX Reply Assistant

## Problem

## Solution

## Features

## Architecture

## Tech Stack

## Database Schema

## Retrieval Approach

## AI Approach

## Guardrails

## Local Setup

## Environment Variables

## Deployment

## Evaluation

## Known Limitations

## Future Improvements
```

Include exact commands required to run the project.

------------------------------------------------------------------------

# 30. Project Structure

Use a clean structure similar to:

``` text
cx-reply-assistant/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── ...
│
├── supabase/
│   ├── migrations/
│   │   └── schema.sql
│   └── functions/
│       └── generate-reply/
│           └── index.ts
│
├── evaluation/
│   └── test_cases.json
│
├── architecture/
│   └── architecture.md
│
├── README.md
├── .env.example
└── .gitignore
```

Adjust if the actual framework/tooling requires a slightly different
structure.

------------------------------------------------------------------------

# 31. Instructions for GitHub Copilot / Claude Code

You are the implementation agent.

Work incrementally.

DO NOT generate the entire project in one response.

First inspect the repository.

Then:

1.  Explain the current state briefly.
2.  Identify the next smallest implementation step.
3.  Implement only that step.
4.  Run relevant tests/build/lint commands.
5.  Fix errors.
6.  Show what changed.
7.  State the next checkpoint.

Never silently skip errors.

Never replace working code unnecessarily.

Never add dependencies without explaining why they are needed.

Never expose secrets.

Never create fake successful API responses when the real integration is
expected.

If a service cannot be accessed, implement a clean fallback and clearly
mark it.

------------------------------------------------------------------------

# 32. Implementation Sequence for the Coding Agent

Follow exactly this sequence.

## STEP 1 --- Inspect repository

-   Check existing files.
-   Check package manager.
-   Check whether a React/Vite project already exists.
-   Do not delete existing useful work.

## STEP 2 --- Create/verify frontend

-   React + Vite
-   Tailwind
-   Basic routing/page structure
-   Supabase client

Run the application.

## STEP 3 --- Create database

Create the SQL migration.

Create:

-   brands
-   knowledge_entries
-   customers
-   conversations
-   messages
-   ai_logs

Add constraints and indexes.

## STEP 4 --- Seed data

Add:

-   two brands
-   policy entries
-   customers
-   conversations
-   messages

Verify through Supabase.

## STEP 5 --- Build authentication

Implement minimal login/logout.

## STEP 6 --- Build conversation UI

Show:

-   customer
-   brand
-   order
-   history
-   latest message

## STEP 7 --- Build KB CRUD

Implement create/read/update/delete.

Verify persistence after refresh.

## STEP 8 --- Implement retrieval

Create a small, deterministic retrieval service.

Verify brand filtering.

## STEP 9 --- Create generate-reply Edge Function

Implement validation and retrieval.

Do not connect AI yet if retrieval has not been tested.

## STEP 10 --- Connect OpenRouter

Add server-side API call.

Use environment secret.

## STEP 11 --- Add prompt guardrails

Use only retrieved brand-specific context.

## STEP 12 --- Add AI response panel

Show:

-   response
-   retrieved context
-   regenerate
-   edit
-   approve

## STEP 13 --- Add logging

Save every AI generation and final response.

## STEP 14 --- Add manual fallback

AI failure must not break the application.

## STEP 15 --- Run all test cases

Especially cross-brand isolation.

## STEP 16 --- Deploy

Deploy frontend and backend.

## STEP 17 --- Test deployed application

Use a clean browser.

## STEP 18 --- Documentation

Create:

-   README
-   architecture document
-   evaluation test cases

## STEP 19 --- Final review

Check:

-   no secrets committed
-   no broken routes
-   no console errors
-   no placeholder text
-   no fake AI success
-   brand isolation works
-   AI failure fallback works
-   deployment works

------------------------------------------------------------------------

# 33. Final Demo Flow

The demo should be under 5 minutes.

Use this flow:

``` text
1. Login
2. Open customer conversation
3. Show brand + order
4. Show customer message
5. Click Generate Reply
6. Show AI response
7. Show retrieved knowledge
8. Edit response
9. Approve/send
10. Show final message
11. Open Knowledge Base
12. Change a policy
13. Return to conversation
14. Generate again
15. Show updated behavior
16. Briefly demonstrate different brand
17. Show unsupported question guardrail
```

Do not demo every database table.

------------------------------------------------------------------------

# 34. Final Submission Checklist

Before submission verify:

## Application

-   [ ] Deployed URL works
-   [ ] Login works
-   [ ] Conversation works
-   [ ] Two brands work
-   [ ] Customer switching works
-   [ ] Knowledge CRUD works
-   [ ] Retrieval works
-   [ ] Brand isolation works
-   [ ] AI generation works
-   [ ] Retrieved context is visible
-   [ ] Regeneration works
-   [ ] Editing works
-   [ ] Approval works
-   [ ] Final message is stored
-   [ ] AI logs exist
-   [ ] Unsupported question is handled
-   [ ] AI failure has fallback

## Repository

-   [ ] GitHub repository works
-   [ ] README exists
-   [ ] Setup instructions work
-   [ ] `.env.example` exists
-   [ ] No secrets committed
-   [ ] Database schema included
-   [ ] Clean project structure

## Documentation

-   [ ] Architecture diagram
-   [ ] Architecture document
-   [ ] Scalability discussion
-   [ ] Reliability discussion
-   [ ] Multi-brand isolation discussion
-   [ ] AI cost investigation
-   [ ] Leadership/ownership answers

## Demo

-   [ ] Demo video \<= 5 minutes
-   [ ] End-to-end workflow shown
-   [ ] AI + retrieval shown
-   [ ] Brand-specific behavior shown
-   [ ] Guardrail shown

------------------------------------------------------------------------

# 35. Definition of Done

The project is DONE when a reviewer can:

1.  Open the deployed URL.
2.  Log in.
3.  Select a customer/conversation.
4.  See the customer's message.
5.  Generate an AI reply.
6.  See the brand-specific knowledge used.
7.  Verify the response does not invent unsupported policies.
8.  Edit the response.
9.  Approve/send it.
10. See the final response in the conversation.
11. Modify a knowledge-base policy.
12. Generate another response using the changed policy.
13. Switch brands and observe different policies.
14. Test an unsupported request.
15. Understand the architecture from the README/documentation.

Do not add more features until all of the above works.

------------------------------------------------------------------------

# 36. Important Agent Constraint

If a choice exists between:

A. A sophisticated implementation that may fail.

and

B. A simple implementation that is reliable and demonstrable.

Choose B.

The objective is a strong hiring-assignment submission, not a production
SaaS platform.

Build something that works.

Then make it explainable.

Then make it polished.

Then stop.
