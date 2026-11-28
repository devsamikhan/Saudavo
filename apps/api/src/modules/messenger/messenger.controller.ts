import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req
} from "@nestjs/common";
import {
  type AcceptCustomOfferRequest,
  AcceptCustomOfferRequestSchema,
  type ChatMessageDto,
  type ConversationSummaryDto,
  type OrderCreatedSummary,
  type ReportConversationRequest,
  ReportConversationRequestSchema,
  type ReportDto,
  type SendChatMessageRequest,
  SendChatMessageRequestSchema,
  type SendCustomOfferRequest,
  SendCustomOfferRequestSchema,
  type StartConversationRequest,
  StartConversationRequestSchema
} from "@saudavo/contracts";
import type { AuthContext } from "../../common/auth/auth.types";
import { CurrentUser } from "../../common/auth/decorators";
import { DomainException } from "../../common/errors/domain.exception";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { type AppRequest, getRequestId } from "../../common/request-context";
import { MessengerService } from "./messenger.service";

@Controller("messenger")
export class MessengerController {
  constructor(private readonly messengerService: MessengerService) {}

  @Post("conversations")
  async startConversation(
    @CurrentUser() auth: AuthContext | undefined,
    @Body(new ZodValidationPipe(StartConversationRequestSchema))
    body: StartConversationRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ConversationSummaryDto; meta: { requestId: string } }> {
    return this.messengerService.startConversation(
      this.requireUserId(auth),
      body,
      getRequestId(req)
    );
  }

  @Get("conversations")
  async listConversations(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: ConversationSummaryDto[]; meta: { requestId: string } }> {
    return this.messengerService.listConversations(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Get("unread-count")
  async getUnreadCount(
    @CurrentUser() auth: AuthContext | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: { unreadCount: number }; meta: { requestId: string } }> {
    return this.messengerService.getUnreadCount(
      this.requireUserId(auth),
      getRequestId(req)
    );
  }

  @Get("conversations/:id/messages")
  async listMessages(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) conversationId: string,
    @Req() req: AppRequest
  ): Promise<{ data: ChatMessageDto[]; meta: { requestId: string } }> {
    return this.messengerService.listMessages(
      this.requireUserId(auth),
      conversationId,
      getRequestId(req)
    );
  }

  @Post("conversations/:id/messages")
  async sendMessage(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) conversationId: string,
    @Body(new ZodValidationPipe(SendChatMessageRequestSchema))
    body: SendChatMessageRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ChatMessageDto; meta: { requestId: string } }> {
    return this.messengerService.sendMessage(
      this.requireUserId(auth),
      conversationId,
      body,
      getRequestId(req)
    );
  }

  @Post("conversations/:id/offers")
  async sendOffer(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) conversationId: string,
    @Body(new ZodValidationPipe(SendCustomOfferRequestSchema))
    body: SendCustomOfferRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ChatMessageDto; meta: { requestId: string } }> {
    return this.messengerService.sendCustomOffer(
      this.requireUserId(auth),
      conversationId,
      body,
      getRequestId(req)
    );
  }

  @Post("conversations/:id/offers/:messageId/accept")
  async acceptOffer(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) conversationId: string,
    @Param("messageId", new ParseUUIDPipe()) messageId: string,
    @Body(new ZodValidationPipe(AcceptCustomOfferRequestSchema))
    body: AcceptCustomOfferRequest,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: OrderCreatedSummary; meta: { requestId: string } }> {
    return this.messengerService.acceptCustomOffer(
      this.requireUserId(auth),
      conversationId,
      messageId,
      body,
      idempotencyKey,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post("conversations/:id/offers/:messageId/decline")
  async declineOffer(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) conversationId: string,
    @Param("messageId", new ParseUUIDPipe()) messageId: string,
    @Req() req: AppRequest
  ): Promise<{ data: ChatMessageDto; meta: { requestId: string } }> {
    return this.messengerService.declineCustomOffer(
      this.requireUserId(auth),
      conversationId,
      messageId,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post("conversations/:id/block")
  async blockConversation(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) conversationId: string,
    @Body() body: { reason?: string } | undefined,
    @Req() req: AppRequest
  ): Promise<{ data: ConversationSummaryDto; meta: { requestId: string } }> {
    return this.messengerService.setConversationBlocked(
      this.requireUserId(auth),
      conversationId,
      true,
      body?.reason,
      getRequestId(req)
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post("conversations/:id/unblock")
  async unblockConversation(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) conversationId: string,
    @Req() req: AppRequest
  ): Promise<{ data: ConversationSummaryDto; meta: { requestId: string } }> {
    return this.messengerService.setConversationBlocked(
      this.requireUserId(auth),
      conversationId,
      false,
      undefined,
      getRequestId(req)
    );
  }

  @Post("conversations/:id/report")
  async reportConversation(
    @CurrentUser() auth: AuthContext | undefined,
    @Param("id", new ParseUUIDPipe()) conversationId: string,
    @Body(new ZodValidationPipe(ReportConversationRequestSchema))
    body: ReportConversationRequest,
    @Req() req: AppRequest
  ): Promise<{ data: ReportDto; meta: { requestId: string } }> {
    return this.messengerService.reportConversation(
      this.requireUserId(auth),
      conversationId,
      body,
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
