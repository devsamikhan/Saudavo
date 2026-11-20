import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req
} from "@nestjs/common";
import {
  AddressDto,
  CreateAddressRequest,
  CreateAddressRequestSchema,
  CustomerProfileDto,
  UpdateAddressRequest,
  UpdateAddressRequestSchema,
  UpdateCustomerProfileRequest,
  UpdateCustomerProfileRequestSchema
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { CustomerService } from "./customer.service";

@Controller("customer")
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get("profile")
  async getProfile(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: CustomerProfileDto; meta: { requestId: string } }> {
    return this.customerService.getProfile(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Patch("profile")
  async updateProfile(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(UpdateCustomerProfileRequestSchema))
    body: UpdateCustomerProfileRequest,
    @Req() req: AppRequest
  ): Promise<{ data: CustomerProfileDto; meta: { requestId: string } }> {
    return this.customerService.updateProfile(
      this.requireUserId(auth),
      body,
      getRequestId(req)
    );
  }

  @Get("addresses")
  async listAddresses(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: AddressDto[]; meta: { requestId: string } }> {
    return this.customerService.listAddresses(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Post("addresses")
  async createAddress(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(CreateAddressRequestSchema))
    body: CreateAddressRequest,
    @Req() req: AppRequest
  ): Promise<{ data: AddressDto; meta: { requestId: string } }> {
    return this.customerService.createAddress(
      this.requireUserId(auth),
      body,
      getRequestId(req)
    );
  }

  @Patch("addresses/:id")
  async updateAddress(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) addressId: string,
    @Body(new ZodValidationPipe(UpdateAddressRequestSchema))
    body: UpdateAddressRequest,
    @Req() req: AppRequest
  ): Promise<{ data: AddressDto; meta: { requestId: string } }> {
    return this.customerService.updateAddress(
      this.requireUserId(auth),
      addressId,
      body,
      getRequestId(req)
    );
  }

  @Delete("addresses/:id")
  async deleteAddress(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) addressId: string,
    @Req() req: AppRequest
  ): Promise<{ data: { deleted: true; id: string }; meta: { requestId: string } }> {
    return this.customerService.deleteAddress(
      this.requireUserId(auth),
      addressId,
      getRequestId(req)
    );
  }

  private requireUserId(auth: AuthContext | undefined): string {
    if (!auth) {
      throw new DomainException(
        "UNAUTHORIZED",
        HttpStatus.UNAUTHORIZED,
        "Authentication session is required."
      );
    }
    return auth.userId;
  }
}
