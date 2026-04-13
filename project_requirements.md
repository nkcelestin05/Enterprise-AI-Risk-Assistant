# Enterprise AI Risk Assistant — Project Requirements Summary

> **Source**: `enterprise_ai_risk_assistant_project.pdf`
> **Purpose**: Complete specification for building the Enterprise AI Risk Assistant application, aligned with the Grant Thornton US AI-ML Engineer role.

---

## 1. Project Overview & Objectives

The Enterprise AI Risk Assistant is an end-to-end AI system that combines **classical ML, GenAI/RAG, agentic workflows, MLOps/LLMOps, observability, and responsible AI guardrails** into a production-style application.

### Goals
| # | Goal |
|---|------|
| 1 | Showcase ML model development (feature engineering, training, evaluation, inference) |
| 2 | Demonstrate GenAI/RAG patterns (retrieval, embeddings, chunking) and agentic workflows |
| 3 | Expose a production-style API with FastAPI |
| 4 | Implement MLOps concepts (MLflow, versioning, basic CI/CD, monitoring) |
| 5 | Include responsible AI and security guardrails (PII redaction, prompt injection checks) |
| 6 | Provide a clear cloud deployment path with Docker, AWS ECS, ECR, and Terraform |

---

## 2. Features & Functionalities

### 2.1 API Layer
- **Framework**: FastAPI (v0.109.0)
- **Endpoints**:
  - `GET /health` — Returns health status and whether the ML model is loaded.
  - `POST /agent/query` — Accepts a `QueryRequest` (user_id, query, optional user_features) and returns a `QueryResponse` (status, agent_response dict, latency_ms).
- **Request Model (`QueryRequest`)**:
  - `user_id: str`
  - `query: str`
  - `user_features: Optional[List[float]]`
- **Response Model (`QueryResponse`)**:
  - `status: str`
  - `agent_response: dict`
  - `latency_ms: float`

### 2.2 Security / Responsible AI Layer (`AISecurityManager`)
- **PII Redaction** — Regex-based detection and redaction of:
  - Email addresses → `[EMAIL]_REDACTED`
  - SSNs (xxx-xx-xxxx) → `[SSN]_REDACTED`
  - Phone numbers (xxx-xxx-xxxx) → `[PHONE]_REDACTED`
- **Prompt Injection Detection** — Keyword blocklist:
  - "ignore previous instructions"
  - "system prompt"
  - "become an unrestricted ai"
  - "jailbreak"
  - "disregard all rules"
- Returns HTTP 400 with security alert message when injection is detected.

### 2.3 ML Risk Scoring Module (XGBoost)

#### Feature Pipeline (`RiskFeaturePipeline`)
- **Features** (5 total):
  - `credit_score` (int, 300–850)
  - `debt_to_income` (float, 0.1–0.6)
  - `annual_income` (int, 30000–200000)
  - `loan_amount` (int, 5000–50000)
  - `years_at_job` (int, 0–40)
- **Target**: `is_high_risk` (binary) — derived as `debt_to_income > 0.4 OR credit_score < 600`
- **Mock Data Generator**: 1000 samples, seeded (`np.random.seed(42)`)
- **Preprocessing**: `StandardScaler`, 80/20 train-test split (random_state=42)

#### Training (`train_xgboost.py`)
- **Algorithm**: XGBoost binary classifier
- **Hyperparameters**:
  - `objective`: binary:logistic
  - `max_depth`: 4
  - `eta`: 0.1
  - `subsample`: 0.8
  - `colsample_bytree`: 0.8
  - `eval_metric`: logloss
  - `num_boost_round`: 100
- **MLflow Tracking**:
  - Experiment name: `Financial_Risk_Scoring`
  - Run name: `XGBoost_v1`
  - Logs params, metrics (accuracy, precision, recall, AUC), and model artifact
- **Evaluation Metrics**: accuracy, precision, recall, ROC AUC

#### Inference Engine (`RiskInferenceEngine`)
- Takes a feature list, returns:
  - `risk_probability` (float, rounded to 4 decimal places)
  - `risk_level`: High (>0.7), Medium (>0.4), Low (≤0.4)
  - `recommendation`: "Manual Review Required" / "Additional Verification Needed" / "Auto-Approve"

### 2.4 RAG Module (Retrieval-Augmented Generation)

#### Policy Document (`financial_policy.txt`)
Three sections covering:
1. **Credit Score Requirements** — High/Medium/Low risk thresholds (600/700)
2. **Debt-to-Income Limits** — Max DTI 0.45; reject above 0.50
3. **Employment History** — Min 2 years at current job; self-employed need 3 years of tax returns

#### RAG Engine (`rag_engine.py`)
- **Embedding Model**: `all-MiniLM-L6-v2` (Sentence Transformers)
- **Vector Store**: FAISS (`IndexFlatL2`)
- **Chunking Strategy**: Split on double newlines
- **Retrieval**: Top-k nearest neighbours (default k=1)
- **Flow**: Load document → chunk → embed → build FAISS index → query → return best matching chunk

### 2.5 Agentic Workflow (`AgentPlanner`)
- **Keyword-based routing logic**:
  - Query contains "risk" or "score" → route to **ML Risk Model** (requires `user_features`)
  - Query contains "policy", "rule", or "requirement" → route to **RAG Engine**
  - Both keywords → invoke **both** ML and RAG
  - Neither → fallback message: *"I'm not sure how to help with that. Try asking about 'risk' or 'policy'."*

### 2.6 Monitoring & Observability
- **Logging**: Structured logger (`%(asctime)s | %(levelname)s | %(name)s | %(message)s`) to stdout
- **Prometheus Metrics**:
  - `api_requests_total` (Counter) — labeled by method and endpoint
  - `api_request_duration_seconds` (Histogram) — request latency
  - `/metrics` endpoint returning `generate_latest()` output

### 2.7 Testing
- **Unit Tests** (`tests/unit/test_security.py`):
  - `test_pii_redaction` — verifies email and phone redaction
  - `test_injection_detection` — verifies prompt injection is flagged
- **Integration Tests** directory: `tests/integration/` (structure provided, tests to be implemented)

---

## 3. Technical Requirements & Architecture

### High-Level Architecture (6 layers)

```
User Request
    │
    ▼
┌──────────────────┐
│   API Layer       │  FastAPI (/health, /agent/query)
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Security Layer   │  PII Redaction + Prompt Injection Check
└────────┬─────────┘
         ▼
┌──────────────────┐
│  Agent Planner    │  Keyword routing → ML / RAG / Both
└───┬──────────┬───┘
    ▼          ▼
┌────────┐ ┌────────┐
│ML Layer│ │RAG Layer│  XGBoost + FAISS/SentenceTransformers
└────────┘ └────────┘
    │          │
    ▼          ▼
┌──────────────────┐
│   Monitoring      │  Logging + Prometheus Metrics
└──────────────────┘
```

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Web Framework | FastAPI | 0.109.0 |
| ASGI Server | Uvicorn | 0.27.0 |
| Data Validation | Pydantic | 2.5.3 |
| ML Model | XGBoost | 2.0.3 |
| ML Utilities | scikit-learn | 1.4.0 |
| Data Processing | pandas / numpy | 2.2.0 / 1.26.3 |
| Experiment Tracking | MLflow | 2.10.0 |
| LLM Client | OpenAI SDK | 1.12.0 |
| Vector Search | faiss-cpu | 1.7.4 |
| Embeddings | sentence-transformers | 2.3.1 |
| Metrics | prometheus-client | 0.19.0 |
| Testing | pytest | 8.0.0 |
| Config | python-dotenv | 1.0.0 |
| Python | 3.10+ | — |

### Environment Variables (`.env`)
```
OPENAI_API_KEY=your_openai_key_here
APP_ENV=development
MODEL_VERSION=1.0.0
SECRET_KEY=your_secret_key_here
```

---

## 4. Database / Data Schema Requirements

This project uses **no traditional database**. Data is handled as follows:

| Data Type | Storage | Details |
|-----------|---------|---------|
| Training Data | In-memory (pandas DataFrame) | Mock-generated at startup via `RiskFeaturePipeline.create_mock_data()` |
| ML Model | MLflow artifact store | XGBoost model logged via `mlflow.xgboost.log_model()` |
| Policy Documents | Flat file (`data/raw/financial_policy.txt`) | Loaded and indexed at startup |
| Vector Index | In-memory FAISS (`IndexFlatL2`) | Built from embedded document chunks at startup |
| Metrics | Prometheus in-memory counters/histograms | Exposed via `/metrics` endpoint |

### ML Feature Schema

| Feature | Type | Range | Description |
|---------|------|-------|-------------|
| `credit_score` | int | 300–850 | Applicant credit score |
| `debt_to_income` | float | 0.1–0.6 | Debt-to-income ratio |
| `annual_income` | int | 30,000–200,000 | Annual income in USD |
| `loan_amount` | int | 5,000–50,000 | Requested loan amount |
| `years_at_job` | int | 0–40 | Years at current job |
| `is_high_risk` | int (0/1) | binary | Target label |

---

## 5. User Interface Requirements

The PDF describes a **headless API-only application** — no frontend UI is specified. Interaction is via:

- **REST API** endpoints (FastAPI auto-generates OpenAPI/Swagger docs at `/docs`)
- **Demo Client** (`demo_client.py`) — a script to exercise the API programmatically

> **Note**: If a frontend is desired for demonstration purposes, it would need to be designed separately to interact with the `/agent/query` and `/health` endpoints.

---

## 6. Third-Party Integrations

| Service | Purpose | Details |
|---------|---------|---------|
| **OpenAI API** | LLM capabilities (future/optional) | Key in `.env`; SDK v1.12.0 listed in requirements |
| **MLflow** | Experiment tracking, model registry | Logs params, metrics, and XGBoost model artifacts |
| **Sentence Transformers (HuggingFace)** | Document embeddings | Model: `all-MiniLM-L6-v2` |
| **FAISS (Facebook)** | Vector similarity search | `IndexFlatL2` for nearest-neighbour retrieval |
| **Prometheus** | Metrics collection | Counters and histograms exposed at `/metrics` |
| **AWS ECR** | Container registry | Docker image storage |
| **AWS ECS Fargate** | Container orchestration | Serverless compute for running the app |
| **Terraform** | Infrastructure as Code | ECS cluster, service, task definitions |
| **GitHub Actions** | CI/CD pipeline | Automated testing and deployment |

---

## 7. Deployment Requirements

### Docker
- `Dockerfile` and `docker-compose.yml` at project root
- Containerised FastAPI application

### AWS Infrastructure
- **ECR Repository**: `ai-risk-assistant`
- **ECS Cluster**: `ai-risk-assistant-cluster`
- **ECS Service**: `ai-risk-assistant-service`
- **Compute**: Fargate (serverless)
- **Region**: `us-east-1`

### Terraform IaC (`infra/terraform/`)
- `main.tf` — ECS cluster, service, task definition
- `variables.tf` — Configurable parameters
- `outputs.tf` — Output values

### CI/CD Pipeline (GitHub Actions)
- **Trigger**: Push to `main` branch
- **Jobs**:
  1. `test` — Install deps, run `pytest tests/`
  2. `deploy` (depends on test) — Build Docker image, push to ECR, force new ECS deployment
- **Secrets Required**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

---

## 8. Project Directory Structure

```
enterprise-ai-assistant/
├── backend/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── security.py          # PII redaction + injection detection
│   │       └── logger.py            # Structured logger
│   ├── ml/
│   │   ├── __init__.py
│   │   ├── feature_pipeline.py      # Feature engineering + mock data
│   │   ├── train_xgboost.py         # Model training + MLflow
│   │   └── predict.py               # Inference engine
│   ├── rag/
│   │   ├── __init__.py
│   │   ├── rag_engine.py            # FAISS + SentenceTransformer retrieval
│   │   └── test_rag.py
│   └── agent/
│       ├── __init__.py
│       └── planner.py               # Agentic query router
├── data/
│   ├── raw/
│   │   └── financial_policy.txt     # Policy document for RAG
│   └── processed/
├── monitoring/
│   └── metrics.py                   # Prometheus counters/histograms
├── tests/
│   ├── unit/
│   │   └── test_security.py         # PII + injection tests
│   └── integration/
├── infra/
│   └── terraform/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── .github/
│   └── workflows/
│       └── ci-cd.yml                # GitHub Actions pipeline
├── demo_client.py                   # API demo script
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env
├── .gitignore
└── README.md
```

---

## 9. Future Roadmap (4 Phases)

| Phase | Focus | Key Items |
|-------|-------|-----------|
| **Phase 1** | Intelligence Upgrade | LLM-based routing (function calling), multi-turn conversation memory |
| **Phase 2** | MLOps & Reliability | Automated retraining on metric degradation, data drift monitoring (EvidentlyAI), LLM response evaluation |
| **Phase 3** | Enterprise Hardening | OAuth2/JWT auth, advanced PII detection (Presidio), cost telemetry, audit logs |
| **Phase 4** | Cloud Scale | Full Docker + Terraform deployment, staging/prod environments, autoscaling, advanced AWS monitoring |

---

## 10. Known Issues / Notes from PDF

1. **Bug in `feature_pipeline.py`**: `annual_income` range is `(30000, 20000)` — the high value is less than the low value. Should likely be `(30000, 200000)`.
2. **Bug in `feature_pipeline.py`**: Extra closing parenthesis on the `is_high_risk` assignment line.
3. **OpenAI SDK** is listed in requirements but not actively used in the provided code — it's reserved for future Phase 1 LLM-based routing.
4. **No frontend UI** is defined — the application is API-only with Swagger docs.
5. **FAISS index and ML model** are both built/trained at application startup (in-memory, ephemeral).
