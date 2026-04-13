export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { checkSecurity } from '@/lib/security';
import { routeQuery } from '@/lib/agent-router';
import { calculateRiskScore, parseUserFeatures, RiskFeatures } from '@/lib/risk-engine';
import { semanticSearch } from '@/lib/tfidf-engine';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const body = await request.json();
    const { query, userFeatures } = body ?? {};

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Security check
    const securityResult = checkSecurity(query);

    if (securityResult.injectionDetected) {
      await prisma.securityLog.create({
        data: {
          eventType: 'prompt_injection',
          severity: 'critical',
          details: `Injection detected: "${securityResult?.injectionKeyword ?? 'unknown'}". Query blocked.`,
          userId: userId ?? null,
        },
      }).catch(() => {});
      return NextResponse.json({
        error: 'Security alert: Potential prompt injection detected. Query blocked.',
        securityEvent: 'prompt_injection',
      }, { status: 400 });
    }

    // Log PII events
    if ((securityResult?.piiDetected?.length ?? 0) > 0) {
      await prisma.securityLog.create({
        data: {
          eventType: 'pii_redaction',
          severity: 'warning',
          details: `PII redacted: ${(securityResult?.piiDetected ?? []).join(', ')}`,
          userId: userId ?? null,
        },
      }).catch(() => {});
    }

    const sanitizedQuery = securityResult?.sanitizedText ?? query;
    const routeDecision = routeQuery(sanitizedQuery);

    let riskResult: any = null;
    let ragResult: any = null;
    let llmResponse = '';

    // ML Risk Scoring using trained GBM model
    if (routeDecision.route === 'ml' || routeDecision.route === 'both') {
      const parsed = parseUserFeatures(sanitizedQuery);
      const features: RiskFeatures = {
        creditScore: userFeatures?.creditScore ?? parsed?.creditScore ?? 650,
        debtToIncome: userFeatures?.debtToIncome ?? parsed?.debtToIncome ?? 0.35,
        annualIncome: userFeatures?.annualIncome ?? parsed?.annualIncome ?? 65000,
        loanAmount: userFeatures?.loanAmount ?? parsed?.loanAmount ?? 20000,
        yearsAtJob: userFeatures?.yearsAtJob ?? parsed?.yearsAtJob ?? 3,
      };
      riskResult = calculateRiskScore(features);
    }

    // RAG retrieval using TF-IDF + Cosine Similarity
    if (routeDecision.route === 'rag' || routeDecision.route === 'both') {
      const retrievalResults = semanticSearch(sanitizedQuery, 3);
      ragResult = {
        retrievedChunks: retrievalResults.map(r => r.chunk.title),
        context: retrievalResults.map(r => r.chunk.content).join('\n\n'),
        similarityScores: retrievalResults.map(r => ({
          title: r.chunk.title,
          section: r.chunk.section,
          score: r.similarityScore,
          matchedTerms: r.matchedTerms.slice(0, 5),
        })),
        retrievalMethod: 'tfidf-cosine-similarity',
      };
    }

    // Build LLM prompt
    const systemPrompt = buildSystemPrompt(routeDecision.route, riskResult, ragResult);

    // Stream response from LLM
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const apiKey = process.env.ABACUSAI_API_KEY;
          if (!apiKey) {
            const errData = JSON.stringify({ status: 'error', message: 'LLM API key not configured' });
            controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
            controller.close();
            return;
          }

          const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: sanitizedQuery },
          ];

          const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-4.1-mini',
              messages,
              stream: true,
              max_tokens: 2000,
            }),
          });

          if (!response?.ok) {
            const errData = JSON.stringify({ status: 'error', message: `LLM API error: ${response?.status ?? 'unknown'}` });
            controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
            controller.close();
            return;
          }

          const reader = response?.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let partialRead = '';

          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines?.pop() ?? '';
            for (const line of (lines ?? [])) {
              if (line?.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  const latencyMs = Date.now() - startTime;
                  // Save query to DB
                  try {
                    const savedQuery = await prisma.query.create({
                      data: {
                        userId,
                        queryText: query,
                        sanitizedQuery,
                        routeType: routeDecision.route,
                        latencyMs,
                        status: 'completed',
                      },
                    });
                    if (riskResult) {
                      const features: RiskFeatures = {
                        creditScore: userFeatures?.creditScore ?? 650,
                        debtToIncome: userFeatures?.debtToIncome ?? 0.35,
                        annualIncome: userFeatures?.annualIncome ?? 65000,
                        loanAmount: userFeatures?.loanAmount ?? 20000,
                        yearsAtJob: userFeatures?.yearsAtJob ?? 3,
                      };
                      await prisma.riskAssessment.create({
                        data: {
                          queryId: savedQuery.id,
                          creditScore: features.creditScore,
                          debtToIncome: features.debtToIncome,
                          annualIncome: features.annualIncome,
                          loanAmount: features.loanAmount,
                          yearsAtJob: features.yearsAtJob,
                          riskProbability: riskResult?.riskProbability ?? 0,
                          riskLevel: riskResult?.riskLevel ?? 'Low',
                          recommendation: riskResult?.recommendation ?? '',
                          modelVersion: riskResult?.modelVersion ?? null,
                          confidence: riskResult?.confidence ?? null,
                        },
                      });
                    }
                    if (ragResult) {
                      await prisma.ragResult.create({
                        data: {
                          queryId: savedQuery.id,
                          retrievedChunks: JSON.stringify(ragResult?.retrievedChunks ?? []),
                          answer: buffer,
                          similarityScores: JSON.stringify(ragResult?.similarityScores ?? []),
                          retrievalMethod: ragResult?.retrievalMethod ?? 'tfidf-cosine-similarity',
                        },
                      });
                    }
                  } catch (dbErr: any) {
                    console.error('DB save error:', dbErr);
                  }

                  // Log metrics
                  await prisma.systemMetric.create({
                    data: {
                      metricName: 'query_latency',
                      metricValue: latencyMs,
                      metadata: JSON.stringify({
                        route: routeDecision.route,
                        modelVersion: riskResult?.modelVersion ?? null,
                        confidence: riskResult?.confidence ?? null,
                      }),
                    },
                  }).catch(() => {});

                  // Log prediction metric for model monitoring
                  if (riskResult) {
                    await prisma.systemMetric.create({
                      data: {
                        metricName: 'ml_prediction',
                        metricValue: riskResult.riskProbability,
                        metadata: JSON.stringify({
                          riskLevel: riskResult.riskLevel,
                          confidence: riskResult.confidence,
                          modelVersion: riskResult.modelVersion,
                          features: {
                            creditScore: userFeatures?.creditScore ?? 650,
                            dti: userFeatures?.debtToIncome ?? 0.35,
                            income: userFeatures?.annualIncome ?? 65000,
                            loan: userFeatures?.loanAmount ?? 20000,
                            years: userFeatures?.yearsAtJob ?? 3,
                          },
                        }),
                      },
                    }).catch(() => {});
                  }

                  const finalData = JSON.stringify({
                    status: 'completed',
                    response: buffer,
                    riskResult: riskResult ?? null,
                    ragResult: ragResult ? {
                      retrievedChunks: ragResult?.retrievedChunks ?? [],
                      similarityScores: ragResult?.similarityScores ?? [],
                      retrievalMethod: ragResult?.retrievalMethod ?? 'tfidf-cosine-similarity',
                    } : null,
                    routeDecision: { route: routeDecision.route, reasoning: routeDecision?.reasoning ?? '' },
                    security: {
                      piiRedacted: securityResult?.piiDetected ?? [],
                    },
                    latencyMs,
                  });
                  controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed?.choices?.[0]?.delta?.content ?? '';
                  buffer += content;
                  if (content) {
                    const chunkData = JSON.stringify({ status: 'streaming', content });
                    controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`));
                  }
                } catch {
                  // skip invalid JSON
                }
              }
            }
          }
          controller.close();
        } catch (err: any) {
          console.error('Stream error:', err);
          const errData = JSON.stringify({ status: 'error', message: err?.message ?? 'Stream error' });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Agent query error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}

function buildSystemPrompt(route: string, riskResult: any, ragResult: any): string {
  let prompt = `You are an Enterprise AI Risk Assistant specializing in financial risk assessment and policy guidance. You are backed by a real Gradient Boosted Trees ML model and a TF-IDF semantic retrieval engine. Provide clear, professional, and detailed responses.\n\n`;

  if (route === 'ml' || route === 'both') {
    prompt += `ML MODEL RISK ASSESSMENT DATA:\n`;
    prompt += `- Model: ${riskResult?.modelVersion ?? 'N/A'}\n`;
    prompt += `- Risk Probability: ${((riskResult?.riskProbability ?? 0) * 100).toFixed(2)}%\n`;
    prompt += `- Risk Level: ${riskResult?.riskLevel ?? 'N/A'}\n`;
    prompt += `- Confidence: ${((riskResult?.confidence ?? 0) * 100).toFixed(1)}%\n`;
    prompt += `- Recommendation: ${riskResult?.recommendation ?? 'N/A'}\n`;
    prompt += `- Feature Analysis: ${riskResult?.explanation ?? ''}\n`;
    if (riskResult?.featureContributions) {
      prompt += `- Feature Contributions:\n`;
      for (const fc of riskResult.featureContributions) {
        prompt += `  • ${fc.feature}: ${fc.impact} (value: ${fc.value}, contribution: ${((fc.contribution ?? 0) * 100).toFixed(1)}%)\n`;
      }
    }
    prompt += `\nUse this ML model output to provide a comprehensive risk assessment. Explain what each factor means, how the model weighs them, and justify the recommendation.\n\n`;
  }

  if (route === 'rag' || route === 'both') {
    prompt += `RETRIEVED POLICY CONTEXT (via TF-IDF semantic search):\n`;
    if (ragResult?.similarityScores) {
      for (const s of ragResult.similarityScores) {
        prompt += `- ${s.title} (relevance: ${(s.score * 100).toFixed(1)}%, matched terms: ${s.matchedTerms?.join(', ') ?? 'N/A'})\n`;
      }
    }
    prompt += `\n${ragResult?.context ?? 'No context available'}\n\n`;
    prompt += `Use this policy context to answer the query accurately. Cite specific policy details and sections when relevant.\n\n`;
  }

  if (route === 'unknown') {
    prompt += `The query does not clearly relate to risk assessment or policies. Provide a helpful response explaining what the system can do:\n- Risk assessment queries (mention 'risk', 'score', 'assess')\n- Policy inquiries (mention 'policy', 'rule', 'requirement')\nSuggest example queries the user could try.\n`;
  }

  prompt += `Always be professional, concise, and actionable in your response. Format with clear sections when appropriate.`;
  return prompt;
}
