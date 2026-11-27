import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  type LocaleCode,
  normalizeEmail,
  normalizePakistanPhoneE164
} from "@saudavo/contracts";
import { DomainException } from "../../common/errors/domain.exception";
import { PrismaService } from "../../common/prisma/prisma.service";

export const USER_WITH_AUTH_INCLUDE = {
  customerProfile: true,
  userRoles: {
    include: {
      role: true
    }
  }
} satisfies Prisma.UserInclude;

export type UserWithAuth = Prisma.UserGetPayload<{
  include: typeof USER_WITH_AUTH_INCLUDE;
}>;

export interface CreateCustomerUserInput {
  email?: string;
  phoneE164?: string;
  passwordHash: string;
  displayName: string;
  preferredLocale: LocaleCode;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  resolveIdentifier(identifier: string): { email?: string; phoneE164?: string } {
    const trimmed = identifier.trim();
    if (trimmed.includes("@")) {
      return { email: normalizeEmail(trimmed) };
    }
    const phoneE164 = normalizePakistanPhoneE164(trimmed);
    if (phoneE164) {
      return { phoneE164 };
    }
    return {};
  }

  async findByIdentifierWithAuth(identifier: string): Promise<UserWithAuth | null> {
    const resolved = this.resolveIdentifier(identifier);
    if (resolved.email) {
      return this.prisma.user.findFirst({
        where: { email: resolved.email, deletedAt: null },
        include: USER_WITH_AUTH_INCLUDE
      });
    }
    if (resolved.phoneE164) {
      return this.prisma.user.findFirst({
        where: { phoneE164: resolved.phoneE164, deletedAt: null },
        include: USER_WITH_AUTH_INCLUDE
      });
    }
    return null;
  }

  async findByIdWithAuth(userId: string): Promise<UserWithAuth | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: USER_WITH_AUTH_INCLUDE
    });
  }

  async createCustomerUser(input: CreateCustomerUserInput): Promise<UserWithAuth> {
    if (!input.email && !input.phoneE164) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Either email or phone number is required."
      );
    }

    const orFilters: Prisma.UserWhereInput[] = [];
    if (input.email) {
      orFilters.push({ email: input.email });
    }
    if (input.phoneE164) {
      orFilters.push({ phoneE164: input.phoneE164 });
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: orFilters }
    });
    if (existing) {
      throw new DomainException(
        "DUPLICATE_IDENTITY",
        HttpStatus.CONFLICT,
        "An account with the provided email or phone number already exists."
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const customerRole = await tx.role.upsert({
          where: { code: "CUSTOMER" },
          update: {},
          create: {
            code: "CUSTOMER",
            description: "Default marketplace buyer account"
          }
        });

        const created = await tx.user.create({
          data: {
            email: input.email ?? null,
            phoneE164: input.phoneE164 ?? null,
            passwordHash: input.passwordHash,
            displayName: input.displayName,
            status: "ACTIVE",
            customerProfile: {
              create: {
                preferredLocale: input.preferredLocale
              }
            },
            userRoles: {
              create: {
                roleId: customerRole.id
              }
            }
          },
          include: USER_WITH_AUTH_INCLUDE
        });

        return created;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new DomainException(
          "DUPLICATE_IDENTITY",
          HttpStatus.CONFLICT,
          "An account with the provided email or phone number already exists."
        );
      }
      throw error;
    }
  }
}
