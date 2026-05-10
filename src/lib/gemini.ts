/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { Difficulty, Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    enunciado: { type: Type.STRING, description: "O enunciado da questão médica, preferencialmente um CASO CLÍNICO contextualizado seguindo estritamente o padrão INEP/Revalida." },
    alternatives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "A, B, C, D ou E" },
          text: { type: Type.STRING, description: "Texto da alternativa. Deve ser objetivo e compatível com o padrão INEP." },
          explanation: { type: Type.STRING, description: "Justificativa detalhada baseada em medicina baseada em evidências e condutas do SUS." }
        },
        required: ["id", "text", "explanation"]
      }
    },
    correctAlternative: { type: Type.STRING, description: "A, B, C, D ou E" },
    difficulty: { type: Type.STRING, description: "fácil, médio ou difícil" },
    category: { type: Type.STRING, description: "Uma das 5 categorias: 'Clínica Médica', 'Cirurgia', 'Ginecologia e Obstetrícia', 'Pediatria' ou 'Saúde Coletiva'." },
    theme: { type: Type.STRING, description: "Tema específico da questão." },
    origin: { type: Type.STRING, description: "'Official INEP/Revalida' ou 'Inedited Style INEP/Revalida'." },
    metadata: {
      type: Type.OBJECT,
      properties: {
        year: { type: Type.STRING, description: "Ano original se for oficial (ex: '2023')" },
        exam: { type: Type.STRING, description: "Nome do exame se for oficial (ex: 'Revalida INEP')" }
      }
    }
  },
  required: ["enunciado", "alternatives", "correctAlternative", "difficulty", "category", "theme", "origin"]
};

export async function generateQuestions(
  theme: string, 
  count: number, 
  alwaysHard: boolean, 
  originFilter: 'all' | 'official' | 'inedited' = 'all'
): Promise<Question[]> {
  const distribution = alwaysHard 
    ? { hard: count, medium: 0, easy: 0 }
    : {
        easy: Math.round(count * 0.3),
        medium: Math.round(count * 0.3),
        hard: count - Math.round(count * 0.3) - Math.round(count * 0.3)
      };

  const originDirective = originFilter === 'official' 
    ? "Gere EXCLUSIVAMENTE questões REAIS e OFICIAIS do INEP/Revalida que existam em sua base de conhecimento."
    : originFilter === 'inedited'
    ? "Gere EXCLUSIVAMENTE questões INÉDITAS, mas seguindo RIGOROSAMENTE o estilo, profundidade e estrutura do INEP/Revalida."
    : "Gere um mix de questões OFICIAIS do INEP e questões INÉDITAS no estilo INEP.";

  const prompt = `Você é um especialista em exames de Revalidação Médica no Brasil (Revalida INEP).
  Gere ${count} questões de múltipla escolha EXCLUSIVAMENTE seguindo o padrão Revalida/INEP sobre o tema: "${theme}".
  
  DIRETRIZES DE ESTILO REVALIDA/INEP:
  - ${originDirective}
  - Se criar questões inéditas, elas devem ser INDISTINGUÍVEIS das oficiais em termos de profundidade, linguagem e estrutura (casos clínicos).
  - Foco em raciocínio clínico, diagnóstico, conduta, prevenção e manejo no SUS.
  - EVITE termos excessivamente técnicos de sub-especialidades ou estilos de prova de residência médica tradicional.
  
  Regras de Formatação:
  1. Cada questão deve ter exatamente 5 alternativas (A-E). Unica correta. No patterns for correct option.
  2. Dificuldade: ${distribution.hard} Difíceis, ${distribution.medium} Médias, ${distribution.easy} Fáceis.
  3. JUSTIFICATIVAS: Comente individualmente cada alternativa de forma didática.
  4. ORIGEM: Identifique se a questão é 'Official INEP/Revalida' ou 'Inedited Style INEP/Revalida'.
  
  Retorne um ARRAY de objetos JSON.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: questionSchema
        }
      }
    });

    const questionsData = JSON.parse(result.text);
    return questionsData.map((q: any, index: number) => ({
      ...q,
      id: `gen-${Date.now()}-${index}`,
      theme
    }));
  } catch (error) {
    console.error("Erro ao gerar questões:", error);
    throw new Error("Falha ao gerar o simulado. Verifique sua conexão ou tente um tema diferente.");
  }
}

export async function analyzeContestation(
  question: Question,
  type: 'automatic' | 'manual',
  argument?: string
): Promise<{ status: 'accepted' | 'rejected'; feedback: string }> {
  const prompt = `Você é uma banca revisora soberana do exame Revalida INEP. 
  Sua tarefa é analisar uma contestação de uma questão médica.
  
  QUESTÃO PARA ANÁLISE:
  Enunciado: ${question.enunciado}
  Alternativas:
  ${question.alternatives.map(a => `${a.id}) ${a.text} - Explicação: ${a.explanation}`).join('\n')}
  Alternativa Correta Definida: ${question.correctAlternative}
  
  TIPO DE CONTESTAÇÃO: ${type === 'automatic' ? 'Revisão Automática (Verifique se há erros conceituais, ambiguidade ou múltiplas respostas corretas).' : 'Revisão Manual (O aluno enviou um argumento abaixo).'}
  ${argument ? `ARGUMENTO DO ALUNO: "${argument}"` : ''}
  
  DIRETRIZES DE REVISÃO:
  1. Se a questão tiver erro médico, for ambígua ou se o gabarito estiver errado de acordo com as diretrizes atuais do SUS ou MBE, ACEITE a contestação.
  2. Se a questão estiver correta mas o aluno estiver confuso ou o argumento dele for tecnicamente inválido, REJEITE a contestação.
  3. Seja justo, técnico e direto.
  
  Retorne um objeto JSON com:
  - status: "accepted" ou "rejected"
  - feedback: Uma explicação técnica curta e elegante para o aluno justificando sua decisão.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ["accepted", "rejected"] },
            feedback: { type: Type.STRING }
          },
          required: ["status", "feedback"]
        }
      }
    });

    return JSON.parse(result.text) as { status: 'accepted' | 'rejected'; feedback: string };
  } catch (error) {
    console.error("Erro ao analisar contestação:", error);
    return { 
      status: 'rejected', 
      feedback: "Houve um erro técnico ao processar sua contestação. Por favor, tente novamente mais tarde." 
    };
  }
}

export async function generateSimilarQuestions(errors: any[], count: number, category?: string, theme?: string): Promise<Question[]> {
  const errorContext = errors.map(e => `- Questão Errada: "${e.question.enunciado.substring(0, 50)}..." | Categoria: ${e.question.category} | Tema: ${e.question.theme}`).join('\n');
  
  const filterInfo = category ? `Filtrando por Categoria: ${category}.` : theme ? `Filtrando por Tema: ${theme}.` : 'Baseado em todas as questões erradas.';

  const prompt = `Você é um especialista em Revalida INEP.
  Gere ${count} NOVAS questões desafiadoras de REFORÇO baseadas nos seguintes erros:
  
  ${errorContext}
  
  ${filterInfo}
  
  DIRETRIZES DE ESTILO REVALIDA/INEP:
  - Todas as questões devem seguir o padrão de CASOS CLÍNICOS do INEP.
  - Profundidade, dificuldade, vocabulário e tipo de decisão clínica devem ser COMPATÍVEIS com o Revalida.
  - Justificativas detalhadas para as 5 alternativas.
  - ORIGEM: Identifique se a questão é 'Official INEP/Revalida' ou 'Inedited Style INEP/Revalida'.
  
  Retorne um ARRAY de objetos JSON.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: questionSchema
        }
      }
    });

    const questionsData = JSON.parse(result.text);
    return questionsData.map((q: any, index: number) => ({
      ...q,
      id: `sim-${Date.now()}-${index}`,
      theme: theme || q.theme || 'Reforço Temático'
    }));
  } catch (error) {
    console.error("Erro ao gerar questões semelhantes:", error);
    throw new Error("Falha ao gerar questões semelhantes.");
  }
}
