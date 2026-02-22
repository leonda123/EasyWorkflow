import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import OpenAI from 'openai';

interface GenerateCodeParams {
  description: string;
  context?: {
    inputFields?: string[];
    sampleData?: any;
    previousSteps?: string[];
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private llmService: LlmService) {}

  async generateCode(params: GenerateCodeParams): Promise<{ code: string; explanation: string }> {
    const { description, context } = params;

    const systemPrompt = `You are an expert code generator for data processing workflows.
Your task is to generate clean, efficient, and correct JavaScript code based on the user's description.

Rules:
1. Generate ONLY the code that processes data. Do NOT include any imports, function definitions, or wrapper code.
2. The code will be executed in a sandbox environment with access to:
   - \`inputs\`: The output from the previous node (array or object)
   - \`steps\`: An object containing outputs from all previous nodes (keyed by node ID)
   - \`trigger\`: The trigger data that started the workflow
3. The code MUST end with a return statement that outputs the processed data.
4. Use modern JavaScript syntax and best practices.
5. Handle edge cases gracefully (null checks, empty arrays, etc.).
6. Add brief inline comments for complex logic.
7. Keep the code concise but readable.

JavaScript specific:
- Use const/let instead of var
- Use arrow functions and array methods (map, filter, reduce, etc.)
- Use optional chaining (?.) and nullish coalescing (??)
- Use template literals for string interpolation`;

    const userPrompt = `Generate JavaScript code for the following data processing task:

Description: ${description}

${context?.previousSteps?.length ? `Previous nodes in workflow: ${context.previousSteps.join(', ')}` : ''}
${context?.inputFields?.length ? `Available input fields: ${context.inputFields.join(', ')}` : ''}
${context?.sampleData ? `Sample input data: ${JSON.stringify(context.sampleData, null, 2)}` : ''}

Generate the code now. Remember: only the processing logic, no function wrappers or imports.`;

    try {
      const openai = await this.llmService.getClient();
      
      if (!openai) {
        return this.generateFallbackCode(description);
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      });

      let code = response.choices[0]?.message?.content || '';
      
      code = this.cleanCode(code);
      
      const explanation = await this.generateExplanation(openai, code, description);

      return { code, explanation };
    } catch (error: any) {
      this.logger.error(`Failed to generate code: ${error.message}`);
      return this.generateFallbackCode(description);
    }
  }

  private cleanCode(code: string): string {
    code = code.trim();
    
    if (code.startsWith('```')) {
      const lines = code.split('\n');
      if (lines[0].startsWith('```')) {
        lines.shift();
      }
      if (lines[lines.length - 1].startsWith('```')) {
        lines.pop();
      }
      code = lines.join('\n').trim();
    }
    
    return code;
  }

  private async generateExplanation(
    openai: OpenAI,
    code: string,
    description: string,
  ): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You explain code concisely in 1-2 sentences. Focus on what the code does, not how.',
          },
          {
            role: 'user',
            content: `Briefly explain this JavaScript code that was generated for: "${description}"\n\nCode:\n${code}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || 'Code generated successfully.';
    } catch {
      return 'Code generated successfully.';
    }
  }

  private generateFallbackCode(description: string): { code: string; explanation: string } {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('filter') || lowerDesc.includes('过滤')) {
      return {
        code: `// Filter data based on condition\nconst result = inputs.filter(item => {\n  // Add your filter condition here\n  return item.active === true;\n});\nreturn result;`,
        explanation: 'Filters the input data based on a condition.',
      };
    }
    if (lowerDesc.includes('map') || lowerDesc.includes('转换') || lowerDesc.includes('transform')) {
      return {
        code: `// Transform data\nconst result = inputs.map(item => ({\n  ...item,\n  // Add transformations here\n}));\nreturn result;`,
        explanation: 'Transforms each item in the input data.',
      };
    }
    if (lowerDesc.includes('group') || lowerDesc.includes('分组')) {
      return {
        code: `// Group data by field\nconst groups = {};\ninputs.forEach(item => {\n  const key = item.category || 'other';\n  if (!groups[key]) groups[key] = [];\n  groups[key].push(item);\n});\nreturn Object.entries(groups).map(([key, items]) => ({ category: key, count: items.length, items }));`,
        explanation: 'Groups the input data by a specified field.',
      };
    }
    return {
      code: `// Process the input data\nconst result = inputs;\n// Add your processing logic here\nreturn result;`,
      explanation: 'Basic data processing template. Please add your logic.',
    };
  }
}
