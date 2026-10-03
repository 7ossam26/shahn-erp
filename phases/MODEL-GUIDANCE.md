# Model guidance for the ERP phases

Checked: 2026-10-03, Africa/Cairo. These recommendations select an execution setting for a later phase. No setting was changed by authoring these files.

## Availability evidence

The current Codex tool metadata and the local `models_cache.json` both list `gpt-6.1-sol` and `gpt-6-astra`. The cache was fetched at `2026-10-03T13:57:16.348298300Z` by client0.160.0. Both list `low`, `medium`, `high`, `xhigh`, `max` and `ultra`; the phase recommendations use `high` and `xhigh`. Only model metadata was inspected; account credentials were not read. This is observed client availability, not a promise of future access or remaining usage.

Official guidance recommends GPT-6.1 Sol for complex coding and reserves Astra for the most demanding work. It also explains choosing the model/effort in Codex's model switcher. Higher effort can take longer and use more tokens. [OpenAI Codex models](https://learn.chatgpt.com/docs/models).

The official selection guide treats model/effort choices as a starting point to evaluate on actual tasks. Its strongest reasoning recommendations suit exacting analysis and complex deliverables. [OpenAI model selection](https://developers.openai.com/api/docs/guides/model-selection).

The API's GPT-6.1 Sol effort list includes `high` and `xhigh`; its API defaults are not assumed to equal this desktop client's defaults. [GPT-6.1 Sol model](https://developers.openai.com/api/docs/models/gpt-6.1-sol).

## Phase policy

- Use `gpt-6.1-sol` with `high` for bounded full-stack workflows with settled business rules. Use `xhigh` for the first extraction of the approved visual system.
- Use `gpt-6-astra` with `xhigh` for authorization boundaries, atomic money/custody, multi-source financial corrections, durable integration and restore/conformance work. This is our task-specific recommendation, not an OpenAI guarantee that a model will pass the tests.
- Each phase explains its own choice. The owner selects it in Codex before pasting the complete prompt. A model name written inside Markdown does not change the running model.
- If Astra is unavailable later, the verified alternative is `gpt-6.1-sol` with `xhigh`, preserving every acceptance check. If either exact setting is unavailable, inspect the current selector and official guidance rather than inventing a model name. Record the actual model/effort used in the execution record.
- No phase requires Max or Ultra. No API key, API integration, subscription purchase or workspace configuration change is part of this recommendation.
