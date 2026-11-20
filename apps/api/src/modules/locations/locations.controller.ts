import { Controller, Get, Req } from "@nestjs/common";
import type { DistrictsResponse } from "@saudavo/contracts";
import { Public } from "../../common/auth/decorators";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { LocationsService } from "./locations.service";

@Controller("locations")
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Public()
  @Get("districts")
  async listDistricts(@Req() req: AppRequest): Promise<DistrictsResponse> {
    return this.locationsService.listActiveDistricts(getRequestId(req));
  }
}
