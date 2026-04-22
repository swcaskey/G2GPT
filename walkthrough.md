# Individual Iteration 1 Final Report

This report summarizes the modifications and verification strategies implemented to transition the G2GPT platform into a multi-LLM workspace, strictly matching the Individual Iteration 1 grading rubric.

## 1. Requirements Phase
We established comprehensive SMART User Stories centered around the simultaneous use of multiple AI models:
- **Multi-Model Fact Verification**: Querying three models back-to-back to cross-check research accuracy.
- **Creative Ideation**: Aggregating diverse perspectives from various AI architectures.
- **Custom Selection**: Introducing a settings overlay that parses local Ollama models dynamically, granting users full control over which models are queried.

## 2. Architecture & Design (Development Phase)
The system was fundamentally rewritten from a linear 1-to-1 conversation architecture into a 1-to-N broadcasting architecture.

### Database Adjustments
- **`messages` Table (`database.js`)**: Injected the `model_name` `TEXT` column. This secures the mapping between the 3 unique AI replies and their corresponding visual layout blocks upon reload.

### REST API Refactor
- **`GET /api/models`**: Added endpoints to natively ping the local system for available ML packages without breaking state.
- **`POST /api/chat/multi`**: Retired the sequential LLM query block in favor of a `Promise.all()` payload loop. The server now captures a `modelNames` array from the client and independently fires requests side-by-side to Ollama, bundling them into a robust `replies` JSON.

### Frontend Javascript Overhaul
- **CSS Grid/Flexbox**: Built the `.multi-col-wrapper` logic inside `dashboard.css` which auto-sizes based on the number of selected models.
- **`dashboard.js`**: Replaced standard chat bubble appends with conditional formatting that slices consecutive AI responses, stamps their model parameters onto Badges, and packs them into horizontal columns representing simultaneous reception.

## 3. Verification & Testing

### Installation & Run Instructions for TAs
Because this branch modifies the underlying SQLite structures, a clean install is recommended:
1. `rm login.db` (Wipe the obsolete legacy DB)
2. `npm install` (Install fresh Puppeteer and Supertest tools)
3. `npm start` (Initializes node environment over `http://localhost:3000`)
*(Ollama must be running locally via `ollama serve` with the `gemma3:4b` / `llama3` models loaded).*

### Jasmine Unit Tests
Our `multiChatSpec.js` executes isolated, stubbed `supertest` requests that bypass the Ollama engine entirely to cleanly assert that our Javascript Promise mechanics properly aggregate and trap missing parameter faults (HTTP 400 validation).

### Cucumber End-to-End Acceptance Tests
Puppeteer autonomously boots up a Chromium instance, generates a test user account, opens the new 'Settings' modal to confirm its checklist DOM mapping, and submits a sample contextual query. It then confirms the CSS selectors successfully spun up a minimum of 3 adjacent `.model-col` boundaries on screen!
