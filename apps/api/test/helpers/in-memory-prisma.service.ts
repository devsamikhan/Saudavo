import { randomUUID } from "node:crypto";

export interface FakeUserRecord {
  id: string;
  email: string | null;
  phoneE164: string | null;
  passwordHash: string;
  displayName: string;
  status: string;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  mfaSecretEncrypted: string | null;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FakeRoleRecord {
  id: string;
  code: string;
  description: string;
}

export interface FakeUserRoleRecord {
  id: string;
  userId: string;
  roleId: string;
  assignedById: string | null;
  createdAt: Date;
}

export interface FakeCustomerProfileRecord {
  id: string;
  userId: string;
  preferredLocale: string;
  defaultDistrictId: string | null;
  defaultAreaZoneId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  csrfTokenHash: string;
  mfaVerifiedAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface FakeAuthTokenRecord {
  id: string;
  userId: string;
  tokenType: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface FakeOutboxRecord {
  id: string;
  eventType: string;
  aggregateType: string | null;
  aggregateId: string | null;
  payloadJson: unknown;
  status: string;
  attempts: number;
  nextAttemptAt: Date;
  processedAt: Date | null;
  createdAt: Date;
}

export interface FakeAuditLogRecord {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  beforeJson: unknown;
  afterJson: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface FakeAreaZoneRecord {
  id: string;
  districtId: string;
  nameEn: string;
  nameUr: string;
  slug: string;
  zoneType: string;
  isActive: boolean;
}

export interface FakeDistrictRecord {
  id: string;
  code: string;
  nameEn: string;
  nameUr: string;
  slug: string;
  province: string;
  countryCode: string;
  isActive: boolean;
  areaZones: FakeAreaZoneRecord[];
}

export interface FakeSellerProfileRecord {
  id: string;
  userId: string;
  sellerType: string;
  verificationStatus: string;
  rejectionReason: string | null;
  moderationNotes: string | null;
  verifiedById: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeStoreRecord {
  id: string;
  sellerProfileId: string;
  districtId: string;
  slug: string;
  displayName: string;
  description: string | null;
  logoAssetId: string | null;
  bannerAssetId: string | null;
  showPublicPhone: boolean;
  publicContactPhone: string | null;
  showPublicAddress: boolean;
  publicBusinessAddress: string | null;
  defaultDeliveryFeePaisa: bigint;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FakeStoreServiceAreaRecord {
  id: string;
  storeId: string;
  areaZoneId: string;
  deliveryFeeOverridePaisa: bigint | null;
  pickupSupported: boolean;
  deliverySupported: boolean;
}

export interface FakeCategoryRecord {
  id: string;
  parentId: string | null;
  applicableTo: string;
  slug: string;
  nameEn: string;
  nameUr: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeProductRecord {
  id: string;
  storeId: string;
  categoryId: string;
  slug: string;
  title: string;
  description: string;
  basePricePaisa: bigint;
  currency: string;
  stockQuantity: number;
  hasVariants: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  status: string;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FakeProductVariantRecord {
  id: string;
  productId: string;
  sku: string | null;
  title: string;
  optionValuesJson: unknown;
  pricePaisa: bigint;
  stockQuantity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FakeServiceListingRecord {
  id: string;
  storeId: string;
  categoryId: string;
  slug: string;
  title: string;
  description: string;
  serviceMode: string;
  requirementsPrompt: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FakeServicePackageRecord {
  id: string;
  serviceListingId: string;
  tierName: string;
  description: string;
  pricePaisa: bigint;
  currency: string;
  deliveryEstimateDays: number;
  maxRevisions: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FakeAddressRecord {
  id: string;
  userId: string;
  districtId: string;
  areaZoneId: string | null;
  label: string | null;
  recipientName: string;
  recipientPhone: string;
  streetAddress: string;
  landmark: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface FakeCartRecord {
  id: string;
  customerId: string;
  storeId: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeCartItemRecord {
  id: string;
  cartId: string;
  productId: string;
  productVariantId: string | null;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeOrderRecord {
  id: string;
  orderNumber: string;
  customerId: string;
  storeId: string;
  districtId: string;
  orderType: string;
  status: string;
  paymentMethod: string;
  codCollectionStatus: string;
  currency: string;
  subtotalPaisa: bigint;
  deliveryFeePaisa: bigint;
  discountPaisa: bigint;
  totalPaisa: bigint;
  commissionRuleId: string;
  commissionRateBps: number;
  commissionAmountPaisa: bigint;
  sellerNetEntitlementPaisa: bigint;
  customerNote: string | null;
  cancelledReason: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeOrderItemRecord {
  id: string;
  orderId: string;
  productId: string;
  productVariantId: string | null;
  titleSnapshot: string;
  variantTitleSnapshot: string | null;
  skuSnapshot: string | null;
  unitPricePaisa: bigint;
  quantity: number;
  lineTotalPaisa: bigint;
  currency: string;
}

export interface FakeServiceOrderDetailsRecord {
  id: string;
  orderId: string;
  serviceListingId: string;
  servicePackageId: string;
  serviceModeSnapshot: string;
  serviceTitleSnapshot: string;
  packageNameSnapshot: string;
  packagePricePaisa: bigint;
  deliveryEstimateDaysSnapshot: number;
  maxRevisionsSnapshot: number;
  revisionsUsed: number;
  areaZoneId: string | null;
  serviceAddressSnapshotJson: unknown;
  customerRequirements: string;
  deliverySummary: string | null;
  deliverySubmittedAt: Date | null;
  customerAcceptedAt: Date | null;
}

export interface FakeDeliveryRecord {
  id: string;
  orderId: string;
  fulfilmentMode: string;
  deliveryStatus: string;
  areaZoneId: string | null;
  shippingAddressSnapshotJson: unknown;
  pickupInstructions: string | null;
  trackingNote: string | null;
  dispatchedAt: Date | null;
  deliveredAt: Date | null;
  failedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeOrderStatusHistoryRecord {
  id: string;
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  actorRole: string;
  reason: string | null;
  metadataJson: unknown;
  createdAt: Date;
}

export interface FakeOrderMessageRecord {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: string;
  body: string;
  createdAt: Date;
}

export interface FakePaymentRecord {
  id: string;
  orderId: string;
  providerCode: string;
  paymentMethod: string;
  status: string;
  amountPaisa: bigint;
  currency: string;
  manualPaymentMethodDesc: string | null;
  confirmationNote: string | null;
  providerReference: string | null;
  confirmedById: string | null;
  collectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakePaymentEventRecord {
  id: string;
  paymentId: string;
  eventType: string;
  idempotencyKey: string;
  rawPayloadJson: unknown;
  createdAt: Date;
}

export interface FakeCommissionRuleRecord {
  id: string;
  version: number;
  name: string;
  scopeType: string;
  categoryId: string | null;
  orderType: string | null;
  rateBps: number;
  includeDeliveryFee: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
  createdById: string;
  createdAt: Date;
}

export interface FakeCommissionLedgerRecord {
  id: string;
  orderId: string;
  storeId: string;
  commissionRuleId: string;
  entryType: string;
  grossOrderPaisa: bigint;
  commissionableBasePaisa: bigint;
  rateBps: number;
  commissionPaisa: bigint;
  sellerNetEntitlementPaisa: bigint;
  currency: string;
  referenceEntryId: string | null;
  reason: string;
  createdById: string | null;
  createdAt: Date;
}

export interface FakeSettlementRecord {
  id: string;
  storeId: string;
  direction: string;
  settlementMethod: string;
  amountPaisa: bigint;
  currency: string;
  externalReference: string | null;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  verifiedById: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeIdempotencyKeyRecord {
  id: string;
  userId: string;
  endpoint: string;
  keyValue: string;
  requestHash: string;
  responseStatus: number | null;
  responseBodyJson: unknown;
  expiresAt: Date;
  createdAt: Date;
}

export interface FakeMediaAssetRecord {
  id: string;
  ownerUserId: string;
  storeId: string | null;
  objectKey: string;
  mimeType: string;
  sizeBytes: number;
  exifStripped: boolean;
  status: string;
  createdAt: Date;
}

export interface FakeReviewRecord {
  id: string;
  orderId: string;
  orderItemId: string | null;
  storeId: string;
  customerId: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeReportRecord {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reasonCode: string;
  details: string;
  status: string;
  resolvedById: string | null;
  resolutionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeDisputeRecord {
  id: string;
  orderId: string;
  openedById: string;
  disputeType: string;
  description: string;
  status: string;
  resolutionOutcome: string | null;
  resolvedById: string | null;
  resolutionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeRefundRecord {
  id: string;
  orderId: string;
  paymentId: string;
  amountPaisa: bigint;
  reason: string;
  status: string;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Typed in-memory PrismaService test double for offline NestJS + Supertest integration tests.
 */
export class InMemoryPrismaService {
  readonly users: FakeUserRecord[] = [];
  readonly roles: FakeRoleRecord[] = [];
  readonly userRoles: FakeUserRoleRecord[] = [];
  readonly customerProfiles: FakeCustomerProfileRecord[] = [];
  readonly userSessions: FakeSessionRecord[] = [];
  readonly authTokens: FakeAuthTokenRecord[] = [];
  readonly outboxEvents: FakeOutboxRecord[] = [];
  readonly adminAuditLogs: FakeAuditLogRecord[] = [];
  readonly districts: FakeDistrictRecord[] = [];
  readonly sellerProfiles: FakeSellerProfileRecord[] = [];
  readonly stores: FakeStoreRecord[] = [];
  readonly storeServiceAreas: FakeStoreServiceAreaRecord[] = [];
  readonly categories: FakeCategoryRecord[] = [];
  readonly products: FakeProductRecord[] = [];
  readonly productVariants: FakeProductVariantRecord[] = [];
  readonly serviceListings: FakeServiceListingRecord[] = [];
  readonly servicePackages: FakeServicePackageRecord[] = [];
  readonly addresses: FakeAddressRecord[] = [];
  readonly carts: FakeCartRecord[] = [];
  readonly cartItems: FakeCartItemRecord[] = [];
  readonly orders: FakeOrderRecord[] = [];
  readonly orderItems: FakeOrderItemRecord[] = [];
  readonly serviceOrderDetailsList: FakeServiceOrderDetailsRecord[] = [];
  readonly deliveries: FakeDeliveryRecord[] = [];
  readonly orderStatusHistories: FakeOrderStatusHistoryRecord[] = [];
  readonly orderMessages: FakeOrderMessageRecord[] = [];
  readonly payments: FakePaymentRecord[] = [];
  readonly paymentEvents: FakePaymentEventRecord[] = [];
  readonly commissionRules: FakeCommissionRuleRecord[] = [];
  readonly commissionLedgers: FakeCommissionLedgerRecord[] = [];
  readonly sellerSettlementRecords: FakeSettlementRecord[] = [];
  readonly idempotencyKeys: FakeIdempotencyKeyRecord[] = [];
  readonly mediaAssets: FakeMediaAssetRecord[] = [];
  readonly reviews: FakeReviewRecord[] = [];
  readonly reports: FakeReportRecord[] = [];
  readonly disputes: FakeDisputeRecord[] = [];
  readonly refunds: FakeRefundRecord[] = [];

  seedInitialCommissionRule(createdById = randomUUID()): void {
    if (this.commissionRules.length > 0) {
      return;
    }
    this.commissionRules.push({
      id: randomUUID(),
      version: 1,
      name: "Mianwali Closed Beta 0% Promotional Rate (PQ-01)",
      scopeType: "GLOBAL",
      categoryId: null,
      orderType: null,
      rateBps: 0,
      includeDeliveryFee: false,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
      isActive: true,
      createdById,
      createdAt: new Date()
    });
  }

  seedDefaultLocations(): void {
    if (this.districts.length > 0) {
      return;
    }
    const districtId = randomUUID();
    this.districts.push({
      id: districtId,
      code: "MIANWALI",
      nameEn: "Mianwali",
      nameUr: "میانوالی",
      slug: "mianwali",
      province: "Punjab",
      countryCode: "PK",
      isActive: true,
      areaZones: [
        {
          id: randomUUID(),
          districtId,
          nameEn: "Isakhel",
          nameUr: "عیسیٰ خیل",
          slug: "isakhel-tehsil",
          zoneType: "TEHSIL",
          isActive: true
        },
        {
          id: randomUUID(),
          districtId,
          nameEn: "Mianwali",
          nameUr: "میانوالی",
          slug: "mianwali-tehsil",
          zoneType: "TEHSIL",
          isActive: true
        },
        {
          id: randomUUID(),
          districtId,
          nameEn: "Piplan",
          nameUr: "پپلاں",
          slug: "piplan-tehsil",
          zoneType: "TEHSIL",
          isActive: true
        }
      ]
    });
  }

  seedDefaultCategories(): void {
    if (this.categories.length > 0) {
      return;
    }
    const now = new Date();
    this.categories.push(
      {
        id: randomUUID(),
        parentId: null,
        applicableTo: "PRODUCT",
        slug: "handicrafts-embroidery",
        nameEn: "Handicrafts & Embroidery",
        nameUr: "دستکاری اور کڑھائی",
        sortOrder: 10,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: randomUUID(),
        parentId: null,
        applicableTo: "SERVICE",
        slug: "design-digital-services",
        nameEn: "Design & Digital Services",
        nameUr: "ڈیزائن اور ڈیجیٹل سروسز",
        sortOrder: 40,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: randomUUID(),
        parentId: null,
        applicableTo: "BOTH",
        slug: "tailoring-custom-work",
        nameEn: "Tailoring & Custom Work",
        nameUr: "سلائی اور کسٹم کام",
        sortOrder: 60,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    );
  }

  grantRole(userId: string, roleCode: string): void {
    let role = this.roles.find((r) => r.code === roleCode);
    if (!role) {
      role = { id: randomUUID(), code: roleCode, description: roleCode };
      this.roles.push(role);
    }
    const exists = this.userRoles.some(
      (ur) => ur.userId === userId && ur.roleId === role.id
    );
    if (!exists) {
      this.userRoles.push({
        id: randomUUID(),
        userId,
        roleId: role.id,
        assignedById: null,
        createdAt: new Date()
      });
    }
  }

  setMfaSecret(userId: string, encryptedSecret: string): void {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.mfaEnabled = true;
      user.mfaSecretEncrypted = encryptedSecret;
    }
  }

  setUserStatus(userId: string, status: string): void {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.status = status;
    }
  }

  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    return fn(this);
  }

  readonly role = {
    upsert: async (args: {
      where: { code: string };
      update: Record<string, unknown>;
      create: { code: string; description: string };
    }): Promise<FakeRoleRecord> => {
      const existing = this.roles.find((r) => r.code === args.where.code);
      if (existing) {
        return existing;
      }
      const created: FakeRoleRecord = {
        id: randomUUID(),
        code: args.create.code,
        description: args.create.description
      };
      this.roles.push(created);
      return created;
    }
  };

  readonly user = {
    findFirst: async (args: {
      where: {
        id?: string;
        email?: string;
        phoneE164?: string;
        deletedAt?: Date | null;
        OR?: Array<{ email?: string; phoneE164?: string }>;
      };
      include?: unknown;
    }) => {
      const match = this.users.find((u) => {
        if (args.where.deletedAt === null && u.deletedAt !== null) {
          return false;
        }
        if (args.where.id !== undefined && u.id !== args.where.id) {
          return false;
        }
        if (args.where.email !== undefined && u.email !== args.where.email) {
          return false;
        }
        if (
          args.where.phoneE164 !== undefined &&
          u.phoneE164 !== args.where.phoneE164
        ) {
          return false;
        }
        if (args.where.OR) {
          const anyOr = args.where.OR.some(
            (clause) =>
              (clause.email !== undefined && u.email === clause.email) ||
              (clause.phoneE164 !== undefined && u.phoneE164 === clause.phoneE164)
          );
          if (!anyOr) {
            return false;
          }
        }
        return true;
      });
      return match ? this.hydrateUser(match) : null;
    },

    create: async (args: {
      data: {
        email: string | null;
        phoneE164: string | null;
        passwordHash: string;
        displayName: string;
        status: string;
        customerProfile: { create: { preferredLocale: string } };
        userRoles: { create: { roleId: string } };
      };
    }) => {
      const now = new Date();
      const created: FakeUserRecord = {
        id: randomUUID(),
        email: args.data.email,
        phoneE164: args.data.phoneE164,
        passwordHash: args.data.passwordHash,
        displayName: args.data.displayName,
        status: args.data.status,
        emailVerifiedAt: null,
        phoneVerifiedAt: null,
        mfaSecretEncrypted: null,
        mfaEnabled: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };
      this.users.push(created);

      this.customerProfiles.push({
        id: randomUUID(),
        userId: created.id,
        preferredLocale: args.data.customerProfile.create.preferredLocale,
        defaultDistrictId: null,
        defaultAreaZoneId: null,
        createdAt: now,
        updatedAt: now
      });

      this.userRoles.push({
        id: randomUUID(),
        userId: created.id,
        roleId: args.data.userRoles.create.roleId,
        assignedById: null,
        createdAt: now
      });

      return this.hydrateUser(created);
    },

    update: async (args: {
      where: { id: string };
      data: { passwordHash?: string };
    }) => {
      const target = this.users.find((u) => u.id === args.where.id);
      if (!target) {
        throw new Error(`User not found: ${args.where.id}`);
      }
      if (args.data.passwordHash !== undefined) {
        target.passwordHash = args.data.passwordHash;
      }
      target.updatedAt = new Date();
      return this.hydrateUser(target);
    }
  };

  readonly userSession = {
    findUnique: async (args: { where: { tokenHash: string } }) => {
      const session = this.userSessions.find(
        (s) => s.tokenHash === args.where.tokenHash
      );
      if (!session) {
        return null;
      }
      const user = this.users.find((u) => u.id === session.userId);
      if (!user) {
        return null;
      }
      return {
        ...session,
        user: this.hydrateUser(user)
      };
    },

    create: async (args: {
      data: {
        userId: string;
        tokenHash: string;
        csrfTokenHash: string;
        ipAddress: string | null;
        userAgent: string | null;
        expiresAt: Date;
      };
    }): Promise<FakeSessionRecord> => {
      const created: FakeSessionRecord = {
        id: randomUUID(),
        userId: args.data.userId,
        tokenHash: args.data.tokenHash,
        csrfTokenHash: args.data.csrfTokenHash,
        mfaVerifiedAt: null,
        ipAddress: args.data.ipAddress,
        userAgent: args.data.userAgent,
        expiresAt: args.data.expiresAt,
        revokedAt: null,
        createdAt: new Date()
      };
      this.userSessions.push(created);
      return created;
    },

    update: async (args: {
      where: { id: string };
      data: { mfaVerifiedAt?: Date };
    }): Promise<FakeSessionRecord> => {
      const session = this.userSessions.find((s) => s.id === args.where.id);
      if (!session) {
        throw new Error(`Session not found: ${args.where.id}`);
      }
      if (args.data.mfaVerifiedAt !== undefined) {
        session.mfaVerifiedAt = args.data.mfaVerifiedAt;
      }
      return session;
    },

    updateMany: async (args: {
      where: { id?: string; userId?: string; revokedAt?: Date | null };
      data: { revokedAt: Date };
    }): Promise<{ count: number }> => {
      let count = 0;
      for (const session of this.userSessions) {
        if (args.where.id !== undefined && session.id !== args.where.id) {
          continue;
        }
        if (args.where.userId !== undefined && session.userId !== args.where.userId) {
          continue;
        }
        if (args.where.revokedAt === null && session.revokedAt !== null) {
          continue;
        }
        session.revokedAt = args.data.revokedAt;
        count += 1;
      }
      return { count };
    }
  };

  readonly authToken = {
    create: async (args: {
      data: {
        userId: string;
        tokenType: string;
        tokenHash: string;
        expiresAt: Date;
      };
    }): Promise<FakeAuthTokenRecord> => {
      const record: FakeAuthTokenRecord = {
        id: randomUUID(),
        userId: args.data.userId,
        tokenType: args.data.tokenType,
        tokenHash: args.data.tokenHash,
        expiresAt: args.data.expiresAt,
        usedAt: null,
        createdAt: new Date()
      };
      this.authTokens.push(record);
      return record;
    },

    findUnique: async (args: {
      where: { tokenHash: string };
    }): Promise<FakeAuthTokenRecord | null> => {
      return (
        this.authTokens.find((t) => t.tokenHash === args.where.tokenHash) ?? null
      );
    },

    update: async (args: {
      where: { id: string };
      data: { usedAt: Date };
    }): Promise<FakeAuthTokenRecord> => {
      const token = this.authTokens.find((t) => t.id === args.where.id);
      if (!token) {
        throw new Error(`AuthToken not found: ${args.where.id}`);
      }
      token.usedAt = args.data.usedAt;
      return token;
    }
  };

  readonly outboxEvent = {
    create: async (args: {
      data: {
        eventType: string;
        aggregateType: string | null;
        aggregateId: string | null;
        payloadJson: unknown;
        status: string;
        nextAttemptAt?: Date;
      };
    }): Promise<FakeOutboxRecord> => {
      const created: FakeOutboxRecord = {
        id: randomUUID(),
        eventType: args.data.eventType,
        aggregateType: args.data.aggregateType,
        aggregateId: args.data.aggregateId,
        payloadJson: args.data.payloadJson,
        status: args.data.status,
        attempts: 0,
        nextAttemptAt: args.data.nextAttemptAt ?? new Date(),
        processedAt: null,
        createdAt: new Date()
      };
      this.outboxEvents.push(created);
      return created;
    }
  };

  readonly adminAuditLog = {
    create: async (args: {
      data: {
        actorId: string;
        actorRole: string;
        action: string;
        targetType: string;
        targetId: string;
        reason: string | null;
        beforeJson?: unknown;
        afterJson?: unknown;
        ipAddress: string | null;
        userAgent: string | null;
      };
    }): Promise<FakeAuditLogRecord> => {
      const created: FakeAuditLogRecord = {
        id: randomUUID(),
        actorId: args.data.actorId,
        actorRole: args.data.actorRole,
        action: args.data.action,
        targetType: args.data.targetType,
        targetId: args.data.targetId,
        reason: args.data.reason,
        beforeJson: args.data.beforeJson ?? null,
        afterJson: args.data.afterJson ?? null,
        ipAddress: args.data.ipAddress,
        userAgent: args.data.userAgent,
        createdAt: new Date()
      };
      this.adminAuditLogs.push(created);
      return created;
    },

    findMany: async (args: { take: number }): Promise<FakeAuditLogRecord[]> => {
      return [...this.adminAuditLogs]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, args.take);
    }
  };

  readonly district = {
    findMany: async (): Promise<FakeDistrictRecord[]> => {
      return this.districts
        .filter((d) => d.isActive)
        .map((d) => ({
          ...d,
          areaZones: d.areaZones
            .filter((z) => z.isActive)
            .sort((a, b) => a.nameEn.localeCompare(b.nameEn))
        }))
        .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
    },

    findFirst: async (args: {
      where: { id?: string; isActive?: boolean };
    }): Promise<FakeDistrictRecord | null> => {
      return (
        this.districts.find(
          (d) =>
            (args.where.id === undefined || d.id === args.where.id) &&
            (args.where.isActive === undefined || d.isActive === args.where.isActive)
        ) ?? null
      );
    }
  };

  readonly areaZone = {
    findMany: async (args: {
      where: { id?: { in: string[] }; districtId?: string; isActive?: boolean };
    }): Promise<FakeAreaZoneRecord[]> => {
      const allZones = this.districts.flatMap((d) => d.areaZones);
      return allZones.filter(
        (z) =>
          (args.where.id?.in === undefined || args.where.id.in.includes(z.id)) &&
          (args.where.districtId === undefined ||
            z.districtId === args.where.districtId) &&
          (args.where.isActive === undefined || z.isActive === args.where.isActive)
      );
    },

    findFirst: async (args: {
      where: { id?: string; districtId?: string; isActive?: boolean };
    }): Promise<FakeAreaZoneRecord | null> => {
      const allZones = this.districts.flatMap((d) => d.areaZones);
      return (
        allZones.find(
          (z) =>
            (args.where.id === undefined || z.id === args.where.id) &&
            (args.where.districtId === undefined ||
              z.districtId === args.where.districtId) &&
            (args.where.isActive === undefined || z.isActive === args.where.isActive)
        ) ?? null
      );
    }
  };

  readonly userRole = {
    findUnique: async (args: {
      where: { userId_roleId: { userId: string; roleId: string } };
    }): Promise<FakeUserRoleRecord | null> => {
      return (
        this.userRoles.find(
          (ur) =>
            ur.userId === args.where.userId_roleId.userId &&
            ur.roleId === args.where.userId_roleId.roleId
        ) ?? null
      );
    },

    create: async (args: {
      data: { userId: string; roleId: string };
    }): Promise<FakeUserRoleRecord> => {
      const created: FakeUserRoleRecord = {
        id: randomUUID(),
        userId: args.data.userId,
        roleId: args.data.roleId,
        assignedById: null,
        createdAt: new Date()
      };
      this.userRoles.push(created);
      return created;
    }
  };

  readonly sellerProfile = {
    findUnique: async (args: {
      where: { id?: string; userId?: string };
      include?: unknown;
    }) => {
      const profile =
        this.sellerProfiles.find(
          (sp) =>
            (args.where.id === undefined || sp.id === args.where.id) &&
            (args.where.userId === undefined || sp.userId === args.where.userId)
        ) ?? null;
      if (!profile) {
        return null;
      }
      return {
        ...profile,
        stores: this.stores
          .filter((s) => s.sellerProfileId === profile.id && s.deletedAt === null)
          .slice(0, 1)
      };
    },

    findMany: async (args: { where?: { verificationStatus?: string } }) => {
      return this.sellerProfiles
        .filter(
          (sp) =>
            args.where?.verificationStatus === undefined ||
            sp.verificationStatus === args.where.verificationStatus
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((sp) => ({
          ...sp,
          stores: this.stores
            .filter((s) => s.sellerProfileId === sp.id && s.deletedAt === null)
            .slice(0, 1)
        }));
    },

    create: async (args: {
      data: { userId: string; sellerType: string; verificationStatus: string };
    }): Promise<FakeSellerProfileRecord> => {
      const now = new Date();
      const created: FakeSellerProfileRecord = {
        id: randomUUID(),
        userId: args.data.userId,
        sellerType: args.data.sellerType,
        verificationStatus: args.data.verificationStatus,
        rejectionReason: null,
        moderationNotes: null,
        verifiedById: null,
        verifiedAt: null,
        createdAt: now,
        updatedAt: now
      };
      this.sellerProfiles.push(created);
      return created;
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeSellerProfileRecord>;
    }): Promise<FakeSellerProfileRecord> => {
      const target = this.sellerProfiles.find((sp) => sp.id === args.where.id);
      if (!target) {
        throw new Error(`SellerProfile not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return target;
    }
  };

  readonly storeServiceArea = {
    deleteMany: async (args: { where: { storeId: string } }) => {
      for (let i = this.storeServiceAreas.length - 1; i >= 0; i -= 1) {
        if (this.storeServiceAreas[i]?.storeId === args.where.storeId) {
          this.storeServiceAreas.splice(i, 1);
        }
      }
      return { count: 1 };
    },

    createMany: async (args: {
      data: Array<{
        storeId: string;
        areaZoneId: string;
        deliveryFeeOverridePaisa: bigint | null;
        pickupSupported: boolean;
        deliverySupported: boolean;
      }>;
    }) => {
      for (const row of args.data) {
        this.storeServiceAreas.push({
          id: randomUUID(),
          ...row
        });
      }
      return { count: args.data.length };
    }
  };

  readonly store = {
    findUnique: async (args: { where: { slug?: string; id?: string } }) => {
      const found = this.stores.find(
        (s) =>
          (args.where.id === undefined || s.id === args.where.id) &&
          (args.where.slug === undefined || s.slug === args.where.slug)
      );
      return found ? this.hydrateStore(found) : null;
    },

    findFirst: async (args: {
      where: {
        id?: string;
        sellerProfileId?: string;
        slug?: string;
        status?: string;
        deletedAt?: Date | null;
        sellerProfile?: { verificationStatus?: string };
      };
    }) => {
      const found = this.stores.find((s) => {
        if (args.where.deletedAt === null && s.deletedAt !== null) return false;
        if (args.where.id !== undefined && s.id !== args.where.id) return false;
        if (
          args.where.sellerProfileId !== undefined &&
          s.sellerProfileId !== args.where.sellerProfileId
        ) {
          return false;
        }
        if (args.where.slug !== undefined && s.slug !== args.where.slug) return false;
        if (args.where.status !== undefined && s.status !== args.where.status) {
          return false;
        }
        if (args.where.sellerProfile?.verificationStatus !== undefined) {
          const sp = this.sellerProfiles.find((p) => p.id === s.sellerProfileId);
          if (sp?.verificationStatus !== args.where.sellerProfile.verificationStatus) {
            return false;
          }
        }
        return true;
      });
      return found ? this.hydrateStore(found) : null;
    },

    create: async (args: {
      data: {
        sellerProfileId: string;
        districtId: string;
        slug: string;
        displayName: string;
        description: string | null;
        showPublicPhone: boolean;
        publicContactPhone: string | null;
        showPublicAddress: boolean;
        publicBusinessAddress: string | null;
        defaultDeliveryFeePaisa: bigint;
        currency: string;
        status: string;
        serviceAreas: {
          create: Array<{
            areaZoneId: string;
            pickupSupported: boolean;
            deliverySupported: boolean;
          }>;
        };
      };
    }) => {
      const now = new Date();
      const created: FakeStoreRecord = {
        id: randomUUID(),
        sellerProfileId: args.data.sellerProfileId,
        districtId: args.data.districtId,
        slug: args.data.slug,
        displayName: args.data.displayName,
        description: args.data.description,
        logoAssetId: null,
        bannerAssetId: null,
        showPublicPhone: args.data.showPublicPhone,
        publicContactPhone: args.data.publicContactPhone,
        showPublicAddress: args.data.showPublicAddress,
        publicBusinessAddress: args.data.publicBusinessAddress,
        defaultDeliveryFeePaisa: args.data.defaultDeliveryFeePaisa,
        currency: args.data.currency,
        status: args.data.status,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };
      this.stores.push(created);

      for (const sa of args.data.serviceAreas.create) {
        this.storeServiceAreas.push({
          id: randomUUID(),
          storeId: created.id,
          areaZoneId: sa.areaZoneId,
          deliveryFeeOverridePaisa: null,
          pickupSupported: sa.pickupSupported,
          deliverySupported: sa.deliverySupported
        });
      }

      return this.hydrateStore(created);
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeStoreRecord>;
    }) => {
      const target = this.stores.find((s) => s.id === args.where.id);
      if (!target) {
        throw new Error(`Store not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return this.hydrateStore(target);
    }
  };

  readonly category = {
    findMany: async (args: {
      where?: { isActive?: boolean; applicableTo?: { in: string[] } };
    }): Promise<FakeCategoryRecord[]> => {
      return this.categories
        .filter(
          (c) =>
            (args.where?.isActive === undefined ||
              c.isActive === args.where.isActive) &&
            (args.where?.applicableTo?.in === undefined ||
              args.where.applicableTo.in.includes(c.applicableTo))
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },

    findFirst: async (args: {
      where: { id?: string; isActive?: boolean };
    }): Promise<FakeCategoryRecord | null> => {
      return (
        this.categories.find(
          (c) =>
            (args.where.id === undefined || c.id === args.where.id) &&
            (args.where.isActive === undefined || c.isActive === args.where.isActive)
        ) ?? null
      );
    }
  };

  readonly productVariant = {
    updateMany: async (args: {
      where: {
        id?: string;
        productId?: string;
        deletedAt?: Date | null;
        isActive?: boolean;
        stockQuantity?: { gte: number };
      };
      data: {
        deletedAt?: Date;
        isActive?: boolean;
        stockQuantity?: { increment?: number; decrement?: number };
      };
    }) => {
      let count = 0;
      for (const v of this.productVariants) {
        if (args.where.id !== undefined && v.id !== args.where.id) continue;
        if (args.where.productId !== undefined && v.productId !== args.where.productId) {
          continue;
        }
        if (args.where.deletedAt === null && v.deletedAt !== null) continue;
        if (args.where.isActive !== undefined && v.isActive !== args.where.isActive) {
          continue;
        }
        if (
          args.where.stockQuantity?.gte !== undefined &&
          v.stockQuantity < args.where.stockQuantity.gte
        ) {
          continue;
        }
        if (args.data.deletedAt !== undefined) v.deletedAt = args.data.deletedAt;
        if (args.data.isActive !== undefined) v.isActive = args.data.isActive;
        if (args.data.stockQuantity?.decrement !== undefined) {
          v.stockQuantity -= args.data.stockQuantity.decrement;
        }
        if (args.data.stockQuantity?.increment !== undefined) {
          v.stockQuantity += args.data.stockQuantity.increment;
        }
        v.updatedAt = new Date();
        count += 1;
      }
      return { count };
    },

    createMany: async (args: {
      data: Array<{
        productId: string;
        sku: string | null;
        title: string;
        optionValuesJson: unknown;
        pricePaisa: bigint;
        stockQuantity: number;
        isActive: boolean;
      }>;
    }) => {
      const now = new Date();
      for (const item of args.data) {
        this.productVariants.push({
          id: randomUUID(),
          ...item,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }
      return { count: args.data.length };
    }
  };

  readonly product = {
    findFirst: async (args: {
      where: {
        id?: string;
        storeId?: string;
        slug?: string;
        status?: string;
        deletedAt?: Date | null;
        store?: {
          status?: string;
          deletedAt?: Date | null;
          sellerProfile?: { verificationStatus?: string };
        };
      };
    }) => {
      const match = this.products.find((p) => {
        if (args.where.deletedAt === null && p.deletedAt !== null) return false;
        if (args.where.id !== undefined && p.id !== args.where.id) return false;
        if (args.where.storeId !== undefined && p.storeId !== args.where.storeId) {
          return false;
        }
        if (args.where.slug !== undefined && p.slug !== args.where.slug) return false;
        if (args.where.status !== undefined && p.status !== args.where.status) {
          return false;
        }
        if (args.where.store && !this.matchesStoreFilter(p.storeId, args.where.store)) {
          return false;
        }
        return true;
      });
      return match ? this.hydrateProduct(match) : null;
    },

    findMany: async (args: {
      where: {
        storeId?: string;
        status?: string;
        categoryId?: string;
        deletedAt?: Date | null;
        store?: {
          status?: string;
          deletedAt?: Date | null;
          districtId?: string;
          serviceAreas?: { some: { areaZoneId: string } };
          sellerProfile?: { verificationStatus?: string };
        };
      };
    }) => {
      return this.products
        .filter((p) => {
          if (args.where.deletedAt === null && p.deletedAt !== null) return false;
          if (args.where.storeId !== undefined && p.storeId !== args.where.storeId) {
            return false;
          }
          if (args.where.status !== undefined && p.status !== args.where.status) {
            return false;
          }
          if (
            args.where.categoryId !== undefined &&
            p.categoryId !== args.where.categoryId
          ) {
            return false;
          }
          if (args.where.store && !this.matchesStoreFilter(p.storeId, args.where.store)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((p) => this.hydrateProduct(p));
    },

    create: async (args: {
      data: {
        storeId: string;
        categoryId: string;
        slug: string;
        title: string;
        description: string;
        basePricePaisa: bigint;
        currency: string;
        stockQuantity: number;
        hasVariants: boolean;
        deliveryEnabled: boolean;
        pickupEnabled: boolean;
        status: string;
        variants?: {
          create: Array<{
            sku: string | null;
            title: string;
            optionValuesJson: unknown;
            pricePaisa: bigint;
            stockQuantity: number;
            isActive: boolean;
          }>;
        };
      };
    }) => {
      const now = new Date();
      const created: FakeProductRecord = {
        id: randomUUID(),
        storeId: args.data.storeId,
        categoryId: args.data.categoryId,
        slug: args.data.slug,
        title: args.data.title,
        description: args.data.description,
        basePricePaisa: args.data.basePricePaisa,
        currency: args.data.currency,
        stockQuantity: args.data.stockQuantity,
        hasVariants: args.data.hasVariants,
        deliveryEnabled: args.data.deliveryEnabled,
        pickupEnabled: args.data.pickupEnabled,
        status: args.data.status,
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };
      this.products.push(created);

      for (const v of args.data.variants?.create ?? []) {
        this.productVariants.push({
          id: randomUUID(),
          productId: created.id,
          sku: v.sku,
          title: v.title,
          optionValuesJson: v.optionValuesJson,
          pricePaisa: v.pricePaisa,
          stockQuantity: v.stockQuantity,
          isActive: v.isActive,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }

      return this.hydrateProduct(created);
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeProductRecord>;
    }) => {
      const target = this.products.find((p) => p.id === args.where.id);
      if (!target) {
        throw new Error(`Product not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return this.hydrateProduct(target);
    },

    updateMany: async (args: {
      where: {
        id?: string;
        deletedAt?: Date | null;
        status?: string;
        stockQuantity?: { gte: number };
      };
      data: {
        stockQuantity?: { increment?: number; decrement?: number };
      };
    }) => {
      let count = 0;
      for (const p of this.products) {
        if (args.where.id !== undefined && p.id !== args.where.id) continue;
        if (args.where.deletedAt === null && p.deletedAt !== null) continue;
        if (args.where.status !== undefined && p.status !== args.where.status) {
          continue;
        }
        if (
          args.where.stockQuantity?.gte !== undefined &&
          p.stockQuantity < args.where.stockQuantity.gte
        ) {
          continue;
        }
        if (args.data.stockQuantity?.decrement !== undefined) {
          p.stockQuantity -= args.data.stockQuantity.decrement;
        }
        if (args.data.stockQuantity?.increment !== undefined) {
          p.stockQuantity += args.data.stockQuantity.increment;
        }
        p.updatedAt = new Date();
        count += 1;
      }
      return { count };
    }
  };

  readonly servicePackage = {
    updateMany: async (args: {
      where: { serviceListingId: string; deletedAt?: Date | null };
      data: { deletedAt?: Date; isActive?: boolean };
    }) => {
      let count = 0;
      for (const pkg of this.servicePackages) {
        if (pkg.serviceListingId !== args.where.serviceListingId) continue;
        if (args.where.deletedAt === null && pkg.deletedAt !== null) continue;
        Object.assign(pkg, args.data, { updatedAt: new Date() });
        count += 1;
      }
      return { count };
    },

    createMany: async (args: {
      data: Array<{
        serviceListingId: string;
        tierName: string;
        description: string;
        pricePaisa: bigint;
        currency: string;
        deliveryEstimateDays: number;
        maxRevisions: number;
        isActive: boolean;
      }>;
    }) => {
      const now = new Date();
      for (const item of args.data) {
        this.servicePackages.push({
          id: randomUUID(),
          ...item,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }
      return { count: args.data.length };
    }
  };

  readonly serviceListing = {
    findFirst: async (args: {
      where: {
        id?: string;
        storeId?: string;
        slug?: string;
        status?: string;
        deletedAt?: Date | null;
        store?: {
          status?: string;
          deletedAt?: Date | null;
          sellerProfile?: { verificationStatus?: string };
        };
      };
    }) => {
      const match = this.serviceListings.find((s) => {
        if (args.where.deletedAt === null && s.deletedAt !== null) return false;
        if (args.where.id !== undefined && s.id !== args.where.id) return false;
        if (args.where.storeId !== undefined && s.storeId !== args.where.storeId) {
          return false;
        }
        if (args.where.slug !== undefined && s.slug !== args.where.slug) return false;
        if (args.where.status !== undefined && s.status !== args.where.status) {
          return false;
        }
        if (args.where.store && !this.matchesStoreFilter(s.storeId, args.where.store)) {
          return false;
        }
        return true;
      });
      return match ? this.hydrateService(match) : null;
    },

    findMany: async (args: {
      where: {
        storeId?: string;
        status?: string;
        categoryId?: string;
        deletedAt?: Date | null;
        store?: {
          status?: string;
          deletedAt?: Date | null;
          districtId?: string;
          serviceAreas?: { some: { areaZoneId: string } };
          sellerProfile?: { verificationStatus?: string };
        };
      };
    }) => {
      return this.serviceListings
        .filter((s) => {
          if (args.where.deletedAt === null && s.deletedAt !== null) return false;
          if (args.where.storeId !== undefined && s.storeId !== args.where.storeId) {
            return false;
          }
          if (args.where.status !== undefined && s.status !== args.where.status) {
            return false;
          }
          if (
            args.where.categoryId !== undefined &&
            s.categoryId !== args.where.categoryId
          ) {
            return false;
          }
          if (args.where.store && !this.matchesStoreFilter(s.storeId, args.where.store)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((s) => this.hydrateService(s));
    },

    create: async (args: {
      data: {
        storeId: string;
        categoryId: string;
        slug: string;
        title: string;
        description: string;
        serviceMode: string;
        requirementsPrompt: string | null;
        status: string;
        packages: {
          create: Array<{
            tierName: string;
            description: string;
            pricePaisa: bigint;
            currency: string;
            deliveryEstimateDays: number;
            maxRevisions: number;
            isActive: boolean;
          }>;
        };
      };
    }) => {
      const now = new Date();
      const created: FakeServiceListingRecord = {
        id: randomUUID(),
        storeId: args.data.storeId,
        categoryId: args.data.categoryId,
        slug: args.data.slug,
        title: args.data.title,
        description: args.data.description,
        serviceMode: args.data.serviceMode,
        requirementsPrompt: args.data.requirementsPrompt,
        status: args.data.status,
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };
      this.serviceListings.push(created);

      for (const pkg of args.data.packages.create) {
        this.servicePackages.push({
          id: randomUUID(),
          serviceListingId: created.id,
          ...pkg,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        });
      }

      return this.hydrateService(created);
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeServiceListingRecord>;
    }) => {
      const target = this.serviceListings.find((s) => s.id === args.where.id);
      if (!target) {
        throw new Error(`ServiceListing not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return this.hydrateService(target);
    }
  };

  private matchesStoreFilter(
    storeId: string,
    filter: {
      status?: string;
      deletedAt?: Date | null;
      districtId?: string;
      serviceAreas?: { some: { areaZoneId: string } };
      sellerProfile?: { verificationStatus?: string };
    }
  ): boolean {
    const store = this.stores.find((s) => s.id === storeId);
    if (!store) return false;
    if (filter.deletedAt === null && store.deletedAt !== null) return false;
    if (filter.status !== undefined && store.status !== filter.status) return false;
    if (filter.districtId !== undefined && store.districtId !== filter.districtId) {
      return false;
    }
    if (filter.sellerProfile?.verificationStatus !== undefined) {
      const sp = this.sellerProfiles.find((p) => p.id === store.sellerProfileId);
      if (sp?.verificationStatus !== filter.sellerProfile.verificationStatus) {
        return false;
      }
    }
    if (filter.serviceAreas?.some.areaZoneId !== undefined) {
      const targetZone = filter.serviceAreas.some.areaZoneId;
      const hasZone = this.storeServiceAreas.some(
        (sa) => sa.storeId === store.id && sa.areaZoneId === targetZone
      );
      if (!hasZone) return false;
    }
    return true;
  }

  private hydrateStore(store: FakeStoreRecord) {
    const district = this.districts.find((d) => d.id === store.districtId);
    if (!district) {
      throw new Error(`Missing district ${store.districtId}`);
    }
    const sellerProfile =
      this.sellerProfiles.find((sp) => sp.id === store.sellerProfileId) ?? null;
    const allZones = this.districts.flatMap((d) => d.areaZones);
    const serviceAreas = this.storeServiceAreas
      .filter((sa) => sa.storeId === store.id)
      .map((sa) => {
        const areaZone = allZones.find((z) => z.id === sa.areaZoneId);
        if (!areaZone) {
          throw new Error(`Missing areaZone ${sa.areaZoneId}`);
        }
        return {
          ...sa,
          areaZone
        };
      });

    return {
      ...store,
      district,
      sellerProfile,
      serviceAreas
    };
  }

  readonly customerProfile = {
    upsert: async (args: {
      where: { userId: string };
      update: Record<string, unknown>;
      create: { userId: string; preferredLocale: string };
    }): Promise<FakeCustomerProfileRecord> => {
      const existing = this.customerProfiles.find(
        (cp) => cp.userId === args.where.userId
      );
      if (existing) {
        return existing;
      }
      const now = new Date();
      const created: FakeCustomerProfileRecord = {
        id: randomUUID(),
        userId: args.create.userId,
        preferredLocale: args.create.preferredLocale,
        defaultDistrictId: null,
        defaultAreaZoneId: null,
        createdAt: now,
        updatedAt: now
      };
      this.customerProfiles.push(created);
      return created;
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeCustomerProfileRecord>;
    }): Promise<FakeCustomerProfileRecord> => {
      const target = this.customerProfiles.find((cp) => cp.id === args.where.id);
      if (!target) {
        throw new Error(`CustomerProfile not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return target;
    }
  };

  readonly address = {
    findMany: async (args: {
      where: { userId: string; deletedAt?: Date | null };
    }) => {
      return this.addresses
        .filter(
          (a) =>
            a.userId === args.where.userId &&
            (args.where.deletedAt === null ? a.deletedAt === null : true)
        )
        .map((a) => this.hydrateAddress(a));
    },

    findFirst: async (args: {
      where: { id?: string; userId?: string; deletedAt?: Date | null };
    }) => {
      const found = this.addresses.find(
        (a) =>
          (args.where.id === undefined || a.id === args.where.id) &&
          (args.where.userId === undefined || a.userId === args.where.userId) &&
          (args.where.deletedAt === null ? a.deletedAt === null : true)
      );
      return found ? this.hydrateAddress(found) : null;
    },

    create: async (args: {
      data: {
        userId: string;
        districtId: string;
        areaZoneId: string | null;
        label: string | null;
        recipientName: string;
        recipientPhone: string;
        streetAddress: string;
        landmark: string | null;
        isDefault: boolean;
      };
    }) => {
      const now = new Date();
      const created: FakeAddressRecord = {
        id: randomUUID(),
        ...args.data,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      };
      this.addresses.push(created);
      return this.hydrateAddress(created);
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeAddressRecord>;
    }) => {
      const target = this.addresses.find((a) => a.id === args.where.id);
      if (!target) {
        throw new Error(`Address not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return this.hydrateAddress(target);
    },

    updateMany: async (args: {
      where: { userId?: string; isDefault?: boolean; deletedAt?: Date | null };
      data: Partial<FakeAddressRecord>;
    }) => {
      let count = 0;
      for (const a of this.addresses) {
        if (args.where.userId !== undefined && a.userId !== args.where.userId) {
          continue;
        }
        if (
          args.where.isDefault !== undefined &&
          a.isDefault !== args.where.isDefault
        ) {
          continue;
        }
        if (args.where.deletedAt === null && a.deletedAt !== null) continue;
        Object.assign(a, args.data, { updatedAt: new Date() });
        count += 1;
      }
      return { count };
    }
  };

  readonly cart = {
    findMany: async (args: { where: { customerId: string } }) => {
      return this.carts
        .filter((c) => c.customerId === args.where.customerId)
        .map((c) => this.hydrateCart(c));
    },

    findFirst: async (args: {
      where: { id?: string; customerId?: string; storeId?: string };
    }) => {
      const found = this.carts.find(
        (c) =>
          (args.where.id === undefined || c.id === args.where.id) &&
          (args.where.customerId === undefined ||
            c.customerId === args.where.customerId) &&
          (args.where.storeId === undefined || c.storeId === args.where.storeId)
      );
      return found ? this.hydrateCart(found) : null;
    },

    upsert: async (args: {
      where: { customerId_storeId: { customerId: string; storeId: string } };
      update: Record<string, unknown>;
      create: { customerId: string; storeId: string; currency: string };
    }): Promise<FakeCartRecord> => {
      const existing = this.carts.find(
        (c) =>
          c.customerId === args.where.customerId_storeId.customerId &&
          c.storeId === args.where.customerId_storeId.storeId
      );
      if (existing) {
        return existing;
      }
      const now = new Date();
      const created: FakeCartRecord = {
        id: randomUUID(),
        ...args.create,
        createdAt: now,
        updatedAt: now
      };
      this.carts.push(created);
      return created;
    },

    delete: async (args: { where: { id: string } }) => {
      const idx = this.carts.findIndex((c) => c.id === args.where.id);
      if (idx >= 0) {
        const [removed] = this.carts.splice(idx, 1);
        return removed;
      }
      return null;
    }
  };

  readonly cartItem = {
    findFirst: async (args: {
      where: {
        id?: string;
        cartId?: string;
        productId?: string;
        productVariantId?: string | null;
      };
    }) => {
      const found = this.cartItems.find(
        (ci) =>
          (args.where.id === undefined || ci.id === args.where.id) &&
          (args.where.cartId === undefined || ci.cartId === args.where.cartId) &&
          (args.where.productId === undefined ||
            ci.productId === args.where.productId) &&
          (args.where.productVariantId === undefined ||
            ci.productVariantId === args.where.productVariantId)
      );
      if (!found) {
        return null;
      }
      const cart = this.carts.find((c) => c.id === found.cartId)!;
      const product = this.products.find((p) => p.id === found.productId)!;
      const productVariant = found.productVariantId
        ? (this.productVariants.find((v) => v.id === found.productVariantId) ?? null)
        : null;
      return { ...found, cart, product, productVariant };
    },

    create: async (args: {
      data: {
        cartId: string;
        productId: string;
        productVariantId: string | null;
        quantity: number;
      };
    }): Promise<FakeCartItemRecord> => {
      const now = new Date();
      const created: FakeCartItemRecord = {
        id: randomUUID(),
        ...args.data,
        createdAt: now,
        updatedAt: now
      };
      this.cartItems.push(created);
      return created;
    },

    update: async (args: {
      where: { id: string };
      data: { quantity: number };
    }): Promise<FakeCartItemRecord> => {
      const target = this.cartItems.find((ci) => ci.id === args.where.id);
      if (!target) {
        throw new Error(`CartItem not found: ${args.where.id}`);
      }
      target.quantity = args.data.quantity;
      target.updatedAt = new Date();
      return target;
    },

    delete: async (args: { where: { id: string } }) => {
      const idx = this.cartItems.findIndex((ci) => ci.id === args.where.id);
      if (idx >= 0) {
        const [removed] = this.cartItems.splice(idx, 1);
        return removed;
      }
      return null;
    },

    deleteMany: async (args: { where: { cartId: string } }) => {
      let count = 0;
      for (let i = this.cartItems.length - 1; i >= 0; i -= 1) {
        if (this.cartItems[i]?.cartId === args.where.cartId) {
          this.cartItems.splice(i, 1);
          count += 1;
        }
      }
      return { count };
    },

    count: async (args: { where: { cartId: string } }): Promise<number> => {
      return this.cartItems.filter((ci) => ci.cartId === args.where.cartId).length;
    }
  };

  readonly idempotencyKey = {
    findUnique: async (args: {
      where: {
        userId_endpoint_keyValue: {
          userId: string;
          endpoint: string;
          keyValue: string;
        };
      };
    }): Promise<FakeIdempotencyKeyRecord | null> => {
      return (
        this.idempotencyKeys.find(
          (k) =>
            k.userId === args.where.userId_endpoint_keyValue.userId &&
            k.endpoint === args.where.userId_endpoint_keyValue.endpoint &&
            k.keyValue === args.where.userId_endpoint_keyValue.keyValue
        ) ?? null
      );
    },

    upsert: async (args: {
      where: {
        userId_endpoint_keyValue: {
          userId: string;
          endpoint: string;
          keyValue: string;
        };
      };
      update: Partial<FakeIdempotencyKeyRecord>;
      create: Omit<FakeIdempotencyKeyRecord, "id" | "createdAt">;
    }): Promise<FakeIdempotencyKeyRecord> => {
      const existing = this.idempotencyKeys.find(
        (k) =>
          k.userId === args.where.userId_endpoint_keyValue.userId &&
          k.endpoint === args.where.userId_endpoint_keyValue.endpoint &&
          k.keyValue === args.where.userId_endpoint_keyValue.keyValue
      );
      if (existing) {
        Object.assign(existing, args.update);
        return existing;
      }
      const created: FakeIdempotencyKeyRecord = {
        id: randomUUID(),
        ...args.create,
        createdAt: new Date()
      };
      this.idempotencyKeys.push(created);
      return created;
    }
  };

  readonly order = {
    findMany: async (args: {
      where: {
        customerId?: string;
        storeId?: string;
        status?: string;
        codCollectionStatus?: string;
      };
    }) => {
      return this.orders
        .filter(
          (o) =>
            (args.where.customerId === undefined ||
              o.customerId === args.where.customerId) &&
            (args.where.storeId === undefined || o.storeId === args.where.storeId) &&
            (args.where.status === undefined || o.status === args.where.status) &&
            (args.where.codCollectionStatus === undefined ||
              o.codCollectionStatus === args.where.codCollectionStatus)
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((o) => this.hydrateOrder(o));
    },

    findFirst: async (args: {
      where: {
        id?: string;
        customerId?: string;
        storeId?: string;
        orderType?: string;
      };
    }) => {
      const found = this.orders.find(
        (o) =>
          (args.where.id === undefined || o.id === args.where.id) &&
          (args.where.customerId === undefined ||
            o.customerId === args.where.customerId) &&
          (args.where.storeId === undefined || o.storeId === args.where.storeId) &&
          (args.where.orderType === undefined ||
            o.orderType === args.where.orderType)
      );
      return found ? this.hydrateOrder(found) : null;
    },

    create: async (args: {
      data: Omit<FakeOrderRecord, "id" | "createdAt" | "updatedAt" | "completedAt" | "cancelledReason"> & {
        cancelledReason?: string | null;
        completedAt?: Date | null;
      };
    }): Promise<FakeOrderRecord> => {
      const now = new Date();
      const created: FakeOrderRecord = {
        id: randomUUID(),
        ...args.data,
        cancelledReason: args.data.cancelledReason ?? null,
        completedAt: args.data.completedAt ?? null,
        createdAt: now,
        updatedAt: now
      };
      this.orders.push(created);
      return created;
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeOrderRecord>;
    }): Promise<FakeOrderRecord> => {
      const target = this.orders.find((o) => o.id === args.where.id);
      if (!target) {
        throw new Error(`Order not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return target;
    },

    updateMany: async (args: {
      where: {
        id?: string;
        customerId?: string;
        storeId?: string;
        status?: string;
      };
      data: Partial<FakeOrderRecord>;
    }) => {
      let count = 0;
      for (const o of this.orders) {
        if (args.where.id !== undefined && o.id !== args.where.id) continue;
        if (
          args.where.customerId !== undefined &&
          o.customerId !== args.where.customerId
        ) {
          continue;
        }
        if (args.where.storeId !== undefined && o.storeId !== args.where.storeId) {
          continue;
        }
        if (args.where.status !== undefined && o.status !== args.where.status) {
          continue;
        }
        Object.assign(o, args.data, { updatedAt: new Date() });
        count += 1;
      }
      return { count };
    }
  };

  readonly orderItem = {
    createMany: async (args: {
      data: Array<Omit<FakeOrderItemRecord, "id">>;
    }) => {
      for (const row of args.data) {
        this.orderItems.push({ id: randomUUID(), ...row });
      }
      return { count: args.data.length };
    }
  };

  readonly serviceOrderDetails = {
    create: async (args: {
      data: Omit<
        FakeServiceOrderDetailsRecord,
        "id" | "revisionsUsed" | "deliverySummary" | "deliverySubmittedAt" | "customerAcceptedAt" | "serviceAddressSnapshotJson"
      > & { serviceAddressSnapshotJson?: unknown };
    }): Promise<FakeServiceOrderDetailsRecord> => {
      const created: FakeServiceOrderDetailsRecord = {
        id: randomUUID(),
        ...args.data,
        revisionsUsed: 0,
        serviceAddressSnapshotJson: args.data.serviceAddressSnapshotJson ?? null,
        deliverySummary: null,
        deliverySubmittedAt: null,
        customerAcceptedAt: null
      };
      this.serviceOrderDetailsList.push(created);
      return created;
    },

    update: async (args: {
      where: { id: string };
      data: {
        revisionsUsed?: { increment: number } | number;
        deliverySummary?: string | null;
        deliverySubmittedAt?: Date;
        customerAcceptedAt?: Date;
      };
    }): Promise<FakeServiceOrderDetailsRecord> => {
      const target = this.serviceOrderDetailsList.find((s) => s.id === args.where.id);
      if (!target) {
        throw new Error(`ServiceOrderDetails not found: ${args.where.id}`);
      }
      if (typeof args.data.revisionsUsed === "number") {
        target.revisionsUsed = args.data.revisionsUsed;
      } else if (args.data.revisionsUsed?.increment !== undefined) {
        target.revisionsUsed += args.data.revisionsUsed.increment;
      }
      if (args.data.deliverySummary !== undefined) {
        target.deliverySummary = args.data.deliverySummary;
      }
      if (args.data.deliverySubmittedAt !== undefined) {
        target.deliverySubmittedAt = args.data.deliverySubmittedAt;
      }
      if (args.data.customerAcceptedAt !== undefined) {
        target.customerAcceptedAt = args.data.customerAcceptedAt;
      }
      return target;
    }
  };

  readonly delivery = {
    create: async (args: {
      data: {
        orderId: string;
        fulfilmentMode: string;
        deliveryStatus: string;
        areaZoneId: string | null;
        shippingAddressSnapshotJson?: unknown;
      };
    }): Promise<FakeDeliveryRecord> => {
      const now = new Date();
      const created: FakeDeliveryRecord = {
        id: randomUUID(),
        orderId: args.data.orderId,
        fulfilmentMode: args.data.fulfilmentMode,
        deliveryStatus: args.data.deliveryStatus,
        areaZoneId: args.data.areaZoneId,
        shippingAddressSnapshotJson: args.data.shippingAddressSnapshotJson ?? null,
        pickupInstructions: null,
        trackingNote: null,
        dispatchedAt: null,
        deliveredAt: null,
        failedReason: null,
        createdAt: now,
        updatedAt: now
      };
      this.deliveries.push(created);
      return created;
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeDeliveryRecord>;
    }): Promise<FakeDeliveryRecord> => {
      const target = this.deliveries.find((d) => d.id === args.where.id);
      if (!target) {
        throw new Error(`Delivery not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return target;
    }
  };

  readonly orderStatusHistory = {
    create: async (args: {
      data: {
        orderId: string;
        fromStatus: string | null;
        toStatus: string;
        actorId: string | null;
        actorRole: string;
        reason: string | null;
      };
    }): Promise<FakeOrderStatusHistoryRecord> => {
      const created: FakeOrderStatusHistoryRecord = {
        id: randomUUID(),
        ...args.data,
        metadataJson: null,
        createdAt: new Date()
      };
      this.orderStatusHistories.push(created);
      return created;
    }
  };

  readonly orderMessage = {
    findMany: async (args: {
      where: { orderId: string };
    }): Promise<FakeOrderMessageRecord[]> => {
      return this.orderMessages
        .filter((m) => m.orderId === args.where.orderId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },

    create: async (args: {
      data: {
        orderId: string;
        senderId: string;
        senderRole: string;
        body: string;
      };
    }): Promise<FakeOrderMessageRecord> => {
      const created: FakeOrderMessageRecord = {
        id: randomUUID(),
        ...args.data,
        createdAt: new Date()
      };
      this.orderMessages.push(created);
      return created;
    }
  };

  readonly payment = {
    create: async (args: {
      data: {
        orderId: string;
        providerCode: string;
        paymentMethod: string;
        status: string;
        amountPaisa: bigint;
        currency: string;
      };
    }): Promise<FakePaymentRecord> => {
      const now = new Date();
      const created: FakePaymentRecord = {
        id: randomUUID(),
        ...args.data,
        manualPaymentMethodDesc: null,
        confirmationNote: null,
        providerReference: null,
        confirmedById: null,
        collectedAt: null,
        createdAt: now,
        updatedAt: now
      };
      this.payments.push(created);
      return created;
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakePaymentRecord>;
    }): Promise<FakePaymentRecord> => {
      const target = this.payments.find((p) => p.id === args.where.id);
      if (!target) {
        throw new Error(`Payment not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return target;
    },

    updateMany: async (args: {
      where: { orderId: string; status?: string };
      data: Partial<FakePaymentRecord>;
    }) => {
      let count = 0;
      for (const p of this.payments) {
        if (p.orderId !== args.where.orderId) continue;
        if (args.where.status !== undefined && p.status !== args.where.status) {
          continue;
        }
        Object.assign(p, args.data, { updatedAt: new Date() });
        count += 1;
      }
      return { count };
    }
  };

  readonly paymentEvent = {
    create: async (args: {
      data: {
        paymentId: string;
        eventType: string;
        idempotencyKey: string;
        rawPayloadJson: unknown;
      };
    }): Promise<FakePaymentEventRecord> => {
      const created: FakePaymentEventRecord = {
        id: randomUUID(),
        ...args.data,
        createdAt: new Date()
      };
      this.paymentEvents.push(created);
      return created;
    }
  };

  readonly commissionRule = {
    findMany: async (args?: {
      where?: {
        isActive?: boolean;
        scopeType?: string;
        orderType?: string | null;
        effectiveFrom?: { lte: Date };
      };
    }): Promise<FakeCommissionRuleRecord[]> => {
      return this.commissionRules
        .filter((r) => {
          if (
            args?.where?.isActive !== undefined &&
            r.isActive !== args.where.isActive
          ) {
            return false;
          }
          if (
            args?.where?.scopeType !== undefined &&
            r.scopeType !== args.where.scopeType
          ) {
            return false;
          }
          if (
            args?.where?.orderType !== undefined &&
            r.orderType !== args.where.orderType
          ) {
            return false;
          }
          if (
            args?.where?.effectiveFrom?.lte !== undefined &&
            r.effectiveFrom.getTime() > args.where.effectiveFrom.lte.getTime()
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => b.version - a.version);
    },

    updateMany: async (args: {
      where: { scopeType?: string; orderType?: string | null; isActive?: boolean };
      data: Partial<FakeCommissionRuleRecord>;
    }) => {
      let count = 0;
      for (const r of this.commissionRules) {
        if (
          args.where.scopeType !== undefined &&
          r.scopeType !== args.where.scopeType
        ) {
          continue;
        }
        if (
          args.where.orderType !== undefined &&
          r.orderType !== args.where.orderType
        ) {
          continue;
        }
        if (
          args.where.isActive !== undefined &&
          r.isActive !== args.where.isActive
        ) {
          continue;
        }
        Object.assign(r, args.data);
        count += 1;
      }
      return { count };
    },

    create: async (args: {
      data: Omit<FakeCommissionRuleRecord, "id" | "createdAt" | "categoryId" | "effectiveTo">;
    }): Promise<FakeCommissionRuleRecord> => {
      const created: FakeCommissionRuleRecord = {
        id: randomUUID(),
        ...args.data,
        categoryId: null,
        effectiveTo: null,
        createdAt: new Date()
      };
      this.commissionRules.push(created);
      return created;
    }
  };

  readonly commissionLedger = {
    findFirst: async (args: {
      where: { orderId?: string; entryType?: string };
    }): Promise<FakeCommissionLedgerRecord | null> => {
      return (
        this.commissionLedgers.find(
          (l) =>
            (args.where.orderId === undefined || l.orderId === args.where.orderId) &&
            (args.where.entryType === undefined || l.entryType === args.where.entryType)
        ) ?? null
      );
    },

    findMany: async (args: {
      where: { storeId: string };
    }): Promise<FakeCommissionLedgerRecord[]> => {
      return this.commissionLedgers
        .filter((l) => l.storeId === args.where.storeId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    create: async (args: {
      data: Omit<FakeCommissionLedgerRecord, "id" | "createdAt" | "referenceEntryId"> & {
        referenceEntryId?: string | null;
      };
    }): Promise<FakeCommissionLedgerRecord> => {
      const created: FakeCommissionLedgerRecord = {
        id: randomUUID(),
        ...args.data,
        referenceEntryId: args.data.referenceEntryId ?? null,
        createdAt: new Date()
      };
      this.commissionLedgers.push(created);
      return created;
    }
  };

  readonly sellerSettlementRecord = {
    findMany: async (args: {
      where: { storeId: string; direction?: string; status?: string };
    }): Promise<FakeSettlementRecord[]> => {
      return this.sellerSettlementRecords
        .filter(
          (s) =>
            s.storeId === args.where.storeId &&
            (args.where.direction === undefined ||
              s.direction === args.where.direction) &&
            (args.where.status === undefined || s.status === args.where.status)
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },

    create: async (args: {
      data: Omit<FakeSettlementRecord, "id" | "createdAt" | "updatedAt">;
    }): Promise<FakeSettlementRecord> => {
      const now = new Date();
      const created: FakeSettlementRecord = {
        id: randomUUID(),
        ...args.data,
        createdAt: now,
        updatedAt: now
      };
      this.sellerSettlementRecords.push(created);
      return created;
    }
  };

  readonly mediaAsset = {
    create: async (args: {
      data: Omit<FakeMediaAssetRecord, "id" | "createdAt">;
    }): Promise<FakeMediaAssetRecord> => {
      const created: FakeMediaAssetRecord = {
        id: randomUUID(),
        ...args.data,
        createdAt: new Date()
      };
      this.mediaAssets.push(created);
      return created;
    },

    findFirst: async (args: {
      where: { id?: string; ownerUserId?: string; status?: string };
    }): Promise<FakeMediaAssetRecord | null> => {
      return (
        this.mediaAssets.find(
          (m) =>
            (args.where.id === undefined || m.id === args.where.id) &&
            (args.where.ownerUserId === undefined ||
              m.ownerUserId === args.where.ownerUserId) &&
            (args.where.status === undefined || m.status === args.where.status)
        ) ?? null
      );
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeMediaAssetRecord>;
    }): Promise<FakeMediaAssetRecord> => {
      const target = this.mediaAssets.find((m) => m.id === args.where.id);
      if (!target) {
        throw new Error(`MediaAsset not found: ${args.where.id}`);
      }
      Object.assign(target, args.data);
      return target;
    }
  };

  readonly review = {
    findFirst: async (args: {
      where: { orderId?: string; orderItemId?: string | null };
    }) => {
      return (
        this.reviews.find(
          (r) =>
            (args.where.orderId === undefined || r.orderId === args.where.orderId) &&
            (args.where.orderItemId === undefined ||
              r.orderItemId === args.where.orderItemId)
        ) ?? null
      );
    },

    findMany: async (args: {
      where: { storeId: string; status?: string };
    }) => {
      return this.reviews
        .filter(
          (r) =>
            r.storeId === args.where.storeId &&
            (args.where.status === undefined || r.status === args.where.status)
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((r) => ({
          ...r,
          customer: this.users.find((u) => u.id === r.customerId)!
        }));
    },

    create: async (args: {
      data: Omit<FakeReviewRecord, "id" | "createdAt" | "updatedAt">;
    }) => {
      const now = new Date();
      const created: FakeReviewRecord = {
        id: randomUUID(),
        ...args.data,
        createdAt: now,
        updatedAt: now
      };
      this.reviews.push(created);
      return {
        ...created,
        customer: this.users.find((u) => u.id === created.customerId)!
      };
    },

    updateMany: async (args: {
      where: { id?: string };
      data: Partial<FakeReviewRecord>;
    }) => {
      let count = 0;
      for (const r of this.reviews) {
        if (args.where.id !== undefined && r.id !== args.where.id) continue;
        Object.assign(r, args.data, { updatedAt: new Date() });
        count += 1;
      }
      return { count };
    }
  };

  readonly report = {
    create: async (args: {
      data: Omit<
        FakeReportRecord,
        "id" | "createdAt" | "updatedAt" | "resolvedById" | "resolutionNote"
      >;
    }): Promise<FakeReportRecord> => {
      const now = new Date();
      const created: FakeReportRecord = {
        id: randomUUID(),
        ...args.data,
        resolvedById: null,
        resolutionNote: null,
        createdAt: now,
        updatedAt: now
      };
      this.reports.push(created);
      return created;
    },

    findUnique: async (args: {
      where: { id: string };
    }): Promise<FakeReportRecord | null> => {
      return this.reports.find((r) => r.id === args.where.id) ?? null;
    },

    findMany: async (): Promise<FakeReportRecord[]> => {
      return [...this.reports].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeReportRecord>;
    }): Promise<FakeReportRecord> => {
      const target = this.reports.find((r) => r.id === args.where.id);
      if (!target) {
        throw new Error(`Report not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return target;
    }
  };

  readonly dispute = {
    findFirst: async (args: {
      where: { orderId?: string; status?: { in: string[] } };
    }): Promise<FakeDisputeRecord | null> => {
      return (
        this.disputes.find(
          (d) =>
            (args.where.orderId === undefined || d.orderId === args.where.orderId) &&
            (args.where.status?.in === undefined ||
              args.where.status.in.includes(d.status))
        ) ?? null
      );
    },

    findUnique: async (args: {
      where: { id: string };
    }): Promise<FakeDisputeRecord | null> => {
      return this.disputes.find((d) => d.id === args.where.id) ?? null;
    },

    findMany: async (): Promise<FakeDisputeRecord[]> => {
      return [...this.disputes].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    },

    create: async (args: {
      data: Omit<
        FakeDisputeRecord,
        "id" | "createdAt" | "updatedAt" | "resolutionOutcome" | "resolvedById" | "resolutionNote"
      >;
    }): Promise<FakeDisputeRecord> => {
      const now = new Date();
      const created: FakeDisputeRecord = {
        id: randomUUID(),
        ...args.data,
        resolutionOutcome: null,
        resolvedById: null,
        resolutionNote: null,
        createdAt: now,
        updatedAt: now
      };
      this.disputes.push(created);
      return created;
    },

    update: async (args: {
      where: { id: string };
      data: Partial<FakeDisputeRecord>;
    }): Promise<FakeDisputeRecord> => {
      const target = this.disputes.find((d) => d.id === args.where.id);
      if (!target) {
        throw new Error(`Dispute not found: ${args.where.id}`);
      }
      Object.assign(target, args.data, { updatedAt: new Date() });
      return target;
    }
  };

  readonly refund = {
    create: async (args: {
      data: Omit<FakeRefundRecord, "id" | "createdAt" | "updatedAt">;
    }): Promise<FakeRefundRecord> => {
      const now = new Date();
      const created: FakeRefundRecord = {
        id: randomUUID(),
        ...args.data,
        createdAt: now,
        updatedAt: now
      };
      this.refunds.push(created);
      return created;
    }
  };

  private hydrateAddress(address: FakeAddressRecord) {
    const district = this.districts.find((d) => d.id === address.districtId)!;
    const areaZone = address.areaZoneId
      ? (district.areaZones.find((z) => z.id === address.areaZoneId) ?? null)
      : null;
    return {
      ...address,
      district,
      areaZone
    };
  }

  private hydrateCart(cart: FakeCartRecord) {
    const store = this.stores.find((s) => s.id === cart.storeId)!;
    const items = this.cartItems
      .filter((ci) => ci.cartId === cart.id)
      .map((ci) => {
        const product = this.products.find((p) => p.id === ci.productId)!;
        const productVariant = ci.productVariantId
          ? (this.productVariants.find((v) => v.id === ci.productVariantId) ?? null)
          : null;
        return {
          ...ci,
          product,
          productVariant
        };
      });
    return {
      ...cart,
      store: this.hydrateStore(store),
      items
    };
  }

  private hydrateOrder(order: FakeOrderRecord) {
    const store = this.stores.find((s) => s.id === order.storeId)!;
    return {
      ...order,
      store: this.hydrateStore(store),
      items: this.orderItems.filter((i) => i.orderId === order.id),
      serviceOrderDetails:
        this.serviceOrderDetailsList.find((s) => s.orderId === order.id) ?? null,
      delivery: this.deliveries.find((d) => d.orderId === order.id) ?? null,
      statusHistory: this.orderStatusHistories
        .filter((h) => h.orderId === order.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      payments: this.payments.filter((p) => p.orderId === order.id)
    };
  }

  private hydrateProduct(product: FakeProductRecord) {
    const store = this.stores.find((s) => s.id === product.storeId);
    const category = this.categories.find((c) => c.id === product.categoryId);
    if (!store || !category) {
      throw new Error(`Missing store or category for product ${product.id}`);
    }
    const variants = this.productVariants.filter(
      (v) => v.productId === product.id && v.deletedAt === null
    );
    return {
      ...product,
      variants,
      category,
      store: this.hydrateStore(store)
    };
  }

  private hydrateService(service: FakeServiceListingRecord) {
    const store = this.stores.find((s) => s.id === service.storeId);
    const category = this.categories.find((c) => c.id === service.categoryId);
    if (!store || !category) {
      throw new Error(`Missing store or category for service ${service.id}`);
    }
    const packages = this.servicePackages.filter(
      (p) => p.serviceListingId === service.id && p.deletedAt === null
    );
    return {
      ...service,
      packages,
      category,
      store: this.hydrateStore(store)
    };
  }

  private hydrateUser(user: FakeUserRecord) {
    const customerProfile =
      this.customerProfiles.find((p) => p.userId === user.id) ?? null;
    const assignedRoles = this.userRoles
      .filter((ur) => ur.userId === user.id)
      .map((ur) => {
        const role = this.roles.find((r) => r.id === ur.roleId);
        if (!role) {
          throw new Error(`Missing role ${ur.roleId}`);
        }
        return {
          ...ur,
          role
        };
      });

    return {
      ...user,
      customerProfile,
      userRoles: assignedRoles
    };
  }
}
