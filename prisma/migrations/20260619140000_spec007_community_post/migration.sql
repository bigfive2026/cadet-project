-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_posts_creator_profile_id_created_at_idx" ON "community_posts"("creator_profile_id", "created_at");

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
