-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PDF', 'DOC', 'DOCX', 'TXT', 'MD', 'XLSX', 'XLS', 'CSV', 'JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'MP4', 'MOV', 'AVI', 'MKV');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ResponseMode" AS ENUM ('PROFESSIONAL', 'ACADEMIC', 'CASUAL', 'TECHNICAL', 'SIMPLIFIED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "page_count" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Session',
    "mode" "ResponseMode" NOT NULL DEFAULT 'PROFESSIONAL',
    "knowledge_base_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_knowledge_base_id_idx" ON "documents"("knowledge_base_id");

-- CreateIndex
CREATE INDEX "documents_knowledge_base_id_status_idx" ON "documents"("knowledge_base_id", "status");

-- CreateIndex
CREATE INDEX "messages_session_id_idx" ON "messages"("session_id");

-- CreateIndex
CREATE INDEX "messages_session_id_created_at_idx" ON "messages"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_knowledge_base_id_fkey"
    FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_knowledge_base_id_fkey"
    FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
