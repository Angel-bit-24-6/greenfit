/*
  Warnings:

  - You are about to alter the column `price` on the `cart_items` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `totalPrice` on the `carts` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `confidence` on the `chat_logs` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,4)` to `DoublePrecision`.
  - You are about to alter the column `price` on the `ingredients` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `totalPrice` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `price` on the `plates` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `confidence` on the `suggestions` table. The data in that column could be lost. The data in that column will be cast from `Decimal(5,4)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "cart_items" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "carts" ALTER COLUMN "totalPrice" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "chat_logs" ALTER COLUMN "confidence" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ingredients" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "totalPrice" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "plates" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "suggestions" ALTER COLUMN "confidence" SET DATA TYPE DOUBLE PRECISION;
