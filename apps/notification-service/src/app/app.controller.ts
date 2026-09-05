import { Controller, Logger, Inject } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Ctx,
  RmqContext,
  ClientProxy,
  MessagePattern,
} from '@nestjs/microservices';
import { AppService } from './app.service';
import { PinoLogger } from 'nestjs-pino';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly pinoLogger: PinoLogger,
    @Inject('GATEWAY_SERVICE') private readonly gatewayClient: ClientProxy,
  ) {}

  @EventPattern('test.hello')
  async handleNotificationSend(
    @Payload() data: { message?: string; userId?: string; type?: string; correlationId?: string },
  ) {
    const correlationId = data?.correlationId || 'unknown';

    // Attempt to assign correlationId to the request-scoped Pino logger context
    try {
      this.pinoLogger.assign({ correlationId });
    } catch {
      // Fallback: request context is not present in non-request contexts
    }

    // Explicitly include correlationId in the log metadata
    this.logger.log(
      { correlationId },
      `Received test.hello event with message: ${data?.message || 'None'}`,
    );

    await this.appService.processNotification(data?.message, data?.userId, data?.type);

    // Forward the event notification to API Gateway over TCP/RMQ
    this.gatewayClient.emit('notification.push', {
      message: `Notification processed: ${data?.message || 'Hello World'}`,
      correlationId,
    });
  }

  @MessagePattern('notification.list')
  async handleNotificationList(@Payload() data: { userId: string }) {
    return this.appService.getNotifications(data.userId);
  }

  @EventPattern('user.created')
  async handleUserCreated(@Payload() data: { userId: string; name: string }) {
    this.logger.log(`Received user.created event for ${data.userId}`);
    const message = `Welcome to our platform, ${data.name}!`;
    await this.appService.processNotification(message, data.userId, 'WELCOME');

    this.gatewayClient.emit('gateway.notify.user', {
      message: `Notification processed: ${message}`,
      correlationId: 'system',
    });
  }

  @MessagePattern('notification.markAsRead')
  async handleMarkAsRead(@Payload() data: { id: string; userId: string }) {
    return this.appService.markAsRead(data.id, data.userId);
  }
}
