import { Injectable } from "@nestjs/common";
import { CacheInfo } from "src/utils/cache.info";
import { TokenAssets } from "src/common/assets/entities/token.assets";
import { AccountAssets } from "./entities/account.assets";
import { CacheService } from "@multiversx/sdk-nestjs-cache";
import { MexPair } from "src/endpoints/mex/entities/mex.pair";
import { Identity } from "src/endpoints/identities/entities/identity";
import { MexFarm } from "src/endpoints/mex/entities/mex.farm";
import { MexSettings } from "src/endpoints/mex/entities/mex.settings";
import { DnsContracts } from "src/utils/dns.contracts";
import { NftRank } from "./entities/nft.rank";
import { MexStakingProxy } from "src/endpoints/mex/entities/mex.staking.proxy";
import { Provider } from "src/endpoints/providers/entities/provider";
import { ApiService } from "@multiversx/sdk-nestjs-http";
import { ApiConfigService } from "../api-config/api.config.service";
import { KeybaseIdentity } from "../keybase/entities/keybase.identity";

@Injectable()
export class AssetsService {
  // private readonly logger = new OriginLogger(AssetsService.name);

  constructor(
    private readonly apiConfigService: ApiConfigService,
    private readonly apiService: ApiService,
    private readonly cachingService: CacheService,
  ) { }

  async getAllTokenAssets(): Promise<{ [key: string]: TokenAssets }> {
    return await this.cachingService.getOrSet(
      CacheInfo.TokenAssets.key,
      async () => await this.getAllTokenAssetsRaw(),
      CacheInfo.TokenAssets.ttl
    );
  }

  async getAllTokenAssetsRaw(): Promise<{ [key: string]: TokenAssets }> {
    const assetsCdnUrl = this.apiConfigService.getAssetsCdnUrl();
    const network = this.apiConfigService.getNetwork();

    const assetsRaw = await this.apiService.get(`${assetsCdnUrl}/${network}/tokens`)
      .then(res => res.data);

    const assets: { [key: string]: TokenAssets } = {};
    for (const asset of assetsRaw) {
      const { identifier, ...details } = asset;
      assets[identifier] = details;
    }

    return assets;
  }

  async getCollectionRanks(identifier: string): Promise<NftRank[] | undefined> {
    const allCollectionRanks = await this.getAllCollectionRanks();

    return allCollectionRanks[identifier];
  }

  async getAllCollectionRanks(): Promise<{ [key: string]: NftRank[] }> {
    return await this.cachingService.getOrSet(
      CacheInfo.CollectionRanks.key,
      async () => await this.getAllCollectionRanksRaw(),
      CacheInfo.CollectionRanks.ttl
    );
  }

  // eslint-disable-next-line require-await
  async getAllCollectionRanksRaw(): Promise<{ [key: string]: NftRank[] }> {
    // TODO get ranks
    // const allTokenAssets = await this.getAllTokenAssets();

    const result: { [key: string]: NftRank[] } = {};
    // const assetsPath = this.getTokenAssetsPath();

    // for (const identifier of Object.keys(allTokenAssets)) {
    //   const assets = allTokenAssets[identifier];
    //   if (assets.preferredRankAlgorithm === NftRankAlgorithm.custom) {
    //     const tokenAssetsPath = path.join(assetsPath, identifier);
    //     const ranks = this.readTokenRanks(tokenAssetsPath);
    //     if (ranks) {
    //       result[identifier] = ranks;
    //     }
    //   }
    // }

    return result;
  }

  async getAllAccountAssets(): Promise<{ [key: string]: AccountAssets }> {
    return await this.cachingService.getOrSet(
      CacheInfo.AccountAssets.key,
      async () => await this.getAllAccountAssetsRaw(),
      CacheInfo.AccountAssets.ttl
    );
  }

  async getAllAccountAssetsRaw(providers?: Provider[], identities?: Identity[], pairs?: MexPair[], farms?: MexFarm[], mexSettings?: MexSettings, stakingProxies?: MexStakingProxy[]): Promise<{ [key: string]: AccountAssets }> {
    const assetsCdnUrl = this.apiConfigService.getAssetsCdnUrl();
    const network = this.apiConfigService.getNetwork();

    const assets = await this.apiService.get(`${assetsCdnUrl}/${network}/accounts`)
      .then(res => res.data);

    const allAssets: { [key: string]: AccountAssets } = {};
    for (const asset of assets) {
      const { address, ...details } = asset;
      allAssets[address] = details;
    }

    if (providers && identities) {
      for (const provider of providers) {
        const identity = identities.find(x => x.identity === provider.identity);
        if (!identity) {
          continue;
        }

        allAssets[provider.provider] = new AccountAssets({
          name: `Staking: ${identity.name ?? ''}`,
          description: identity.description ?? '',
          iconPng: identity.avatar,
          tags: ['staking', 'provider'],
        });
      }
    }

    if (pairs) {
      for (const pair of pairs) {
        allAssets[pair.address] = new AccountAssets({
          name: `xExchange: ${pair.baseSymbol}/${pair.quoteSymbol} Liquidity Pool`,
          tags: ['xexchange', 'liquiditypool'],
        });
      }
    }

    if (farms) {
      for (const farm of farms) {
        allAssets[farm.address] = new AccountAssets({
          name: `xExchange: ${farm.name} Farm`,
          tags: ['xexchange', 'farm'],
        });
      }
    }

    if (mexSettings) {
      for (const [index, wrapContract] of mexSettings.wrapContracts.entries()) {
        allAssets[wrapContract] = new AccountAssets({
          name: `ESDT: WrappedEGLD Contract Shard ${index}`,
          tags: ['xexchange', 'wegld'],
        });
      }

      allAssets[mexSettings.lockedAssetContract] = new AccountAssets({
        name: `xExchange: Locked asset Contract`,
        tags: ['xexchange', 'lockedasset'],
      });

      allAssets[mexSettings.distributionContract] = new AccountAssets({
        name: `xExchange: Distribution Contract`,
        tags: ['xexchange', 'lockedasset'],
      });
    }

    if (stakingProxies) {
      for (const stakingProxy of stakingProxies) {
        allAssets[stakingProxy.address] = new AccountAssets({
          name: `xExchange: ${stakingProxy.dualYieldTokenName} Contract`,
          tags: ['xexchange', 'metastaking'],
        });
      }
    }

    for (const [index, address] of DnsContracts.addresses.entries()) {
      allAssets[address] = new AccountAssets({
        name: `Multiversx DNS: Contract ${index}`,
        tags: ['dns'],
        icon: 'multiversx',
      });
    }

    return allAssets;
  }

  async getTokenAssets(tokenIdentifier: string): Promise<TokenAssets | undefined> {
    // get the dictionary from the local cache
    const assets = await this.getAllTokenAssets();

    // if the tokenIdentifier key exists in the dictionary, return the associated value, else undefined
    return assets[tokenIdentifier];
  }

  async getAllIdentitiesRaw(): Promise<{ [key: string]: KeybaseIdentity }> {
    const assetsCdnUrl = this.apiConfigService.getAssetsCdnUrl();
    const network = this.apiConfigService.getNetwork();

    const assets = await this.apiService.get(`${assetsCdnUrl}/${network}/identities`)
      .then(res => res.data);

    const allAssets: { [key: string]: KeybaseIdentity } = {};
    for (const asset of assets) {
      const { identity, ...details } = asset;
      allAssets[identity] = details;
    }

    return allAssets;
  }
}
