# RAG System

KanbAIn uses **Retrieval-Augmented Generation (RAG)** to ground the AI planner in relevant PM methodology and domain knowledge before generating a board. Without RAG, the LLM would rely solely on its training data; with RAG, it gets curated, project-specific context injected directly into its prompt.

Source: `backend/app/rag/`

---

## Why RAG?

The planner needs to know things like:
- How to write good acceptance criteria for this type of project
- What a realistic WBS for a software product looks like
- How to estimate effort and handle deadline risk
- Domain-specific quality practices

This knowledge is stored as markdown files in the bundled corpus and optionally supplemented by user-provided URLs and live web scraping.

---

## Pipeline Overview

```
project brief
      │
      ▼
classify_brief()          →  domain_slug + search queries
      │
      ▼
retrieve(domain_slug, queries)
      │
      ├── ensure_wiki_seeded()   (idempotent; loads corpus if not yet done)
      ├── embed_missing_chunks() (lazily generates embeddings for new chunks)
      ├── _vector_rank()         (cosine similarity, top 20)
      ├── _fts_rank()            (full-text search, top 20)
      ├── _rrf()                 (Reciprocal Rank Fusion → merged ranked list)
      └── _mmr()                 (Maximal Marginal Relevance → diverse top 20)
                │
                ▼
         token budget packing   (up to RAG_RESEARCH_TOKEN_BUDGET tokens)
                │
                ▼
         formatted citations string → fed into LLM prompt as "research"
```

If `coverage_ok` is false and effort allows: `propose_source_urls()` → `scrape_urls()` → re-retrieve.

---

## Corpus (`rag/corpus/`)

Bundled markdown files that form the base knowledge:

```
rag/corpus/
├── pm-playbook/
│   ├── acceptance.md      # How to write acceptance criteria
│   ├── estimation.md      # Effort estimation techniques
│   ├── risk-deadline.md   # Handling deadline risk
│   └── wbs.md             # Work Breakdown Structure principles
│
└── software-product/
    ├── delivery.md        # Software delivery practices
    └── quality.md         # Quality bar definitions (MVP vs production-grade)
```

`flask seed` (or the first call to `retrieve()`) ingests these files via `ensure_wiki_seeded()`.

New domains can be added by:
1. Creating a new subdirectory under `corpus/`
2. Adding the domain slug to `domains.py`
3. Running `flask seed`

---

## Domain Classification (`classify.py`)

`classify_brief(project_brief)` makes a lightweight LLM call (`OPENAI_ROUTING_MODEL`) to:

1. Map the project description to one of the **known domain slugs** (see `domains.py`).
2. Generate **3–5 targeted search queries** to retrieve the most relevant wiki chunks.

Example output:

```json
{
  "domain_slug": "software-product",
  "queries": [
    "acceptance criteria for SaaS features",
    "sprint planning for small teams",
    "API versioning best practices",
    "MVP quality bar"
  ]
}
```

**Fallback**: if the LLM is unavailable, `classify.py` falls back to a keyword heuristic that scans the brief for domain-related terms.

### Known Domains (`domains.py`)

| Slug | Description |
|---|---|
| `software-product` | Software / SaaS products |
| `pm-playbook` | Always included alongside the domain corpus |
| `healthcare` | Healthcare / medtech |
| `construction` | Construction / infrastructure |
| *(more…)* | Additional domains can be added |

Aliases (e.g. `"saas"` → `"software-product"`) are resolved before retrieval. `retrieve_slugs(domain_slug)` always returns `[domain_slug, "pm-playbook"]` so PM methodology is always included.

---

## Chunking (`chunk.py`)

Markdown files are split into **heading-delimited chunks**:

- Each `##` or `###` heading starts a new chunk.
- `parent_text` captures the parent section's content, giving the LLM more context for short child chunks.
- Token count is estimated to enforce the research budget downstream.

Example chunk structure:

```python
WikiChunk(
    heading="Writing Good Acceptance Criteria",
    text="Acceptance criteria should be...",
    parent_text="## Acceptance Criteria\nThis section covers...",
    token_count=142,
    embedding=[...],  # 1536-dim float vector
)
```

---

## Embedding (`embed.py`)

Embeddings are generated with the OpenAI embeddings API (`text-embedding-*` model).

- Stored as JSON arrays in `WikiChunk.embedding`.
- `embed_missing_chunks()` lazily generates embeddings for any chunk that lacks one. This runs automatically before every retrieval call, so new corpus additions are indexed on-demand.
- `cosine(a, b)` computes similarity between two embedding vectors.

---

## Retrieval (`retrieve.py`)

Retrieval is **hybrid** — combining vector similarity with full-text search — and uses two reranking steps for quality and diversity.

### Step 1 — Vector Search (`_vector_rank`)

For each query:
- Embed the query string.
- Compute cosine similarity against all `WikiChunk.embedding` vectors in the database (filtered by domain slugs).
- Return top 20 by similarity score.

### Step 2 — Full-Text Search (`_fts_rank`)

For each query:
- Match against the `tsv` (tsvector) column on `WikiChunk` using PostgreSQL's `@@` operator.
- Rank by `ts_rank`.
- Return top 20 by rank.

### Step 3 — Reciprocal Rank Fusion (`_rrf`)

Merges the vector and FTS ranked lists using **RRF** (k=60):

```
score(chunk) = Σ  1 / (k + rank_in_list)
```

This is a well-known ensemble technique that doesn't require score normalization and handles different score scales gracefully.

### Step 4 — MMR Reranking (`_mmr`)

**Maximal Marginal Relevance** (λ=0.7) selects a diverse final set of up to 20 chunks:

```
MMR score = λ · similarity(chunk, query) - (1-λ) · max_similarity(chunk, already_selected)
```

This prevents the result set from being dominated by near-duplicate chunks (e.g. two chunks about the same sub-topic).

### Step 5 — Token Budget Packing

Chunks are assembled in MMR order until the `RAG_RESEARCH_TOKEN_BUDGET` (default: 2500 tokens) is reached. For the first chunk from a given heading, `parent_text` is preferred to give more surrounding context.

The output is a formatted string of citations:

```
[acceptance.md — Writing Acceptance Criteria]
Acceptance criteria should be testable, specific, and written from the user's perspective...

[estimation.md — T-Shirt Sizing]
T-shirt sizing (XS/S/M/L/XL) is a relative estimation technique...
```

---

## Coverage Check

After retrieval, `coverage_ok` is evaluated:

- ✅ Results must be non-empty
- ✅ At least one `pm-playbook` chunk must be present
- ✅ At least one domain-specific chunk must be present
- ✅ No more than 1 of the search queries returned zero hits

If `coverage_ok` is false and `effort` allows it, the planner enters the **scraping phase**.

---

## URL Ingestion (`ingest.py`)

`ingest_project_urls(project)` fetches and chunks the project's own documents:

- `prd_url` — product requirements document
- `design_urls` — design files or Figma links
- `repo_url` — source code repository

The fetched content is chunked in-memory (not stored to Postgres) and merged into the retrieval results. This gives the LLM context about the specific product being planned.

---

## Web Scraping (`scrape.py`)

When coverage is poor, the planner proposes relevant external URLs and scrapes them:

1. `propose_source_urls(queries, domain_slug)` — LLM call suggesting authoritative URLs for the queries.
2. `scrape_urls(urls, deadline=10s)` — time-boxed HTTP fetches; extracts text content; chunks and stores as `WikiSource` / `WikiChunk` records.
3. `promote_sources(chunk_ids)` — marks cited chunks with `promoted_at` timestamp for future retrieval prioritisation.

Scraped content is persisted to Postgres so subsequent planning calls benefit without re-scraping.

---

## Seeding (`seed.py`)

`ensure_wiki_seeded()` is idempotent and runs before every retrieval:

1. Iterates over all markdown files in `corpus/`.
2. Computes a content hash for each file.
3. If the file is new or changed (hash mismatch): chunks it, upserts `WikiSource` + `WikiChunk` records, clears old chunks for that source.
4. Calls `embed_missing_chunks()` to generate embeddings for any new chunks.

This means you can add new corpus files and they'll be indexed automatically on the next planning run without any manual migration.

---

## Database Models (`rag/models.py`)

### `WikiSource`

Represents a knowledge document (corpus file or scraped URL).

| Column | Type | Description |
|---|---|---|
| `id` | int | Primary key |
| `origin` | str | `"corpus"` or `"web"` |
| `locator` | str | File path or URL |
| `domain_slug` | str | Domain this source belongs to |
| `content_hash` | str | SHA-256 of raw content (for change detection) |
| `promoted_at` | datetime | When this source was last cited by the planner |

### `WikiChunk`

Represents a single retrievable chunk of knowledge.

| Column | Type | Description |
|---|---|---|
| `id` | int | Primary key |
| `source_id` | FK | Parent `WikiSource` |
| `heading` | str | Section heading |
| `text` | str | Chunk content |
| `parent_text` | str | Parent section content (for context) |
| `token_count` | int | Estimated token count |
| `embedding` | JSON | OpenAI embedding vector (1536 dims) |
| `tsv` | tsvector | PostgreSQL full-text search vector |
