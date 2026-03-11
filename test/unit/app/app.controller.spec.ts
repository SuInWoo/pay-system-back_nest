import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '../../../src/app.controller';
import { AppService } from '../../../src/app.service';

describe('AppController (unit)', () => {
  let controller: AppController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: { getHello: jest.fn(() => 'Hello World!') },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('GET / (getHello) should return hello message', () => {
    expect(controller.getHello()).toBe('Hello World!');
  });
});

