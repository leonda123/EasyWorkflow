import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import {
  ExecutionStartedEvent,
  NodeStartedEvent,
  NodeCompletedEvent,
  ExecutionCompletedEvent,
  SubscribeExecutionDto,
} from './workflow.events';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/workflow',
})
export class WorkflowGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WorkflowGateway.name);
  private executionRooms: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    this.executionRooms.forEach((clients, executionId) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.executionRooms.delete(executionId);
      }
    });
  }

  @SubscribeMessage('workflow:subscribe')
  handleWorkflowSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workflowId: string },
  ) {
    const { workflowId } = data;
    const roomName = `workflow:${workflowId}`;
    client.join(roomName);
    this.logger.log(`Client ${client.id} subscribed to workflow ${workflowId}`);
    return { success: true, message: `Subscribed to workflow ${workflowId}` };
  }

  @SubscribeMessage('workflow:unsubscribe')
  handleWorkflowUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workflowId: string },
  ) {
    const { workflowId } = data;
    const roomName = `workflow:${workflowId}`;
    client.leave(roomName);
    this.logger.log(`Client ${client.id} unsubscribed from workflow ${workflowId}`);
    return { success: true, message: `Unsubscribed from workflow ${workflowId}` };
  }

  @SubscribeMessage('execution:subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeExecutionDto,
  ) {
    const { executionId } = data;
    const roomName = `execution:${executionId}`;
    
    client.join(roomName);
    
    if (!this.executionRooms.has(executionId)) {
      this.executionRooms.set(executionId, new Set());
    }
    this.executionRooms.get(executionId)!.add(client.id);
    
    this.logger.log(`Client ${client.id} subscribed to execution ${executionId}`);
    
    return { success: true, message: `Subscribed to execution ${executionId}` };
  }

  @SubscribeMessage('execution:unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeExecutionDto,
  ) {
    const { executionId } = data;
    const roomName = `execution:${executionId}`;
    
    client.leave(roomName);
    
    const clients = this.executionRooms.get(executionId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.executionRooms.delete(executionId);
      }
    }
    
    this.logger.log(`Client ${client.id} unsubscribed from execution ${executionId}`);
    
    return { success: true, message: `Unsubscribed from execution ${executionId}` };
  }

  emitExecutionCreated(workflowId: string, executionId: string) {
    const roomName = `workflow:${workflowId}`;
    this.server.to(roomName).emit('execution:created', { executionId, workflowId });
    this.logger.log(`Execution created: ${executionId} for workflow ${workflowId}`);
  }

  emitExecutionStarted(event: ExecutionStartedEvent, workflowId: string) {
    const executionRoom = `execution:${event.executionId}`;
    const workflowRoom = `workflow:${workflowId}`;
    this.server.to(executionRoom).emit('execution:started', event);
    this.server.to(workflowRoom).emit('execution:started', event);
    this.logger.log(`Execution started: ${event.executionId}, nodes: ${event.totalNodes}`);
  }

  emitNodeStarted(event: NodeStartedEvent, workflowId: string) {
    const executionRoom = `execution:${event.executionId}`;
    const workflowRoom = `workflow:${workflowId}`;
    this.server.to(executionRoom).emit('node:started', event);
    this.server.to(workflowRoom).emit('node:started', event);
    this.logger.log(`Node started: ${event.nodeId} (${event.nodeLabel})`);
  }

  emitNodeCompleted(event: NodeCompletedEvent, workflowId: string) {
    const executionRoom = `execution:${event.executionId}`;
    const workflowRoom = `workflow:${workflowId}`;
    this.server.to(executionRoom).emit('node:completed', event);
    this.server.to(workflowRoom).emit('node:completed', event);
    this.logger.log(`Node completed: ${event.nodeId} (${event.nodeLabel}), status: ${event.status}`);
  }

  emitExecutionCompleted(event: ExecutionCompletedEvent, workflowId: string) {
    const executionRoom = `execution:${event.executionId}`;
    const workflowRoom = `workflow:${workflowId}`;
    this.server.to(executionRoom).emit('execution:completed', event);
    this.server.to(workflowRoom).emit('execution:completed', event);
    this.logger.log(`Execution completed: ${event.executionId}, status: ${event.status}`);
    
    setTimeout(() => {
      const clients = this.executionRooms.get(event.executionId);
      if (clients) {
        clients.forEach(clientId => {
          const socket = this.server.sockets.sockets.get(clientId);
          if (socket) {
            socket.leave(executionRoom);
          }
        });
        this.executionRooms.delete(event.executionId);
      }
    }, 5000);
  }
}
