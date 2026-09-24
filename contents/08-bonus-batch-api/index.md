---
title: BONUS (Non-Oracle) - Anthropic Message Batches API
description: Cheap async batch calls at 50% price with a 24-hour expiry window, not for realtime use.
order: 80
draft: false
---

This is NOT Oracle SQL. This is a NON-Oracle bonus about the Anthropic Message Batches API. Skip it unless you call Anthropic APIs. It saves AI spend. It never tunes a query.

Oracle batch is a different animal: `DBMS_SCHEDULER`, `DBMS_PARALLEL_EXECUTE`, `FORALL`/`BULK COLLECT`, `executemany` array binding, SQL*Loader/external tables. That list is not in here. Do not cite this page for Oracle bulk work.

A junior sent 5,000 chat replies as one batch. Users waited. No stream arrived. The fix was simple. Chat stayed on realtime. Nightly summaries moved to batch. Cost fell. Chats stayed fast. That split is the whole lesson.

Batch is like night-shift mail sorting, except you track each letter with custom_id and read results from .jsonl.

Start with the price-for-speed trade. Then learn strict mechanics. Finally dodge billing and limit traps. First you pick batch or realtime. Next you build the batch right. Then you poll and bill it right.

## 1. Trade speed for price when replies can wait

Claim: batch costs half, but gives no realtime reply. Example: run the decision demo. A chatbot needs tokens now. It needs streaming. It fails on batch. Docs say batch suits cases where immediate responses are not required. A nightly eval of 5,000 tickets fits batch. A live chat turn does not. Move bulk evals, moderation, dataset labeling, and bulk generation to batch. Keep interactive chat on realtime. Why it matters: wrong path picks hurt users or waste cash. Batch on chat adds hours of lag. Realtime on 5,000 nightly labels wastes half the spend. Number: All usage is charged at 50% of the standard API prices. Source: https://platform.claude.com/docs/en/build-with-claude/batch-processing, accessed 2026-09-20. Most batches finish in less than 1 hour. The 24-hour mark is expiry, not a promise.

## 2. Build strict batches and match by custom_id

Claim: batch shape is strict, and result order is random. Example: continue the decision demo with a small batch. Create with POST /v1/messages/batches. Each item in requests[] holds custom_id plus params with model, max_tokens, messages, plus system or tools if needed. Set custom_id like ticket-001. It must be 1 to 64 chars, letters, numbers, hyphen, underscore only. Test the params shape on realtime first. Batches validate async and lock after submit. To change one, cancel and resubmit. Poll retrieve until processing_status is ended. Then stream results_url as .jsonl. Join on custom_id. Never trust order.

```python
import anthropic, time
client = anthropic.Anthropic()
batch = client.messages.batches.create(requests=[
  {"custom_id": "ticket-001", "params": {
    "model": "claude-sonnet-4-5", "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Summarize this ticket..."}]}}
])
while True:
  b = client.messages.batches.retrieve(batch.id)
  if b.processing_status == "ended":
    break
  time.sleep(60)
for entry in client.messages.batches.results(batch.id):
  if entry.result.type == "succeeded":
    print(entry.custom_id, entry.result.message.content)
```

Why it matters: random order breaks naive joins. Teams that index by row lose tickets. custom_id is the only safe key. Docs state batch results can be returned in any order and direct you to always use the custom_id field. Number: a batch holds either 100,000 requests or 256 MB, whichever hits first. Statuses are in_progress, canceling, ended at batch level, and succeeded, errored, canceled, expired per request. Types source: SDK batches.ts plus https://platform.claude.com/docs/en/api/php/beta/messages/batches/cancel, accessed 2026-09-20.

## 3. Bill only wins and respect hard limits

Claim: only succeeded items bill, and 24 hours is a cutoff, not a pledge. Example: finish the demo with traps. An errored item shows invalid_request_error and bills zero. Docs state you will not be billed for these requests for errored, canceled, and expired alike. A batch can expire with work undone. Docs state batches expire if processing does not complete within 24 hours, and a batch can expire and not complete. Expired items bill zero. A batch with stream true, speed Fast mode, or max_tokens 0 fails checks. Prompt caching stacks with batch for extra cuts. Use 1-hour cache since batches can pass the 5-minute TTL. Batch rate limits stand apart from realtime limits and span all models. Source: https://platform.claude.com/docs/en/api/rate-limits, accessed 2026-09-20. Why it matters: three myths die here. Expiry is not a finish pledge. Failed items are not half-price. Batch calls do not eat realtime quota. Plan long generations inside the 24-hour window. A 300k-token run can pass one hour. Number: 50% price on input, output, and special tokens. 100,000 or 256 MB cap. Results access when all done or after 24 hours, whichever comes first.

<details><summary>In case you don't know about custom_id, it's the label you set so you can match each result to its request.</summary>custom_id is the label you set to match each result to its request. Batch output order is random, so only this key is safe. Steps are fixed: set custom_id such as ticket-001 on create, test params on realtime first, poll retrieve till ended, then join results on custom_id. The regex is 1 to 64 chars, letters, numbers, hyphen, underscore. Teams running 5,000 nightly labels need it. It drives one decision: which output belongs to which input. Do not join by row order. Order shifts and costs lost tickets. Sharp line: custom_id is the only join key batch gives you. Example: ticket-001 returns first or last, yet you still map by ID. Batches lock after submit, so cancel to change. See https://platform.claude.com/docs/en/build-with-claude/batch-processing.</details>

<details><summary>In case you don't know about .jsonl results, it's one JSON object per line you stream and parse.</summary>.jsonl results are one JSON object per line you stream and parse. Each line holds custom_id plus a result type: succeeded, errored, canceled, or expired. Only succeeded bills. Steps are fixed: stream results_url instead of loading all at once, branch on type, retry or fix per type. Teams reading 100k-request or 256MB batches need streaming. It drives one decision: pay, fix, or retry. Do not assume order or full success. That swap costs out-of-memory crashes plus wrong joins. Sharp line: .jsonl tells you what billed, not just what ran. Example: an errored line shows invalid_request_error and bills zero, while an expired line after 24h bills zero. Most batches end in under 1 hour. See https://platform.claude.com/docs/en/build-with-claude/batch-processing.</details>

**Keep this: Need it now, use realtime — can wait hours, use batch at 50% off.**
