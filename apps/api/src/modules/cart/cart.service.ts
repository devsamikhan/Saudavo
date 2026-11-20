import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  AddCartItemRequest,
  CartsResponse,
  CartsResponseSchema,
  StoreCartDto,
  UpdateCartItemRequest
} from "@saudavo/contracts";
import { DomainException } from "../../common/errors/domain.exception";
import { bigIntToSafeNumber } from "../../common/money.util";
import { PrismaService } from "../../common/prisma/prisma.service";

export const CART_WITH_ITEMS_INCLUDE = {
  store: true,
  items: {
    include: {
      product: true,
      productVariant: true
    },
    orderBy: { createdAt: "asc" }
  }
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{
  include: typeof CART_WITH_ITEMS_INCLUDE;
}>;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async listCarts(userId: string, requestId: string): Promise<CartsResponse> {
    const carts = await this.prisma.cart.findMany({
      where: { customerId: userId },
      include: CART_WITH_ITEMS_INCLUDE,
      orderBy: { updatedAt: "desc" }
    });

    const data: StoreCartDto[] = carts
      .filter((c) => c.items.length > 0)
      .map((cart) => this.toStoreCartDto(cart));

    return CartsResponseSchema.parse({
      data,
      meta: { requestId }
    });
  }

  async addItem(
    userId: string,
    dto: AddCartItemRequest,
    requestId: string
  ): Promise<{ data: StoreCartDto; meta: { requestId: string } }> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        status: "ACTIVE",
        deletedAt: null,
        store: {
          status: "ACTIVE",
          deletedAt: null,
          sellerProfile: { verificationStatus: "APPROVED" }
        }
      },
      include: {
        store: {
          include: {
            sellerProfile: true
          }
        },
        variants: {
          where: { deletedAt: null, isActive: true }
        }
      }
    });

    if (!product) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Active product not found."
      );
    }

    if (product.store.sellerProfile.userId === userId) {
      throw new DomainException(
        "FORBIDDEN",
        HttpStatus.FORBIDDEN,
        "Self-dealing is not allowed: sellers cannot buy from their own store."
      );
    }

    let availableStock = product.stockQuantity;
    const variantId: string | null = dto.productVariantId ?? null;

    if (variantId) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) {
        throw new DomainException(
          "VALIDATION_ERROR",
          HttpStatus.BAD_REQUEST,
          "Selected product variant is unavailable."
        );
      }
      availableStock = variant.stockQuantity;
    } else if (product.hasVariants && product.variants.length > 0) {
      throw new DomainException(
        "VALIDATION_ERROR",
        HttpStatus.BAD_REQUEST,
        "Please select a product variant."
      );
    }

    const updatedCart = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: {
          customerId_storeId: {
            customerId: userId,
            storeId: product.storeId
          }
        },
        update: {},
        create: {
          customerId: userId,
          storeId: product.storeId,
          currency: "PKR"
        }
      });

      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: product.id,
          productVariantId: variantId
        }
      });

      const desiredQty = (existingItem?.quantity ?? 0) + dto.quantity;
      if (desiredQty > availableStock) {
        throw new DomainException(
          "CONFLICT",
          HttpStatus.CONFLICT,
          `Requested quantity exceeds available stock (${String(availableStock)}).`
        );
      }

      if (existingItem) {
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: desiredQty }
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            productVariantId: variantId,
            quantity: desiredQty
          }
        });
      }

      return tx.cart.findFirst({
        where: { id: cart.id },
        include: CART_WITH_ITEMS_INCLUDE
      });
    });

    if (!updatedCart) {
      throw new DomainException(
        "INTERNAL_SERVER_ERROR",
        HttpStatus.INTERNAL_SERVER_ERROR,
        "Unable to load updated cart."
      );
    }

    return {
      data: this.toStoreCartDto(updatedCart),
      meta: { requestId }
    };
  }

  async updateItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemRequest,
    requestId: string
  ): Promise<{ data: StoreCartDto; meta: { requestId: string } }> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId },
      include: {
        cart: true,
        product: true,
        productVariant: true
      }
    });

    if (!item || item.cart.customerId !== userId) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Cart item not found."
      );
    }

    const availableStock = item.productVariant
      ? item.productVariant.stockQuantity
      : item.product.stockQuantity;
    if (dto.quantity > availableStock) {
      throw new DomainException(
        "CONFLICT",
        HttpStatus.CONFLICT,
        `Requested quantity exceeds available stock (${String(availableStock)}).`
      );
    }

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: dto.quantity }
    });

    const refreshed = await this.prisma.cart.findFirst({
      where: { id: item.cartId },
      include: CART_WITH_ITEMS_INCLUDE
    });
    if (!refreshed) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Cart not found."
      );
    }

    return {
      data: this.toStoreCartDto(refreshed),
      meta: { requestId }
    };
  }

  async removeItem(
    userId: string,
    cartItemId: string,
    requestId: string
  ): Promise<{ data: { removed: true; id: string }; meta: { requestId: string } }> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId },
      include: { cart: true }
    });

    if (!item || item.cart.customerId !== userId) {
      throw new DomainException(
        "NOT_FOUND",
        HttpStatus.NOT_FOUND,
        "Cart item not found."
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.delete({
        where: { id: item.id }
      });

      const remaining = await tx.cartItem.count({
        where: { cartId: item.cartId }
      });
      if (remaining === 0) {
        await tx.cart.delete({ where: { id: item.cartId } });
      }
    });

    return {
      data: { removed: true, id: item.id },
      meta: { requestId }
    };
  }

  private toStoreCartDto(cart: CartWithItems): StoreCartDto {
    let subtotal = 0;
    const items = cart.items.map((item) => {
      const unitPrice = bigIntToSafeNumber(
        item.productVariant
          ? item.productVariant.pricePaisa
          : item.product.basePricePaisa,
        "unitPricePaisa"
      );
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      const availableStock = item.productVariant
        ? item.productVariant.stockQuantity
        : item.product.stockQuantity;

      return {
        id: item.id,
        productId: item.productId,
        productVariantId: item.productVariantId,
        productTitle: item.product.title,
        productSlug: item.product.slug,
        variantTitle: item.productVariant?.title ?? null,
        unitPricePaisa: unitPrice,
        lineTotalPaisa: lineTotal,
        quantity: item.quantity,
        availableStock
      };
    });

    return {
      cartId: cart.id,
      storeId: cart.storeId,
      storeSlug: cart.store.slug,
      storeDisplayName: cart.store.displayName,
      currency: "PKR",
      subtotalPaisa: subtotal,
      items
    };
  }
}
