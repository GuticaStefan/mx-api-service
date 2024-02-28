import configuration from "config/configuration";
import { ErrorLoggerAsync, PassthroughAsync } from "@multiversx/sdk-nestjs-common";
import { Injectable } from "@nestjs/common";
import { CollectionTrait } from "src/endpoints/collections/entities/collection.trait";
import { ObjectLiteral, Repository } from "typeorm";
import { NftTraitSummaryDb } from "./entities/nft.trait.summary.db";
import { PersistenceInterface } from "./persistence.interface";
import { MetricsEvents } from "src/utils/metrics-events.constants";
import { LogPerformanceAsync } from "src/utils/log.performance.decorator";
import { KeybaseConfirmationDb } from "./entities/keybase.confirmation.db";
import { HotSwappableSettingDb } from "./entities/hot.swappable.setting";
import { InjectRepository } from "@nestjs/typeorm";

const isPassThrough = process.env.PERSISTENCE === 'passthrough' || configuration().database?.enabled === false;

@Injectable()
export class PersistenceService implements PersistenceInterface {
  constructor(
    @InjectRepository(NftTraitSummaryDb)
    private readonly nftTraitSummaryRepository: Repository<NftTraitSummaryDb>,
    @InjectRepository(KeybaseConfirmationDb)
    private readonly keybaseConfirmationRepository: Repository<KeybaseConfirmationDb>,
    @InjectRepository(HotSwappableSettingDb)
    private readonly settingsRepository: Repository<HotSwappableSettingDb>,
  ) { }

  private async save<T extends ObjectLiteral>(repository: Repository<T>, entity: T) {
    try {
      // @ts-ignore
      await repository.save(entity);
    } catch (error) {
      // @ts-ignore
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  @PassthroughAsync(isPassThrough, null)
  @LogPerformanceAsync(MetricsEvents.SetPersistenceDuration, 'getCollectionTraits')
  @ErrorLoggerAsync({ logArgs: true })
  async getCollectionTraits(collection: string): Promise<CollectionTrait[] | null> {
    const summary: NftTraitSummaryDb | null = await this.nftTraitSummaryRepository.findOne({ where: { identifier: collection } });
    if (!summary) {
      return null;
    }

    return summary.traitTypes;
  }

  @PassthroughAsync(isPassThrough, null)
  @LogPerformanceAsync(MetricsEvents.SetPersistenceDuration, 'getKeybaseConfirmationForIdentity')
  @ErrorLoggerAsync({ logArgs: true })
  async getKeybaseConfirmationForIdentity(identity: string): Promise<string[] | undefined> {
    const keybaseConfirmation: KeybaseConfirmationDb | null = await this.keybaseConfirmationRepository.findOne({ where: { identity } });
    if (!keybaseConfirmation) {
      return undefined;
    }

    return keybaseConfirmation.keys;
  }

  @PassthroughAsync(isPassThrough, null)
  @LogPerformanceAsync(MetricsEvents.SetPersistenceDuration, 'setKeybaseConfirmationForIdentity')
  @ErrorLoggerAsync({ logArgs: true })
  async setKeybaseConfirmationForIdentity(identity: string, keys: string[]): Promise<void> {
    let keybaseConfirmation = await this.keybaseConfirmationRepository.findOne({ where: { identity } });
    if (!keybaseConfirmation) {
      keybaseConfirmation = new KeybaseConfirmationDb();
    }

    keybaseConfirmation.identity = identity;
    keybaseConfirmation.keys = keys;

    await this.save(this.keybaseConfirmationRepository, keybaseConfirmation);
  }

  @PassthroughAsync(isPassThrough, null)
  @LogPerformanceAsync(MetricsEvents.SetPersistenceDuration, 'getSetting')
  @ErrorLoggerAsync({ logArgs: true })
  async getSetting<T>(name: string): Promise<T | undefined> {
    const setting = await this.settingsRepository.findOne({ where: { name } });
    if (!setting) {
      return undefined;
    }

    return JSON.parse(setting.value) as T;
  }

  @PassthroughAsync(isPassThrough, null)
  @LogPerformanceAsync(MetricsEvents.SetPersistenceDuration, 'setSetting')
  @ErrorLoggerAsync({ logArgs: true })
  async setSetting<T>(name: string, value: T): Promise<void> {
    let item = await this.settingsRepository.findOne({ where: { name } });
    if (!item) {
      item = new HotSwappableSettingDb();
    }

    item.name = name;
    item.value = value;

    await this.save(this.settingsRepository, item);
  }

  @PassthroughAsync(isPassThrough, null)
  @LogPerformanceAsync(MetricsEvents.SetPersistenceDuration, 'getAllSettings')
  @ErrorLoggerAsync({ logArgs: true })
  async getAllSettings(): Promise<{ name: string, value: any }[]> {
    const settings = await this.settingsRepository.find();
    return settings.map(setting => ({
      name: setting.name,
      value: setting.value,
    }));
  }
}
