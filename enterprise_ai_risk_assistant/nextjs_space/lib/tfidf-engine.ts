// TF-IDF + Cosine Similarity Semantic Search Engine
// Real NLP-based document retrieval replacing keyword matching

import { FINANCIAL_POLICIES } from './rag-data';

// ===== Document Chunk =====
export interface DocumentChunk {
  id: string;
  title: string;
  section: string;
  content: string;
  chunkIndex: number;
}

// ===== TF-IDF Vector =====
export interface TFIDFVector {
  terms: Map<string, number>;
  magnitude: number;
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  similarityScore: number;
  matchedTerms: string[];
}

// ===== Text Processing =====
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'not', 'no', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'each',
  'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such',
  'than', 'too', 'very', 'just', 'about', 'also', 'if', 'then', 'that',
  'this', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we',
  'our', 'you', 'your', 'he', 'she', 'him', 'her', 'his', 'i', 'me', 'my',
  'which', 'who', 'whom', 'what', 'when', 'where', 'how', 'why',
  'up', 'out', 'off', 'over', 'under', 'again', 'further',
]);

// Simple Porter stemmer approximation
function stem(word: string): string {
  let w = word.toLowerCase();
  // Remove common suffixes
  if (w.endsWith('ation')) return w.slice(0, -5);
  if (w.endsWith('ment')) return w.slice(0, -4);
  if (w.endsWith('ness')) return w.slice(0, -4);
  if (w.endsWith('ible')) return w.slice(0, -4);
  if (w.endsWith('able')) return w.slice(0, -4);
  if (w.endsWith('ment')) return w.slice(0, -4);
  if (w.endsWith('ence')) return w.slice(0, -4);
  if (w.endsWith('ance')) return w.slice(0, -4);
  if (w.endsWith('tion')) return w.slice(0, -4);
  if (w.endsWith('sion')) return w.slice(0, -4);
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('ied')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('ly') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('er') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
  return w;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/\b[a-z][a-z0-9]{1,}\b/g) ?? [])
    .filter(w => !STOP_WORDS.has(w) && w.length > 2)
    .map(stem);
}

// ===== Bigram extraction for phrase matching =====
function extractBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return bigrams;
}

// ===== TF-IDF Engine =====
class TFIDFEngine {
  private documents: DocumentChunk[] = [];
  private docVectors: TFIDFVector[] = [];
  private idf: Map<string, number> = new Map();
  private vocabulary: Set<string> = new Set();
  private initialized = false;

  initialize() {
    if (this.initialized) return;

    // Chunk documents
    this.documents = this.chunkDocuments();

    // Build vocabulary and compute IDF
    const docFreq = new Map<string, number>();
    const allDocTokens: string[][] = [];

    for (const doc of this.documents) {
      const tokens = tokenize(doc.content);
      const bigrams = extractBigrams(tokens);
      const allTerms = [...tokens, ...bigrams];
      allDocTokens.push(allTerms);

      const uniqueTerms = new Set(allTerms);
      for (const term of uniqueTerms) {
        this.vocabulary.add(term);
        docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
      }
    }

    // Compute IDF: log(N / df)
    const N = this.documents.length;
    for (const [term, df] of docFreq.entries()) {
      this.idf.set(term, Math.log((N + 1) / (df + 1)) + 1); // smoothed IDF
    }

    // Compute TF-IDF vectors for all documents
    for (const tokens of allDocTokens) {
      this.docVectors.push(this.computeTFIDF(tokens));
    }

    this.initialized = true;
  }

  private chunkDocuments(): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];

    for (const policy of FINANCIAL_POLICIES) {
      // Split by double newline into paragraphs, then group into chunks
      const paragraphs = policy.content.split('\n\n').filter(p => p.trim().length > 0);
      const chunkSize = 2; // paragraphs per chunk

      for (let i = 0; i < paragraphs.length; i += chunkSize) {
        const chunkContent = paragraphs.slice(i, i + chunkSize).join('\n\n');
        chunks.push({
          id: `${policy.section}-chunk-${Math.floor(i / chunkSize)}`,
          title: policy.title,
          section: policy.section,
          content: chunkContent,
          chunkIndex: Math.floor(i / chunkSize),
        });
      }
    }

    return chunks;
  }

  private computeTFIDF(tokens: string[]): TFIDFVector {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    const maxTF = Math.max(...Array.from(tf.values()), 1);
    const terms = new Map<string, number>();
    let magnitude = 0;

    for (const [term, count] of tf.entries()) {
      const normalizedTF = 0.5 + 0.5 * (count / maxTF); // augmented TF
      const idfVal = this.idf.get(term) ?? 0;
      const tfidf = normalizedTF * idfVal;
      terms.set(term, tfidf);
      magnitude += tfidf * tfidf;
    }

    magnitude = Math.sqrt(magnitude);
    return { terms, magnitude };
  }

  // Cosine similarity between two TF-IDF vectors
  private cosineSimilarity(a: TFIDFVector, b: TFIDFVector): number {
    if (a.magnitude === 0 || b.magnitude === 0) return 0;

    let dotProduct = 0;
    // Iterate over the smaller vector
    const [smaller, larger] = a.terms.size <= b.terms.size ? [a, b] : [b, a];
    for (const [term, weight] of smaller.terms.entries()) {
      const otherWeight = larger.terms.get(term);
      if (otherWeight !== undefined) {
        dotProduct += weight * otherWeight;
      }
    }

    return dotProduct / (a.magnitude * b.magnitude);
  }

  // Find matched terms between query and document
  private findMatchedTerms(queryTokens: string[], docVector: TFIDFVector): string[] {
    return queryTokens.filter(t => docVector.terms.has(t));
  }

  // Main retrieval function
  retrieve(query: string, topK: number = 3, minScore: number = 0.05): RetrievalResult[] {
    this.initialize();

    const queryTokens = tokenize(query);
    const queryBigrams = extractBigrams(queryTokens);
    const allQueryTerms = [...queryTokens, ...queryBigrams];
    const queryVector = this.computeTFIDF(allQueryTerms);

    const scored = this.documents.map((doc, i) => {
      const similarity = this.cosineSimilarity(queryVector, this.docVectors[i]);
      const matchedTerms = this.findMatchedTerms(allQueryTerms, this.docVectors[i]);
      return { chunk: doc, similarityScore: Math.round(similarity * 10000) / 10000, matchedTerms };
    });

    return scored
      .filter(r => r.similarityScore >= minScore)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, topK);
  }

  // Get engine statistics
  getStats(): { totalChunks: number; vocabularySize: number; avgChunkLength: number } {
    this.initialize();
    const totalTokens = this.documents.reduce((sum, doc) => sum + tokenize(doc.content).length, 0);
    return {
      totalChunks: this.documents.length,
      vocabularySize: this.vocabulary.size,
      avgChunkLength: Math.round(totalTokens / Math.max(this.documents.length, 1)),
    };
  }
}

// Singleton instance
let engine: TFIDFEngine | null = null;

export function getTFIDFEngine(): TFIDFEngine {
  if (!engine) {
    engine = new TFIDFEngine();
    engine.initialize();
  }
  return engine;
}

export function semanticSearch(query: string, topK: number = 3): RetrievalResult[] {
  return getTFIDFEngine().retrieve(query, topK);
}

export function getRAGStats() {
  return getTFIDFEngine().getStats();
}
