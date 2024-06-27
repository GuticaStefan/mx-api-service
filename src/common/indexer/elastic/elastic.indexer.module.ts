import { forwardRef, Global, Module } from "@nestjs/common";
import { ApiConfigModule } from "src/common/api-config/api.config.module";
import { BlsModule } from "src/endpoints/bls/bls.module";
import { DynamicModuleUtils } from "src/utils/dynamic.module.utils";
import { ElasticIndexerHelper } from "./elastic.indexer.helper";
import { ElasticIndexerService } from "./elastic.indexer.service";
import { ApiElasticService } from "./api.elastic.service";

@Global()
@Module({
  imports: [
    ApiConfigModule,
    forwardRef(() => BlsModule),
    DynamicModuleUtils.getElasticModule(),
  ],
  providers: [
    ElasticIndexerService,
    ElasticIndexerHelper,
    ApiElasticService,
  ],
  exports: [
    ElasticIndexerService,
    ElasticIndexerHelper,
    ApiElasticService,
  ],
})
export class ElasticIndexerModule { }
