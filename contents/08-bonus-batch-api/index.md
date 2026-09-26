---
title: 'BONUS (Non-Oracle) - Anthropic Message Batches API'
description: 'A non-Oracle bonus on the Anthropic Message Batches API: half price, asynchronous results, a 24-hour expiry, a strict request shape, and one safe join key.'
order: 80
draft: false
---

This is not Oracle material. It is a bonus about a third-party API for large volumes of model calls, and it is here for one audience: someone who already pays for that API and can wait for an answer. Skip it otherwise, and never cite it for Oracle bulk work.

Oracle's own bulk mechanisms are a different set of things with different semantics and different failure modes. `DBMS_SCHEDULER`, `DBMS_PARALLEL_EXECUTE`, `FORALL` with `BULK COLLECT`, `executemany` array binding, and SQL\*Loader or external tables are not on this page. If you need to move rows in bulk inside Oracle, start with the [recipes chapter](/04-recipes/) and stay there.

What follows is a plain conditional statement of the trade, because that is all it is. **If a request can wait hours for its result, submitting it asynchronously costs roughly half the synchronous price. If a user is waiting, the same call cannot take that path at all.** Everything else on this page is a consequence of those two sentences.

> **Track:** Core (1, 2) · Practice (3) · Recovery (none) · Advanced / gated (none)
>
> **Prerequisites:** An API key and a working synchronous client. No database, no Oracle, and no privilege from this book.
>
> **Evidence status:** This is a non-Oracle bonus, and its only sources are the vendor's own API documentation, cited inline with an access date of **2026-09-26**. It cites no source ID from this book's ledger, because the ledger covers Oracle SQL material and nothing else. **No live Oracle database was available and no live API call was made**, so every price, window, and limit below is a dated statement from documentation rather than a measured result, and the block here is a `MUTATING` shape that was not executed.
>
> **Next required page:** This branch ends here. Return to [the route](/) and take the next step from the root page.

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | 1, 2     |
| **Practice**         | 3        |
| **Recovery**         | none     |
| **Advanced / gated** | none     |

- **Core (1, 2):** the trade, and the request shape and join key. Read both before you write the first batch.
- **Practice (3):** polling, the expiry window, and what actually gets billed. Apply it when you schedule a real batch, because the numbers here are dated and yours will not be.
- **Recovery (none):** there is no rollback for an asynchronous batch. Once results are produced you have a cost and a file, which is why section 3 is the section to read before you schedule rather than after.
- **Advanced / gated (none):** nothing here is gated by a release or an entitlement, because this is not a database. The gates that matter in this book are release and privilege checks, and this page has neither.

## 1. The price-for-speed trade

The vendor documents all batch usage at **50% of the standard API prices**, and describes most batches finishing in **under an hour**, against a hard window of 24 hours. Both numbers are dated statements from the documentation cited below, not a permanent property of the API. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

What the same documentation states is that the batch path suits work that does not require immediate results, and it lists the use cases it fits: large-scale evaluations, content moderation, data analysis, and bulk content generation. The trade is therefore not a discount you can take and pay for later. It is a different shape of request with a different latency contract, and the two cannot be mixed inside one user interaction. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

**The decision is a routing decision, and it is worth making once per workload rather than per call.** Bulk classification, evaluation runs, dataset labeling, and overnight summarization fit the asynchronous shape. An interactive chat turn, an autocomplete request, or anything with a user watching a spinner does not. Putting a synchronous workload on the batch path trades half the money for a user-visible wait, and putting an asynchronous workload on the synchronous path pays full price for work that could have waited.

The follow-on question is what happens when a synchronous path is unavailable for a workload that would have fitted batch. The honest answer is that the discount is lost and the work still has to run, so treat the split as a design decision you record, not as a runtime optimization you discover.

## 2. Strict mechanics, and one safe join key

The request shape is documented and narrow. A batch is a list of requests; each request carries a `custom_id` you choose plus a `params` object holding the ordinary request parameters. The documented constraint on `custom_id` is 1 to 64 characters, alphanumeric characters, hyphens, and underscores. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

Two consequences follow from that shape, and both are easy to get wrong.

**Validation is asynchronous, so a malformed request is not a fast failure.** The documentation states that validation of each request's `params` happens during processing, and that validation errors are returned when the whole batch has ended. It also recommends verifying the request shape against the synchronous Messages endpoint first. That recommendation is the cheapest control on this page: prove one request synchronously, then batch it. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

**Results do not come back in the order you sent them.** The documentation states that results can be returned in any order, may not match the ordering of the requests, and directs you to match on `custom_id`. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

That is the one rule on the page that is not negotiable, because every other mistake degrades output and this one silently reassigns it. The analogy is a mailroom returning sorted mail with your own reference numbers written on each item: the sorting is not yours to predict, and the reference is the only thing that survives the trip.

The shape below is the documented Python flow: create with a list of requests, poll until processing has ended, then stream the results. The model name is the one used in the documentation's own examples, and both it and the pricing table are dated facts. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26) Check the current model list before you copy either.

**MUTATING. Creates a real batch against a paid API and polls it, so it costs money and cannot be undone. Not executed here. Substitute your own key, model, and request content. Expected output: one line per request, keyed by `custom_id`.**

```python
import time

import anthropic

client = anthropic.Anthropic()

batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": "ticket-0001",
            "params": {
                "model": "claude-opus-5-5",
                "max_tokens": 1024,
                "messages": [
                    {"role": "user", "content": "Summarize this support ticket."}
                ],
            },
        },
    ]
)

while True:
    state = client.messages.batches.retrieve(batch.id)
    if state.processing_status == "ended":
        break
    time.sleep(60)

for entry in client.messages.batches.results(batch.id):
    if entry.result.type == "succeeded":
        print(entry.custom_id, entry.result.message.content)
    else:
        print(entry.custom_id, entry.result.type)
```

Three parameters are documented as unsupported inside a batch, and each returns a validation error rather than a degraded result. `stream: true` does not apply, because batch results come back as a single file rather than a stream. `speed`, which tunes synchronous latency, has nothing to tune in an asynchronous path. And `max_tokens: 0` is rejected because it exists for cache pre-warming, and an ephemeral cache entry written during batch processing would likely expire before a follow-up request ran. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

## 3. Polling, expiry, and billing

Poll the batch status until processing has ended, then read the results file. The status starts as `in_progress`, and a canceled batch reports `canceling` and then `ended`, possibly with partial results for the requests that had already been processed. [Retrieve a batch](https://platform.claude.com/docs/en/api/messages/batches/retrieve) [Cancel a batch](https://platform.claude.com/docs/en/api/messages/batches/cancel) (accessed 2026-09-26)

**Expiry is a cutoff, not a completion promise.** The documented rules, all dated 2026-09-26: results become available when all messages have completed **or** after 24 hours, whichever comes first; a batch expires if processing does not complete within 24 hours; and results remain downloadable for **29 days** after creation, after which the batch is still visible but its results are no longer available. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

**The 24-hour figure is a floor for your planner, not a promise to your users.** The documentation also states that processing may be slowed by current demand and request volume, and that in that case more requests expire after 24 hours. A batch described as usually finishing in under an hour can still hit the window. If your downstream job has a deadline, size the batch so the deadline is not the expiry, and record which assumption you relied on. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

**Only succeeded requests are billed.** The documented result types are `succeeded`, `errored`, `canceled`, and `expired`, and for the last three the documentation states you are not billed. An errored request carries an error object rather than a message, so a batch can end with results that are all present and all unpaid. The batch's `request_counts` field gives the per-status overview, and the documentation recommends streaming the results rather than downloading them whole, because of how large a full batch can be. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

**Batches are scoped to a workspace.** A batch created in one workspace is not visible from another, which matters for anything that runs in more than one environment. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

**Rate limits are a separate constraint on this path.** They apply both to the batch requests themselves and to the number of requests inside a batch still waiting to be processed, so queue depth is its own limit; the current numbers are on the vendor's rate limits page and will change. A batch may also run slightly over a workspace's configured spend limit, because throughput and concurrency are high. [Rate limits](https://platform.claude.com/docs/en/api/rate-limits) (accessed 2026-09-26)

One optional saving is documented and easy to get wrong. Batch pricing and prompt-caching discounts stack, but because batch requests are processed asynchronously and concurrently, cache hits are provided on a best-effort basis, and the documentation notes typical hit rates that vary widely with traffic patterns. It also recommends the one-hour cache duration, since a batch can take longer than a five-minute cache entry survives. Treat the stacking as a likely improvement, not a number you can promise in a budget. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing) (accessed 2026-09-26)

## Artifact

A batch run record, with the fields you need in order to explain a bill or a missing result three weeks later:

**PLACEHOLDER — the batch run record. One block per batch you submit. Fill it in when you schedule the run.**

```text
workload and why it may wait:  ____________________
request shape proved synchronously first: yes / no
custom_id scheme:              ____________________
submitted at (UTC):            ____________________
deadline the run was sized for: ____________________
outcome counts by result type: ____________________
results read before:           ____________________   -- 29 days after creation
documentation accessed:        ____________________   -- the date you re-read it
```

That record is also the thing that makes the route auditable: it says which path a workload took and why, which is the decision this page is actually about. Prices, windows, and limits above are dated statements from the vendor's documentation and will need a re-read before they are quoted again, which is why that last field is blank rather than pre-filled.

**Decision:** route by whether the caller can wait, join every result on `custom_id`, and treat the 24-hour window as a cutoff. Nothing on this page is Oracle evidence.
