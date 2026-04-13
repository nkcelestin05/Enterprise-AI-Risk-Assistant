# Enterprise AI Risk Assessment Assistant

An enterprise-grade AI-powered risk assessment platform that combines **machine learning**, **natural language processing**, and **MLOps monitoring** to deliver intelligent financial risk analysis. Built with Next.js 14, PostgreSQL, and production-ready cloud infrastructure.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     CLIENT (React / Next.js 14)                        │
│  ┌────────────────┐  ┌─────────────────┐  ┌───────────────────────┐  │
│  │ Risk Query UI  │  │ Admin Dashboard │  │ MLOps Monitoring     │  │
│  │ (D3.js Charts) │  │ (Data Tables)   │  │ (Recharts Graphs)   │  │
│  └────────────────┘  └─────────────────┘  └───────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                                    │
                            ┌───────┴───────┐
                            │  API Routes   │
                            │  (Next.js)    │
                            └───────┬───────┘
                                    │
          ┌──────────────────────┼──────────────────────┐
                                    │
  ┌─────────────────┐  ┌───────┴───────┐  ┌─────────────────┐
  │ GBT ML Model  │  │  TF-IDF RAG    │  │ LLM Gateway   │
  │ (50 stumps,   │  │  Engine        │  │ (Abacus.AI    │
  │  log-loss     │  │  (Cosine Sim,  │  │  RouteLLM)    │
  │  boosting)    │  │   Bigrams)    │  │               │
  └────────┬────────┘  └───────────────┘  └────────┬────────┘
           │                                       │
           └─────────────┬─────────────────────┘
                          │
                ┌─────────┴─────────┐
                │   PostgreSQL      │
                │   (Prisma ORM)    │
                └───────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Recharts |
| **Backend** | Next.js API Routes, NextAuth.js (JWT) |
| **ML Engine** | Gradient Boosted Trees (from-scratch implementation) |
| **NLP / RAG** | TF-IDF + Cosine Similarity semantic search |
| **Database** | PostgreSQL 15, Prisma ORM |
| **LLM** | Abacus.AI RouteLLM API |
| **Infrastructure** | Docker, Terraform (AWS), GitHub Actions CI/CD |
| **Monitoring** | Custom MLOps dashboard (latency, drift, throughput) |

---

## Features

### Core Risk Assessment
- Natural language query interface for financial risk analysis
- AI-powered conversational agent with context-aware responses
- Multi-dimensional risk scoring across credit, market, operational, and liquidity categories
- Interactive risk visualizations with confidence scores

### Machine Learning Pipeline (Upgrade #1)
- **Gradient Boosted Trees classifier** built from scratch (no scikit-learn)
- 50 decision stump estimators with log-loss gradient boosting
- Trained on 2,000 synthetically generated financial profiles with correlated features
- Seeded PRNG for reproducible training data
- Feature importance extraction and AUC-ROC evaluation
- Singleton model caching with automatic performance logging to database

### Semantic Search RAG (Upgrade #2)
- **TF-IDF vectorization engine** with custom tokenizer
- Porter stemmer approximation and stop word removal
- Unigram + bigram feature extraction for richer document representation
- Cosine similarity ranking with configurable top-K retrieval
- Pre-built regulatory knowledge base (Basel III, SOX, GDPR, ISO 31000, COSO ERM)

### MLOps Monitoring Dashboard (Upgrade #4)
- Real-time model performance tracking (accuracy, AUC-ROC, precision, recall)
- Latency percentiles (p50, p95, p99) with time-series visualization
- Throughput monitoring with area charts
- Feature importance bar charts
- Data drift detection using Population Stability Index (PSI)
- Error rate tracking and alerting thresholds

### Cloud Infrastructure (Upgrade #3)
- Multi-stage Docker build optimized for Next.js standalone output
- Docker Compose for local development with PostgreSQL
- Terraform IaC provisioning AWS VPC, ECR, ECS Fargate, ALB, Aurora PostgreSQL
- GitHub Actions CI/CD pipeline (lint → build → push → deploy)
- Auto-scaling policies based on CPU utilization

---

## Getting Started

### Prerequisites
- Node.js 18+
- Yarn
- PostgreSQL 15+ (or use Docker Compose)
- Abacus.AI API key for LLM access

### Local Development

```bash
# Clone the repository
git clone https://github.com/<your-username>/enterprise-ai-risk-assistant.git
cd enterprise-ai-risk-assistant

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, NEXTAUTH_SECRET, ABACUSAI_API_KEY

# Generate Prisma client and push schema
yarn prisma generate
yarn prisma db push

# Seed the database
yarn prisma db seed

# Start development server
yarn dev
```

The app will be available at `http://localhost:3000`.

### Docker Development

```bash
# Start all services (app + PostgreSQL)
docker-compose up -d

# With pgAdmin for database management
docker-compose --profile dev-tools up -d

# View logs
docker-compose logs -f app
```

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── agent/query/       # Risk assessment query endpoint
│   │   ├── admin/             # Admin stats & monitoring APIs
│   │   ├── auth/              # NextAuth.js authentication
│   │   └── health/            # Health check endpoint
│   ├── admin/                 # Admin dashboard pages
│   ├── query/                 # Risk query interface
│   └── layout.tsx             # Root layout
├── lib/
│   ├── ml-model.ts            # GBT classifier implementation
│   ├── tfidf-engine.ts        # TF-IDF semantic search engine
│   ├── risk-engine.ts         # Risk scoring orchestration
│   ├── synthetic-data.ts      # Training data generator
│   └── db.ts                  # Prisma client singleton
├── prisma/
│   └── schema.prisma          # Database schema
├── infra/
│   └── terraform/             # AWS infrastructure as code
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # GitHub Actions pipeline
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Local dev environment
└── README.md
```

---

## Infrastructure Deployment

### AWS Setup with Terraform

```bash
cd infra/terraform

# Initialize Terraform
terraform init

# Review the execution plan
terraform plan -var-file="production.tfvars"

# Apply infrastructure changes
terraform apply -var-file="production.tfvars"
```

### Required Terraform Variables

Create `infra/terraform/production.tfvars`:

```hcl
aws_region       = "us-east-1"
environment      = "production"
db_password      = "<secure-password>"
nextauth_secret  = "<generated-secret>"
abacusai_api_key = "<your-api-key>"
domain_name      = "risk-assistant.yourdomain.com"
```

### CI/CD Pipeline

The GitHub Actions workflow triggers on pushes to `main`:

1. **Quality Gate** — ESLint, TypeScript checks, Prisma validation
2. **Build & Push** — Docker image built and pushed to ECR
3. **Deploy** — ECS task definition updated, Fargate service rolling deployment

Required GitHub Secrets:
- `AWS_ROLE_ARN` — IAM role for OIDC authentication
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — JWT signing secret
- `ABACUSAI_API_KEY` — LLM API key

---

## ML Model Details

### Gradient Boosted Trees

The risk scoring engine uses a **from-scratch GBT implementation** rather than library calls, demonstrating deep understanding of the algorithm:

- **Training data**: 2,000 synthetic financial profiles with realistic correlations (debt-to-income ↔ credit score, revenue ↔ employee count)
- **Architecture**: 50 decision stumps, learning rate 0.1, log-loss objective
- **Features**: 7 normalized financial indicators (credit score, debt ratio, revenue, cash reserves, years in business, employee count, industry risk)
- **Evaluation**: AUC-ROC computed on 80/20 train-test split
- **Serving**: Singleton pattern with lazy initialization; model trains once and caches in memory

### TF-IDF Semantic Search

- Custom tokenizer with Porter stemmer approximation
- Unigram + bigram vocabulary for phrase-level matching
- IDF weighting with document frequency smoothing
- Cosine similarity ranking against regulatory knowledge base
- Returns top-K documents with similarity scores

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Secret for JWT token signing |
| `NEXTAUTH_URL` | Application URL (auto-configured in production) |
| `ABACUSAI_API_KEY` | Abacus.AI RouteLLM API key |

---

## License

MIT
