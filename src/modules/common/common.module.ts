import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConcreteEventProcessorFactory } from '../../common/factories/event-processor.factory';
import { EventSubject } from '../../common/observers/event-observer.pattern';
import * as entities from '../../common/entities';

@Module({
  imports: [TypeOrmModule.forFeature(Object.values(entities))],
  providers: [
    {
      provide: ConcreteEventProcessorFactory,
      useFactory: () => {
        return new ConcreteEventProcessorFactory([]);
      },
    },
    EventSubject,
  ],
  exports: [ConcreteEventProcessorFactory, EventSubject, TypeOrmModule],
})
export class CommonModule {} 