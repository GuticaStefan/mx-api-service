import { Controller, Get, Param } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Tps } from "./entities/tps";
import { ParseEnumPipe } from "@multiversx/sdk-nestjs-common";
import { TpsFrequency } from "./entities/tps.frequency";
import { TpsService } from "./tps.service";
import { TpsInterval } from "./entities/tps.interval";
import { TopBlock } from "./entities/top.block";
import { DailyActivity } from "./entities/daily.activity";

@Controller('tps')
@ApiTags('tps')
export class TpsController {
  constructor(
    private readonly tpsService: TpsService,
  ) { }

  @Get('/latest')
  @ApiOperation({ summary: 'TPS live info', description: 'Return TPS live info' })
  @ApiOkResponse({ type: Tps })
  async getTpsLatest(): Promise<Tps> {
    return await this.tpsService.getTpsLatestFromES();
  }

  @Get('/latest/:frequency')
  @ApiOperation({ summary: 'TPS live info', description: 'Return TPS live info' })
  @ApiOkResponse({ type: Tps })
  async getTpsLatestByFrequency(
    @Param('frequency', new ParseEnumPipe(TpsFrequency)) _frequency: TpsFrequency,
  ): Promise<Tps> {
    return await this.tpsService.getTpsLatestFromES();
  }

  @Get('/max')
  @ApiOperation({ summary: 'TPS max info', description: 'Return TPS max info' })
  @ApiOkResponse({ type: Tps })
  async getTpsMax(): Promise<Tps> {
    return await this.tpsService.getTpsMaxFromES();
  }

  @Get('/max/:interval')
  @ApiOperation({ summary: 'TPS max info', description: 'Return TPS max info' })
  @ApiOkResponse({ type: Tps })
  async getTpsMaxByFrequency(
    @Param('interval', new ParseEnumPipe(TpsInterval)) _interval: TpsInterval,
  ): Promise<Tps> {
    return await this.tpsService.getTpsMaxFromES();
  }

  @Get('/count')
  @ApiOperation({ summary: 'Transaction count info', description: 'Return transaction count info' })
  @ApiOkResponse({ type: Number })
  async getTransactionCount(): Promise<number> {
    return await this.tpsService.getTransactionCountFromES();
  }

  @Get('/history')
  @ApiOperation({ summary: 'TPS history info', description: 'Return TPS history info' })
  @ApiOkResponse({ type: Tps, isArray: true })
  async getTpsHistory(): Promise<Tps[]> {
    return await this.tpsService.getTpsHistoryFromES();
  }

  @Get('/history/:interval')
  @ApiOperation({ summary: 'TPS history info', description: 'Return TPS history info' })
  @ApiOkResponse({ type: Tps, isArray: true })
  async getTpsHistoryByInterval(
    @Param('interval', new ParseEnumPipe(TpsInterval)) _interval: TpsInterval,
  ): Promise<Tps[]> {
    return await this.tpsService.getTpsHistoryFromES();
  }

  @Get('/top-blocks')
  @ApiOperation({ summary: 'Top blocks by number of transactions', description: 'Return top blocks by number of transactions' })
  @ApiOkResponse({ type: Tps, isArray: true })
  async getTopBlocks(
    @Param('interval', new ParseEnumPipe(TpsInterval)) _interval: TpsInterval,
  ): Promise<TopBlock[]> {
    return await this.tpsService.getTopBlocks();
  }

  @Get('/daily-activity')
  @ApiOperation({ summary: 'Daily activity', description: 'Return daily activity' })
  @ApiOkResponse({ type: DailyActivity, isArray: true })
  async getDailyActivity(): Promise<DailyActivity[]> {
    return await this.tpsService.getDailyActivity();
  }
}
