---
title: BONUS (Non-Oracle) - Anthropic Message Batches API
description: Cheap async batch calls at 50% price with a 24-hour expiry window, not for realtime use.
order: 80
draft: false
---

This is NOT Oracle SQL. This is a NON-Oracle bonus about the Anthropic Message Batches API.

Batch trades speed for 50% lower price.

"'can I use batch for my chatbot?'"

Short answer: no. No streaming. No Fast mode. No sync replies.

Think of batch like night-shift mail sorting: cheaper, next morning, no rush.

<details><summary>In case you don't know about custom_id, it's the label you set so you can match each result to its request.</summary>Batch output order is random. Store custom_id like ticket-001 and join on it after download.</details>

<details><summary>In case you don't know about .jsonl results, it's one JSON object per line you stream and parse.</summary>Files can be large. Stream, do not load all at once. Check result type: succeeded, errored, canceled, expired.</details>

Precise terms now. Create with POST /v1/messages/batches. Each entry in requests[] holds custom_id plus params with model, max_tokens, messages, plus system or tools if needed. custom_id must be 1 to 64 chars, letters, numbers, hyphen, underscore. Results come back in any order in .jsonl. Always match by custom_id.

Lifecycle: processing_status goes in_progress to canceling to ended. expires_at is 24 hours after creation. Access results when all done or after 24 hours, whichever comes first. Typical finish is less than 1 hour. 24 hours is expiry, not a promise. Docs say a batch can expire and not complete. Expired items are not billed.

Limits: either 100,000 requests or 256 MB per batch, whichever hits first. Price: all use at 50% of standard, input plus output plus special tokens. Stacks with prompt caching for more savings. Use 1-hour cache since batches can pass the 5-minute TTL. Only succeeded items bill. Errored, canceled, expired show "You will not be billed for these requests."

Use batch when replies can wait: bulk evals, moderation, dataset labeling, bulk generation. Do not use when latency matters or when you need stream: true. stream: true, speed, and max_tokens: 0 fail checks. Batch has its own rate limits shared across models. It does not touch realtime limits. Results stream from results_url. Delete with DELETE /v1/messages/batches/{id}.

A junior sent 5,000 chat replies as one batch and polled each second. No stream arrived. Users waited. Fix was simple: realtime path for chat, batch path for nightly summaries. Cost fell. Chats stayed fast.

**Keep this: Need it now, use realtime — can wait hours, use batch at 50% off.**
