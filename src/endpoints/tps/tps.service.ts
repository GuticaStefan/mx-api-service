import { Injectable } from "@nestjs/common";
import { TpsFrequency } from "./entities/tps.frequency";
import { TpsUtils } from "src/utils/tps.utils";
import { CacheService } from "@multiversx/sdk-nestjs-cache";
import { CacheInfo } from "src/utils/cache.info";
import { Tps } from "./entities/tps";
import { TpsInterval } from "./entities/tps.interval";
import { ProtocolService } from "src/common/protocol/protocol.service";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import { ElasticQuery, ElasticService, ElasticSortOrder } from "@multiversx/sdk-nestjs-elastic";
import { Constants } from "@multiversx/sdk-nestjs-common";

@Injectable()
export class TpsService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly protocolService: ProtocolService,
    private readonly apiConfigService: ApiConfigService,
    private readonly elasticService: ElasticService,
  ) { }

  async getTpsLatestFromES(): Promise<Tps> {
    return await this.cacheService.getOrSet<Tps>(
      'tps_latestTps',
      async () => await this.getTpsLatestFromESRaw(),
      Constants.oneSecond() * 5,
    );
  }

  async getTpsLatestFromESRaw(): Promise<Tps> {
    const query = ElasticQuery.create()
      .withSort([{ name: 'timestamp', order: ElasticSortOrder.descending }])
      .withPagination({ from: 0, size: 10 })
      .withFields(['txCount', 'timestamp']);

    const blocks = await this.elasticService.getList('blocks', 'hash', query);
    if (blocks.length === 0) {
      return new Tps({ timestamp: 0, tps: 0 });
    }

    const transactions = blocks.map(x => x.txCount);
    const maxTps = Math.max(...transactions);

    console.log({ transactions, maxTps });

    return new Tps({
      timestamp: blocks[0].timestamp,
      tps: maxTps,
    });
  }

  async getTpsLatest(frequency: TpsFrequency): Promise<Tps> {
    const frequencySeconds = TpsUtils.getFrequencyByEnum(frequency);
    const timestamp = TpsUtils.getTimestampByFrequency(new Date().getTimeInSeconds() - frequencySeconds, frequencySeconds);

    const transactionCount = (await this.cacheService.getRemote<number>(CacheInfo.TpsByTimestampAndFrequency(timestamp, frequencySeconds).key)) ?? 0;

    const tps = transactionCount / frequencySeconds;

    return new Tps({ timestamp, tps });
  }

  async getTpsMaxFromES(): Promise<Tps> {
    return await this.cacheService.getOrSet<Tps>(
      'tps_maxTps',
      async () => await this.getTpsMaxFromESRaw(),
      Constants.oneSecond() * 10,
    );
  }

  async getTpsMaxFromESRaw(): Promise<Tps> {
    const query = ElasticQuery.create()
      .withSort([{ name: 'timestamp', order: ElasticSortOrder.descending }])
      .withPagination({ from: 0, size: 10000 })
      .withFields(['txCount', 'timestamp']);

    const blocks = await this.elasticService.getList('blocks', 'hash', query);
    if (blocks.length === 0) {
      return new Tps({ timestamp: 0, tps: 0 });
    }

    let maxTps = 0;
    let maxTpsTimestamp = 0;

    for (const block of blocks) {
      const tps = block.txCount;
      const timestamp = block.timestamp;

      if (tps > maxTps) {
        maxTps = tps;
        maxTpsTimestamp = timestamp;
      }
    }

    return new Tps({ timestamp: maxTpsTimestamp, tps: maxTps });
  }

  async getTpsMax(interval: TpsInterval): Promise<Tps> {
    const result = await this.cacheService.getRemote<Tps>(CacheInfo.TpsMaxByInterval(interval).key);
    if (!result) {
      return new Tps({ timestamp: 0, tps: 0 });
    }

    return result;
  }


  async getTpsHistoryFromES(): Promise<Tps[]> {
    return await this.cacheService.getOrSet<Tps[]>(
      'tps_tpsHistory',
      async () => await this.getTpsHistoryFromESRaw(),
      Constants.oneSecond() * 10,
    );
  }

  async getTpsHistoryFromESRaw(): Promise<Tps[]> {
    const query = ElasticQuery.create()
      .withSort([{ name: 'timestamp', order: ElasticSortOrder.descending }])
      .withPagination({ from: 0, size: 3600 })
      .withFields(['txCount', 'timestamp']);

    const blocks = await this.elasticService.getList('blocks', 'hash', query);
    if (blocks.length === 0) {
      return [];
    }

    const blocksDictionary = blocks.toRecord(x => x.timestamp, x => x.txCount);

    const result: Tps[] = [];

    const lastTimestamp = blocks[0].timestamp;
    for (let i = lastTimestamp - 3599; i <= lastTimestamp; i++) {
      const tps = blocksDictionary[i] ?? 0;
      result.push(new Tps({ timestamp: i, tps }));
    }

    const resultAggregated: Tps[] = [];

    // aggregate by max of interval of 10 seconds
    for (let i = 0; i < result.length; i += 10) {
      const tps = result[i];
      const timestamp = tps.timestamp;
      const tpsValues = result.filter(x => x.timestamp >= timestamp && x.timestamp <= timestamp + 9);

      const tpsMax = Math.max(...tpsValues.map(x => x.tps));
      resultAggregated.push(new Tps({ timestamp, tps: tpsMax }));
    }

    return resultAggregated;
  }

  async getTpsHistory(interval: TpsInterval): Promise<Tps[]> {
    return await this.cacheService.getOrSet<Tps[]>(
      CacheInfo.TpsHistoryByInterval(interval).key,
      async () => await this.getTpsHistoryRaw(interval),
      CacheInfo.TpsHistoryByInterval(interval).ttl
    );
  }

  async getTpsHistoryRaw(interval: TpsInterval): Promise<Tps[]> {
    const frequencySeconds = TpsUtils.getFrequencyByInterval(interval);
    const endTimestamp = TpsUtils.getTimestampByFrequency(new Date().getTimeInSeconds(), frequencySeconds);
    const startTimestamp = endTimestamp - TpsUtils.getIntervalByEnum(interval);

    const timestamps = [];
    for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += frequencySeconds) {
      timestamps.push(timestamp);
    }

    const keys = timestamps.map(timestamp => CacheInfo.TpsByTimestampAndFrequency(timestamp, frequencySeconds).key);

    const transactionResults = await this.cacheService.getManyRemote<number>(keys);

    return timestamps.zip(transactionResults, (timestamp, transactions) => new Tps({ timestamp, tps: (transactions ?? 0) / frequencySeconds }));
  }

  async getTransactionCount(): Promise<number> {
    const totalShards = await this.protocolService.getShardCount();
    const shardIds = [...Array.from({ length: totalShards }, (_, i) => i), this.apiConfigService.getMetaChainShardId()];

    let totalTransactions = 0;

    for (const shardId of shardIds) {
      totalTransactions += await this.cacheService.getRemote<number>(CacheInfo.TransactionCountByShard(shardId).key) ?? 0;
    }

    return totalTransactions;
  }

  async getTransactionCountFromES(): Promise<number> {
    return await this.cacheService.getOrSet<number>(
      'tps_transactionCount',
      async () => await this.getTransactionCountFromESRaw(),
      Constants.oneSecond() * 5,
    );
  }

  async getTransactionCountFromESRaw(): Promise<number> {
    const query = ElasticQuery.create();

    return await this.elasticService.getCount('operations', query);
  }
}
