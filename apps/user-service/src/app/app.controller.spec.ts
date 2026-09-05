import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PinoLogger } from 'nestjs-pino';
import { TcpContext } from '@nestjs/microservices';
import { getConnectionToken } from '@nestjs/mongoose';
import { RedisService } from '@dedisalam/database';

describe('AppController', () => {
  let app: TestingModule;
  let mockPinoLogger: Partial<PinoLogger>;

  beforeAll(async () => {
    mockPinoLogger = {
      assign: jest.fn(),
    };

    const mockRmqClient = {
      emit: jest.fn(),
    };

    const mockRedisClient = {
      getClient: jest.fn().mockReturnValue({ ping: jest.fn().mockResolvedValue('PONG') }),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue('hello_redis'),
    };

    const mockConnection = {
      readyState: 1,
      db: {
        admin: () => ({
          ping: jest.fn().mockResolvedValue({ ok: 1 }),
        }),
      },
    };

    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
        {
          provide: 'NOTIFICATION_SERVICE_RMQ',
          useValue: mockRmqClient,
        },
        {
          provide: RedisService,
          useValue: mockRedisClient,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();
  });

  describe('hello', () => {
    it('should return hello message and correlation ID', async () => {
      const appController = app.get<AppController>(AppController);
      const mockContext = {} as TcpContext;
      const result = await appController.hello(
        { name: 'Nest', correlationId: 'test-123' },
        mockContext,
      );

      expect(result).toEqual({
        message: 'Hello Nest from User Service',
        correlationId: 'test-123',
      });
      expect(mockPinoLogger.assign).toHaveBeenCalledWith({ correlationId: 'test-123' });
    });

    it('should handle missing payload properties gracefully (Negative Test)', async () => {
      const appController = app.get<AppController>(AppController);
      const mockContext = {} as TcpContext;
      const result = await appController.hello({} as any, mockContext);

      expect(result).toEqual({
        message: 'Hello World from User Service',
        correlationId: 'unknown',
      });
    });
  });

  describe('handleTestEvent', () => {
    it('should emit RabbitMQ test.hello event and return success status', async () => {
      const appController = app.get<AppController>(AppController);
      const mockRmqClient = app.get('NOTIFICATION_SERVICE_RMQ');

      const payload = { message: 'Hello RMQ', correlationId: 'test-corr-456' };
      const response = await appController.handleTestEvent(payload);

      expect(response).toEqual({ status: 'event_published' });
      expect(mockRmqClient.emit).toHaveBeenCalledWith('test.hello', {
        message: 'Hello RMQ',
        correlationId: 'test-corr-456',
      });
    });

    it('should catch error when RMQ emit fails (Negative Test)', async () => {
      const appController = app.get<AppController>(AppController);
      const mockRmqClient = app.get('NOTIFICATION_SERVICE_RMQ');

      mockRmqClient.emit = jest.fn().mockImplementation(() => {
        throw new Error('RMQ Disconnected');
      });

      const payload = { message: 'Hello RMQ' };

      try {
        await appController.handleTestEvent(payload);
      } catch (err: any) {
        expect(err.message).toBe('RMQ Disconnected');
      }
    });
  });
});
