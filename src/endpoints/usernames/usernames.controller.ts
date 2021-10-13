import { Controller, Get, HttpException, HttpStatus, Param, Res } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { UsernameService } from "./username.service";

@Controller()
@ApiTags('usernames')
export class UsernameController {
  constructor(private readonly usernameService: UsernameService) {}

  @Get("/usernames/:username")
  @ApiResponse({
    status: 200,
    description: 'The details of a given account',
  })
  @ApiResponse({
    status: 404,
    description: 'Username not found'
  })
  async getUsernameDetails(@Param('username') username: string, @Res() res: any): Promise<any> {
    let address = await this.usernameService.getUsernameAddress(username);
    if (!address) {
      throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
    }

    return res.redirect(`/accounts/${address}`);
  }
}