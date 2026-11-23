-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EGP', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "TravelStyle" AS ENUM ('BUDGET', 'MID', 'LUXURY');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'QUEUED', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('ESTIMATE', 'LIVE');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('ACTIVITY', 'MEAL', 'TRANSPORT', 'HOTEL');

-- CreateEnum
CREATE TYPE "TimeSlot" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING');

-- CreateEnum
CREATE TYPE "VisaRequirement" AS ENUM ('NOT_REQUIRED', 'VISA_ON_ARRIVAL', 'E_VISA', 'VISA_REQUIRED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VisaConfidence" AS ENUM ('VERIFIED_SOURCE', 'AI_ESTIMATE');

-- CreateEnum
CREATE TYPE "ChecklistCategory" AS ENUM ('VISA', 'BOOKINGS', 'INSURANCE', 'CONNECTIVITY', 'MONEY', 'HEALTH', 'PACKING', 'OTHER');

-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('FLIGHTS', 'HOTELS', 'ACTIVITIES', 'FOOD', 'LOCAL_TRANSPORT', 'VISA', 'BUFFER', 'OTHER');

-- CreateEnum
CREATE TYPE "JobKind" AS ENUM ('FULL_PLAN', 'REGENERATE_DAY', 'SWAP_ACTIVITY');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "displayCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "homeCity" TEXT,
    "nationality" CHAR(2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestTokenHash" TEXT,
    "title" TEXT NOT NULL,
    "destinationQuery" TEXT NOT NULL,
    "surpriseMe" BOOLEAN NOT NULL DEFAULT false,
    "countries" TEXT[],
    "departureCity" TEXT NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "lengthDays" INTEGER NOT NULL,
    "travellers" INTEGER NOT NULL,
    "budgetMinor" INTEGER NOT NULL,
    "budgetCurrency" "Currency" NOT NULL,
    "displayCurrency" "Currency" NOT NULL,
    "style" "TravelStyle" NOT NULL,
    "interests" TEXT[],
    "nationality" CHAR(2) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "practicalInfo" JSONB,
    "shareSlug" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "fxSnapshotId" TEXT,
    "generatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStop" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "country" CHAR(2) NOT NULL,
    "nights" INTEGER NOT NULL,
    "summary" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,

    CONSTRAINT "TripStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripDay" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "stopId" TEXT,
    "dayNumber" INTEGER NOT NULL,
    "date" DATE,
    "title" TEXT NOT NULL,
    "summary" TEXT,

    CONSTRAINT "TripDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryItem" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "ItemType" NOT NULL,
    "slot" "TimeSlot" NOT NULL,
    "startTime" TEXT,
    "durationMin" INTEGER,
    "travelMinFromPrev" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "costMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "priceSource" "PriceSource" NOT NULL DEFAULT 'ESTIMATE',
    "priceCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookingUrl" TEXT,
    "notes" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelOption" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "tier" "TravelStyle" NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "description" TEXT,
    "nightlyMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "priceSource" "PriceSource" NOT NULL DEFAULT 'ESTIMATE',
    "priceCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" DOUBLE PRECISION,
    "url" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HotelOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightOption" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fromCity" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,
    "roundTrip" BOOLEAN NOT NULL DEFAULT true,
    "airline" TEXT,
    "stops" INTEGER,
    "durationMin" INTEGER,
    "priceMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "priceSource" "PriceSource" NOT NULL DEFAULT 'ESTIMATE',
    "priceCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FlightOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaInfo" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "country" CHAR(2) NOT NULL,
    "nationality" CHAR(2) NOT NULL,
    "requirement" "VisaRequirement" NOT NULL,
    "visaType" TEXT,
    "costMinor" INTEGER,
    "currency" CHAR(3),
    "processingTime" TEXT,
    "maxStayDays" INTEGER,
    "documents" TEXT[],
    "officialUrl" TEXT,
    "officialSourceName" TEXT,
    "confidence" "VisaConfidence" NOT NULL,
    "notes" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "category" "ChecklistCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "daysBeforeDeparture" INTEGER,
    "dueDate" DATE,
    "link" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "category" "BudgetCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "priceSource" "PriceSource" NOT NULL DEFAULT 'ESTIMATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "kind" "JobKind" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "step" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "error" TEXT,
    "params" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmUsage" (
    "id" TEXT NOT NULL,
    "tripId" TEXT,
    "jobId" TEXT,
    "userId" TEXT,
    "model" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FxRateSnapshot" (
    "id" TEXT NOT NULL,
    "base" CHAR(3) NOT NULL DEFAULT 'USD',
    "rates" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "priceSource" "PriceSource" NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxRateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "tokens" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_shareSlug_key" ON "Trip"("shareSlug");

-- CreateIndex
CREATE INDEX "Trip_userId_createdAt_idx" ON "Trip"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Trip_guestTokenHash_idx" ON "Trip"("guestTokenHash");

-- CreateIndex
CREATE INDEX "Trip_expiresAt_idx" ON "Trip"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TripStop_tripId_order_key" ON "TripStop"("tripId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "TripDay_tripId_dayNumber_key" ON "TripDay"("tripId", "dayNumber");

-- CreateIndex
CREATE INDEX "ItineraryItem_dayId_order_idx" ON "ItineraryItem"("dayId", "order");

-- CreateIndex
CREATE INDEX "HotelOption_tripId_stopId_idx" ON "HotelOption"("tripId", "stopId");

-- CreateIndex
CREATE INDEX "FlightOption_tripId_idx" ON "FlightOption"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "VisaInfo_tripId_country_key" ON "VisaInfo"("tripId", "country");

-- CreateIndex
CREATE INDEX "ChecklistItem_tripId_order_idx" ON "ChecklistItem"("tripId", "order");

-- CreateIndex
CREATE INDEX "BudgetLine_tripId_idx" ON "BudgetLine"("tripId");

-- CreateIndex
CREATE INDEX "GenerationJob_tripId_createdAt_idx" ON "GenerationJob"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmUsage_tripId_idx" ON "LlmUsage"("tripId");

-- CreateIndex
CREATE INDEX "LlmUsage_userId_createdAt_idx" ON "LlmUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FxRateSnapshot_fetchedAt_idx" ON "FxRateSnapshot"("fetchedAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_fxSnapshotId_fkey" FOREIGN KEY ("fxSnapshotId") REFERENCES "FxRateSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDay" ADD CONSTRAINT "TripDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDay" ADD CONSTRAINT "TripDay_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TripStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "TripDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelOption" ADD CONSTRAINT "HotelOption_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HotelOption" ADD CONSTRAINT "HotelOption_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "TripStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightOption" ADD CONSTRAINT "FlightOption_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaInfo" ADD CONSTRAINT "VisaInfo_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
