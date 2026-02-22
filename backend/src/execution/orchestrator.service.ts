import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  ExecutionContext,
  ExecutionResult,
  ExecutionStepResult,
} from './execution.types';
import { NodeHandlerService } from './node-handler.service';
import { WorkflowGateway } from '../gateway/workflow.gateway';

@Injectable()
export class OrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private prisma: PrismaService,
    private nodeHandler: NodeHandlerService,
    @Inject(forwardRef(() => WorkflowGateway))
    private workflowGateway: WorkflowGateway,
  ) {}

  onModuleInit() {
    this.logger.log('Orchestrator service initialized');
  }

  async executeWorkflow(
    workflowId: string,
    triggerType: 'MANUAL' | 'WEBHOOK' | 'SCHEDULE' | 'PARTIAL',
    inputData: any,
    targetNodeId?: string,
    userId?: string,
  ): Promise<ExecutionResult> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { team: true },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        teamId: workflow.teamId,
        triggerUserId: userId,
        status: 'RUNNING',
        triggerType,
        inputData,
      },
    });

    this.workflowGateway.emitExecutionCreated(workflowId, execution.id);

    const definition = workflow.definition as unknown as WorkflowDefinition;
    
    this.runExecution(execution.id, workflowId, definition, inputData, targetNodeId).catch((error) => {
      this.logger.error(`Async execution failed: ${error.message}`);
    });

    return {
      executionId: execution.id,
      status: 'RUNNING',
      steps: [],
      output: null,
      duration: 0,
    };
  }

  async executeWorkflowSync(
    workflowId: string,
    triggerType: 'MANUAL' | 'WEBHOOK' | 'SCHEDULE' | 'PARTIAL',
    inputData: any,
    targetNodeId?: string,
    userId?: string,
  ): Promise<ExecutionResult> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { team: true },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        teamId: workflow.teamId,
        triggerUserId: userId,
        status: 'RUNNING',
        triggerType,
        inputData,
      },
    });

    const definition = workflow.definition as unknown as WorkflowDefinition;
    
    const result = await this.runExecution(execution.id, workflowId, definition, inputData, targetNodeId);

    return result;
  }

  private async runExecution(
    executionId: string,
    workflowId: string,
    definition: WorkflowDefinition,
    inputData: any,
    targetNodeId?: string,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const steps: ExecutionStepResult[] = [];

    this.logger.log(`=== Starting execution ${executionId} ===`);
    this.logger.log(`Target node: ${targetNodeId || 'full workflow'}`);

    this.logger.log(`Input data: ${JSON.stringify(this.truncateForLog(inputData))}`);

    try {
      const context: ExecutionContext = {
        trigger: {
          body: inputData?.body || inputData || {},
          headers: inputData?.headers || {},
          query: inputData?.query || {},
        },
        steps: {},
        globals: {},
      };

      const nodes = definition.nodes || [];
      const edges = definition.edges || [];

      this.logger.log(`Workflow has ${nodes.length} nodes, ${edges.length} edges`);

      let nodesToExecute: string[];
      let executionLevels: string[][];

      if (targetNodeId) {
        nodesToExecute = this.findUpstreamNodes(nodes, edges, targetNodeId);
        executionLevels = this.getExecutionLevels(
          nodes.filter(n => nodesToExecute.includes(n.id)),
          edges.filter(e => nodesToExecute.includes(e.source) && nodesToExecute.includes(e.target))
        );
      } else {
        nodesToExecute = this.topologicalSort(nodes, edges);
        executionLevels = this.getExecutionLevels(nodes, edges);
      }

      this.logger.log(`Execution order: ${nodesToExecute.join(' -> ')}`);
      this.logger.log(`Execution levels: ${JSON.stringify(executionLevels.map(l => `[${l.join(',')}]`))}`);

      this.workflowGateway.emitExecutionStarted({
        event: 'execution:started',
        executionId,
        totalNodes: nodesToExecute.length,
        nodeOrder: nodesToExecute,
      }, workflowId);

      let lastOutput: any = null;

      let skippedNodes = new Set<string>();

      for (const level of executionLevels) {
        const canParallel = this.canExecuteInParallel(level, nodes);
        
        if (canParallel && level.length > 1) {
          const nodesToRun = level.filter(nodeId => !skippedNodes.has(nodeId));
          
          if (nodesToRun.length === 0) {
            this.logger.log(`All nodes in this level are skipped`);
            continue;
          }
          
          this.logger.log(`=== Executing level in PARALLEL: ${nodesToRun.join(', ')} ===`);
          
          const results = await Promise.all(
            nodesToRun.map(async (nodeId) => {
              const node = nodes.find((n) => n.id === nodeId);
              if (!node) {
                this.logger.warn(`Node ${nodeId} not found in definition`);
                return null;
              }
              return this.executeNode(executionId, workflowId, node, context);
            })
          );

          for (const stepResult of results) {
            if (!stepResult) continue;
            
            steps.push(stepResult);
            lastOutput = stepResult.output;

            if (!stepResult.success) {
              const duration = Date.now() - startTime;
              
              this.logger.error(`=== Execution ${executionId} FAILED at parallel level ===`);
              
              await this.prisma.execution.update({
                where: { id: executionId },
                data: {
                  status: 'FAILED',
                  endTime: new Date(),
                  duration,
                },
              });

              await this.updateWorkflowStats(executionId, false);

              this.workflowGateway.emitExecutionCompleted({
                event: 'execution:completed',
                executionId,
                status: 'FAILED',
                duration,
                error: stepResult.error,
              }, workflowId);

              return {
                executionId,
                status: 'FAILED',
                steps,
                output: null,
                duration,
                error: stepResult.error,
              };
            }
          }
        } else {
          for (const nodeId of level) {
            if (skippedNodes.has(nodeId)) {
              this.logger.log(`Skipping node ${nodeId} (filtered by condition or loop)`);
              continue;
            }
            
            const node = nodes.find((n) => n.id === nodeId);
            if (!node) {
              this.logger.warn(`Node ${nodeId} not found in definition`);
              continue;
            }

            if (node.data?.type === 'loop') {
              this.logger.log(`--- Processing Loop node: ${node.data?.label || nodeId} ---`);
              
              const loopConfig = node.data?.config?.loopConfig || {};
              const loopBodyNodeIds = this.identifyLoopBody(nodeId, nodes, edges);
              
              if (loopBodyNodeIds.length > 0) {
                this.logger.log(`Executing loop body with ${loopBodyNodeIds.length} nodes`);
                
                const loopResult = await this.executeLoopBody(
                  executionId,
                  workflowId,
                  nodeId,
                  loopBodyNodeIds,
                  nodes,
                  edges,
                  context,
                  loopConfig,
                );

                const loopOutput = {
                  results: loopResult.results,
                  count: loopResult.results.length,
                  successCount: loopResult.results.filter((r: any) => r.success).length,
                  failedCount: loopResult.results.filter((r: any) => !r.success).length,
                  firstResult: loopResult.results[0] || null,
                  lastResult: loopResult.results[loopResult.results.length - 1] || null,
                };

                context.steps[nodeId] = loopOutput;
                lastOutput = loopOutput;

                steps.push({
                  nodeId: nodeId,
                  nodeLabel: node.data?.label || 'Loop',
                  nodeType: 'loop',
                  success: loopResult.success,
                  status: loopResult.success ? 'success' : 'failed',
                  duration: 0,
                  logs: [`Loop completed with ${loopResult.results.length} iterations`],
                  output: loopOutput,
                  error: loopResult.error,
                });

                loopBodyNodeIds.forEach((id) => skippedNodes.add(id));

                if (!loopResult.success) {
                  const duration = Date.now() - startTime;
                  
                  this.logger.error(`=== Execution ${executionId} FAILED in loop ${node.data?.label || nodeId} ===`);
                  
                  await this.prisma.execution.update({
                    where: { id: executionId },
                    data: {
                      status: 'FAILED',
                      endTime: new Date(),
                      duration,
                    },
                  });

                  await this.updateWorkflowStats(executionId, false);

                  this.workflowGateway.emitExecutionCompleted({
                    event: 'execution:completed',
                    executionId,
                    status: 'FAILED',
                    duration,
                    error: loopResult.error,
                  }, workflowId);

                  return {
                    executionId,
                    status: 'FAILED',
                    steps,
                    output: null,
                    duration,
                    error: loopResult.error,
                  };
                }

                continue;
              } else {
                this.logger.log(`Loop node ${nodeId} has no loop body, executing as simple node`);
              }
            }

            this.logger.log(`--- Executing node: ${node.data?.label || nodeId} (${node.data?.type}) ---`);

            const stepResult = await this.executeNode(executionId, workflowId, node, context);
            
            this.logger.log(`Node ${node.data?.label || nodeId} result: ${stepResult.success ? 'SUCCESS' : 'FAILED'}`);
            if (stepResult.error) {
              this.logger.error(`Node error: ${stepResult.error}`);
            }
            if (stepResult.logs && stepResult.logs.length > 0) {
              this.logger.log(`Node logs:\n  ${stepResult.logs.join('\n  ')}`);
            }

            steps.push(stepResult);
            lastOutput = stepResult.output;

            if (node.data?.type === 'condition' && stepResult.success) {
              const matchedHandle = stepResult.output?.matchedHandle;
              this.logger.log(`Condition node matched handle: ${matchedHandle}`);
              
              if (matchedHandle) {
                const unreachableNodes = this.getUnreachableNodes(
                  nodeId,
                  matchedHandle,
                  nodes,
                  edges,
                );
                
                this.logger.log(`Unreachable nodes to skip: ${JSON.stringify([...unreachableNodes])}`);
                unreachableNodes.forEach(n => skippedNodes.add(n));
              }
            }

            if (!stepResult.success) {
              const duration = Date.now() - startTime;
              
              this.logger.error(`=== Execution ${executionId} FAILED at node ${node.data?.label || nodeId} ===`);
              
              await this.prisma.execution.update({
                where: { id: executionId },
                data: {
                  status: 'FAILED',
                  endTime: new Date(),
                  duration,
                },
              });

              await this.updateWorkflowStats(executionId, false);

              this.workflowGateway.emitExecutionCompleted({
                event: 'execution:completed',
                executionId,
                status: 'FAILED',
                duration,
                error: stepResult.error,
              }, workflowId);

              return {
                executionId,
                status: 'FAILED',
                steps,
                output: null,
                duration,
                error: stepResult.error,
              };
            }
          }
        }
      }

      const duration = Date.now() - startTime;

      this.logger.log(`=== Execution ${executionId} SUCCESS in ${duration}ms ===`);

      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'SUCCESS',
          endTime: new Date(),
          duration,
          outputData: lastOutput as any,
        },
      });

      await this.updateWorkflowStats(executionId, true);

      this.workflowGateway.emitExecutionCompleted({
        event: 'execution:completed',
        executionId,
        status: 'SUCCESS',
        duration,
        output: lastOutput,
      }, workflowId);

      return {
        executionId,
        status: 'SUCCESS',
        steps,
        output: lastOutput,
        duration,
      };
    } catch (error: any) {
      this.logger.error(`=== Execution ${executionId} CRASHED: ${error.message} ===`);
      this.logger.error(`Stack trace: ${error.stack}`);

      const duration = Date.now() - startTime;
      
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          endTime: new Date(),
          duration,
        },
      });

      await this.updateWorkflowStats(executionId, false);

      this.workflowGateway.emitExecutionCompleted({
        event: 'execution:completed',
        executionId,
        status: 'FAILED',
        duration,
        error: error.message,
      }, workflowId);

      return {
        executionId,
        status: 'FAILED',
        steps,
        output: null,
        duration,
        error: error.message,
      };
    }
  }

  private async executeNode(
    executionId: string,
    workflowId: string,
    node: WorkflowNode,
    context: ExecutionContext,
  ): Promise<ExecutionStepResult> {
    const startTime = Date.now();
    const nodeLabel = node.data?.label || 'Unknown';
    const nodeType = node.data?.type || 'unknown';

    this.workflowGateway.emitNodeStarted({
      event: 'node:started',
      executionId,
      nodeId: node.id,
      nodeLabel,
      nodeType,
    }, workflowId);

    await this.prisma.executionStep.create({
      data: {
        executionId,
        nodeId: node.id,
        nodeLabel,
        nodeType,
        status: 'running',
        logs: [],
      },
    });

    try {
      const result = await this.nodeHandler.execute(node, context);

      const duration = Date.now() - startTime;

      context.steps[node.id] = result.output;

      const logOutput = this.truncateForLog(result.output);
      this.logger.log(`Step ${node.id} output: ${JSON.stringify(logOutput)}`);

      const cleanedOutputForDb = this.cleanBase64Data(result.output);
      await this.prisma.executionStep.updateMany({
        where: { executionId, nodeId: node.id },
        data: {
          status: result.success ? 'success' : 'failed',
          endTime: new Date(),
          duration,
          inputData: result.input as any,
          outputData: cleanedOutputForDb as any,
          logs: result.logs as any,
          errorMessage: result.error ? result.error.substring(0, 500) : null,
        },
      });

      this.workflowGateway.emitNodeCompleted({
        event: 'node:completed',
        executionId,
        nodeId: node.id,
        nodeLabel,
        status: result.success ? 'success' : 'failed',
        duration,
        output: result.output,
        logs: result.logs,
        error: result.error,
      }, workflowId);

      return {
        nodeId: node.id,
        nodeLabel,
        nodeType,
        success: result.success,
        status: result.success ? 'success' : 'failed',
        duration,
        logs: result.logs || [],
        input: result.input,
        output: result.output,
        error: result.error,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || 'Unknown error';
      
      await this.prisma.executionStep.updateMany({
        where: { executionId, nodeId: node.id },
        data: {
          status: 'failed',
          endTime: new Date(),
          duration,
          errorMessage: errorMsg.substring(0, 500),
        },
      });

      this.workflowGateway.emitNodeCompleted({
        event: 'node:completed',
        executionId,
        nodeId: node.id,
        nodeLabel,
        status: 'failed',
        duration,
        error: errorMsg,
      }, workflowId);

      return {
        nodeId: node.id,
        nodeLabel,
        nodeType,
        success: false,
        status: 'failed',
        duration,
        logs: [`[ERROR] ${errorMsg}`],
        output: null,
        error: errorMsg,
      };
    }
  }

  private topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    }

    for (const edge of edges) {
      const targets = graph.get(edge.source) || [];
      targets.push(edge.target);
      graph.set(edge.source, targets);

      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      const targets = graph.get(nodeId) || [];
      for (const target of targets) {
        const newDegree = (inDegree.get(target) || 0) - 1;
        inDegree.set(target, newDegree);
        if (newDegree === 0) {
          queue.push(target);
        }
      }
    }

    return result;
  }

  private getExecutionLevels(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[][] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodeMap = new Map<string, WorkflowNode>();

    for (const node of nodes) {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
      nodeMap.set(node.id, node);
    }

    for (const edge of edges) {
      const targets = graph.get(edge.source) || [];
      targets.push(edge.target);
      graph.set(edge.source, targets);

      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    const levels: string[][] = [];
    let currentLevel: string[] = [];

    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        currentLevel.push(nodeId);
      }
    }

    while (currentLevel.length > 0) {
      levels.push([...currentLevel]);
      const nextLevel: string[] = [];

      for (const nodeId of currentLevel) {
        const targets = graph.get(nodeId) || [];
        for (const target of targets) {
          const newDegree = (inDegree.get(target) || 0) - 1;
          inDegree.set(target, newDegree);
          if (newDegree === 0) {
            nextLevel.push(target);
          }
        }
      }

      currentLevel = nextLevel;
    }

    return levels;
  }

  private canExecuteInParallel(nodeIds: string[], nodes: WorkflowNode[]): boolean {
    if (nodeIds.length <= 1) return false;

    const llmNodes = nodeIds.filter(id => {
      const node = nodes.find(n => n.id === id);
      return node?.data?.type === 'llm';
    });

    return llmNodes.length > 1;
  }

  private findUpstreamNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    targetNodeId: string,
  ): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const incomingEdges = edges.filter((e) => e.target === nodeId);
      for (const edge of incomingEdges) {
        dfs(edge.source);
      }

      result.push(nodeId);
    };

    dfs(targetNodeId);

    return this.topologicalSort(
      nodes.filter((n) => result.includes(n.id)),
      edges.filter((e) => result.includes(e.source) && result.includes(e.target)),
    );
  }

  private getUnreachableNodes(
    conditionNodeId: string,
    matchedHandle: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): Set<string> {
    const allBranchEdges = edges.filter((e) => e.source === conditionNodeId);
    
    const matchedEdge = allBranchEdges.find(
      (e) => e.sourceHandle === matchedHandle
    );

    if (!matchedEdge) {
      this.logger.warn(`No edge found for condition ${conditionNodeId} with handle ${matchedHandle}`);
      return new Set();
    }

    const reachableNodes = new Set<string>();
    const findReachable = (nodeId: string) => {
      if (reachableNodes.has(nodeId)) return;
      reachableNodes.add(nodeId);
      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        findReachable(edge.target);
      }
    };

    findReachable(matchedEdge.target);

    const otherBranchTargets = allBranchEdges
      .filter((e) => e.sourceHandle !== matchedHandle)
      .map((e) => e.target);

    const unreachableNodes = new Set<string>();
    for (const targetId of otherBranchTargets) {
      const collectUnreachable = (nodeId: string) => {
        if (reachableNodes.has(nodeId)) return;
        if (unreachableNodes.has(nodeId)) return;
        unreachableNodes.add(nodeId);
        const outgoingEdges = edges.filter((e) => e.source === nodeId);
        for (const edge of outgoingEdges) {
          collectUnreachable(edge.target);
        }
      };
      collectUnreachable(targetId);
    }

    return unreachableNodes;
  }

  private filterBranches(
    conditionNodeId: string,
    matchedHandle: string,
    executionLevels: string[][],
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    nodesToExecute: string[],
  ): string[][] {
    const allBranchEdges = edges.filter((e) => e.source === conditionNodeId);
    
    this.logger.log(`All branch edges: ${JSON.stringify(allBranchEdges.map(e => ({ target: e.target, handle: e.sourceHandle })))}`);
    
    const matchedEdge = allBranchEdges.find(
      (e) => e.sourceHandle === matchedHandle
    );

    if (!matchedEdge) {
      this.logger.warn(`No edge found for condition ${conditionNodeId} with handle ${matchedHandle}`);
      return executionLevels;
    }

    const reachableNodes = new Set<string>();
    const findReachable = (nodeId: string) => {
      if (reachableNodes.has(nodeId)) return;
      reachableNodes.add(nodeId);
      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        findReachable(edge.target);
      }
    };

    findReachable(matchedEdge.target);
    this.logger.log(`Reachable nodes from matched branch: ${JSON.stringify([...reachableNodes])}`);

    const otherBranchTargets = allBranchEdges
      .filter((e) => e.sourceHandle !== matchedHandle)
      .map((e) => e.target);
    
    this.logger.log(`Other branch targets: ${JSON.stringify(otherBranchTargets)}`);

    const unreachableNodes = new Set<string>();
    for (const targetId of otherBranchTargets) {
      const collectUnreachable = (nodeId: string) => {
        if (reachableNodes.has(nodeId)) return;
        if (unreachableNodes.has(nodeId)) return;
        unreachableNodes.add(nodeId);
        const outgoingEdges = edges.filter((e) => e.source === nodeId);
        for (const edge of outgoingEdges) {
          collectUnreachable(edge.target);
        }
      };
      collectUnreachable(targetId);
    }

    this.logger.log(`Unreachable nodes: ${JSON.stringify([...unreachableNodes])}`);

    const filteredLevels = executionLevels.map((level) =>
      level.filter((nodeId) => !unreachableNodes.has(nodeId))
    ).filter((level) => level.length > 0);

    this.logger.log(`Filtered levels: ${JSON.stringify(filteredLevels)}`);

    return filteredLevels;
  }

  private identifyLoopBody(
    loopNodeId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
  ): string[] {
    const loopStartEdge = edges.find(
      (e) => e.source === loopNodeId && e.sourceHandle === 'loop'
    );

    if (!loopStartEdge) {
      this.logger.log(`No loop body edge found for loop node ${loopNodeId}`);
      return [];
    }

    const visited = new Set<string>();
    const loopBodyNodes: string[] = [];
    const queue = [loopStartEdge.target];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      loopBodyNodes.push(nodeId);

      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (edge.target !== loopNodeId && !visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    this.logger.log(`Identified loop body nodes for ${loopNodeId}: ${JSON.stringify(loopBodyNodes)}`);
    return loopBodyNodes;
  }

  private async executeLoopBody(
    executionId: string,
    workflowId: string,
    loopNodeId: string,
    loopBodyNodeIds: string[],
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    context: ExecutionContext,
    config: any,
  ): Promise<{ results: any[]; success: boolean; error?: string }> {
    const loopConfig = config || {};
    const results: any[] = [];
    const maxIterations = loopConfig.maxIterations || 100;
    const continueOnError = loopConfig.continueOnError ?? false;

    let items: any[] = [];
    switch (loopConfig.mode) {
      case 'count':
        let count = loopConfig.count || 1;
        if (loopConfig.countPath) {
          const resolvedCount = this.nodeHandler['variableService'].resolvePath(loopConfig.countPath, context);
          count = typeof resolvedCount === 'number' ? resolvedCount : parseInt(resolvedCount, 10) || 1;
        }
        items = Array.from({ length: Math.min(count, maxIterations) }, (_, i) => i);
        this.logger.log(`Loop count mode: ${items.length} iterations`);
        break;

      case 'array':
        if (loopConfig.arrayPath) {
          const array = this.nodeHandler['variableService'].resolvePath(loopConfig.arrayPath, context);
          if (Array.isArray(array)) {
            items = array.slice(0, maxIterations);
          } else {
            this.logger.warn(`Array path resolved to non-array: ${typeof array}`);
            items = [];
          }
        }
        this.logger.log(`Loop array mode: ${items.length} items`);
        break;

      case 'condition':
        items = Array.from({ length: maxIterations }, (_, i) => null);
        this.logger.log(`Loop condition mode: max ${maxIterations} iterations`);
        break;

      default:
        items = Array.from({ length: 1 }, (_, i) => i);
    }

    const loopBodyNodes = nodes.filter((n) => loopBodyNodeIds.includes(n.id));
    const loopBodyEdges = edges.filter(
      (e) => loopBodyNodeIds.includes(e.source) && loopBodyNodeIds.includes(e.target)
    );
    const executionOrder = this.topologicalSort(loopBodyNodes, loopBodyEdges);
    this.logger.log(`Loop body execution order: ${executionOrder.join(' -> ')}`);

    for (let i = 0; i < items.length; i++) {
      if (loopConfig.mode === 'condition' && loopConfig.conditionExpression) {
        const shouldContinue = await this.nodeHandler['sandboxService'].evaluateCondition(
          loopConfig.conditionExpression,
          context,
        );
        if (!shouldContinue) {
          this.logger.log(`Condition evaluated to false at iteration ${i}, stopping loop`);
          break;
        }
      }

      context.loop = {
        item: items[i],
        index: i,
        count: items.length,
        first: i === 0,
        last: i === items.length - 1,
        iteration: i + 1,
        results: results,
      };

      this.logger.log(`Loop iteration ${i + 1}/${items.length}, item: ${JSON.stringify(items[i])?.substring(0, 100)}`);

      let iterationSuccess = true;
      const iterationOutputs: any = {};

      for (const nodeId of executionOrder) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        const stepResult = await this.executeNode(executionId, workflowId, node, context);

        if (!stepResult.success) {
          if (!continueOnError) {
            delete context.loop;
            return { results, success: false, error: stepResult.error };
          }
          iterationSuccess = false;
        }

        iterationOutputs[nodeId] = stepResult.output;
      }

      results.push({
        index: i,
        item: items[i],
        success: iterationSuccess,
        outputs: iterationOutputs,
        timestamp: new Date().toISOString(),
      });
    }

    delete context.loop;

    this.logger.log(`Loop completed: ${results.length} iterations`);
    return { results, success: true };
  }

  private truncateForLog(obj: any, maxStringLength: number = 200): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      if (obj.startsWith('data:') && obj.includes(';base64,')) {
        const parts = obj.split(';base64,');
        if (parts.length === 2) {
          const mimeType = parts[0].substring(5);
          const base64Data = parts[1];
          return `[base64:${mimeType}:${base64Data.length}chars]`;
        }
      }
      if (obj.length > maxStringLength) {
        return obj.substring(0, maxStringLength) + '...';
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.truncateForLog(item, maxStringLength));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'data' && typeof value === 'string' && value.startsWith('data:')) {
          result[key] = this.truncateForLog(value, maxStringLength);
        } else if (key === 'data' && typeof value === 'string' && value.length > maxStringLength) {
          result[key] = `[string:${value.length}chars]`;
        } else {
          result[key] = this.truncateForLog(value, maxStringLength);
        }
      }
      return result;
    }

    return obj;
  }

  private cleanBase64Data(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      if (obj.startsWith('data:') && obj.includes(';base64,')) {
        const parts = obj.split(';base64,');
        if (parts.length === 2) {
          return `[base64:${parts[0].substring(5)}:${parts[1].length}chars]`;
        }
      }
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanBase64Data(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'data' && typeof value === 'string' && value.startsWith('data:')) {
        const parts = value.split(';base64,');
        if (parts.length === 2) {
          result[key] = `[base64:${parts[0].substring(5)}:${parts[1].length}chars]`;
        } else {
          result[key] = value;
        }
      } else {
        result[key] = this.cleanBase64Data(value);
      }
    }
    return result;
  }

  private async updateWorkflowStats(executionId: string, success: boolean) {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!execution) return;

    const stats = await this.prisma.execution.aggregate({
      where: { workflowId: execution.workflowId },
      _count: true,
    });

    const successCount = await this.prisma.execution.count({
      where: {
        workflowId: execution.workflowId,
        status: 'SUCCESS',
      },
    });

    await this.prisma.workflow.update({
      where: { id: execution.workflowId },
      data: {
        runsCount: stats._count,
        successRate: stats._count > 0 ? (successCount / stats._count) * 100 : 0,
      },
    });
  }
}
