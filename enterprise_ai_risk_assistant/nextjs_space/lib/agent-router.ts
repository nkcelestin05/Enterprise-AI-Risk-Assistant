// Agent Planner/Router - Keyword-based intent detection

export type RouteType = 'ml' | 'rag' | 'both' | 'unknown';

export interface RouteDecision {
  route: RouteType;
  reasoning: string;
  mlKeywords: string[];
  ragKeywords: string[];
}

const ML_KEYWORDS = ['risk', 'score', 'assess', 'evaluate', 'predict', 'probability', 'classify', 'rating', 'creditworth', 'approval', 'approve', 'decline', 'loan risk', 'high risk', 'low risk', 'medium risk'];
const RAG_KEYWORDS = ['policy', 'rule', 'requirement', 'guideline', 'compliance', 'regulation', 'process', 'procedure', 'documentation', 'threshold', 'limit', 'criteria', 'standard', 'what is the', 'explain', 'tell me about', 'how does'];

export function routeQuery(query: string): RouteDecision {
  const lower = (query ?? '').toLowerCase();

  const mlMatches = ML_KEYWORDS.filter((k: string) => lower.includes(k));
  const ragMatches = RAG_KEYWORDS.filter((k: string) => lower.includes(k));

  const hasML = mlMatches.length > 0;
  const hasRAG = ragMatches.length > 0;

  if (hasML && hasRAG) {
    return {
      route: 'both',
      reasoning: 'Query contains both risk assessment and policy/knowledge keywords. Will provide comprehensive analysis using both ML risk scoring and policy retrieval.',
      mlKeywords: mlMatches,
      ragKeywords: ragMatches,
    };
  }
  if (hasML) {
    return {
      route: 'ml',
      reasoning: 'Query is focused on risk scoring or assessment. Routing to ML risk engine.',
      mlKeywords: mlMatches,
      ragKeywords: [],
    };
  }
  if (hasRAG) {
    return {
      route: 'rag',
      reasoning: 'Query is about policies, rules, or requirements. Routing to RAG knowledge engine.',
      mlKeywords: [],
      ragKeywords: ragMatches,
    };
  }

  return {
    route: 'unknown',
    reasoning: "I'm not sure how to help with that. Try asking about 'risk assessment' or 'policy requirements'.",
    mlKeywords: [],
    ragKeywords: [],
  };
}
