from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import ChunkModel


class VectorSearchRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def similarity_search(
        self,
        knowledge_base_id: str,
        query_embedding: list[float],
        top_k: int = 5,
    ) -> list[tuple[ChunkModel, float]]:
        """
        Returns the top_k most similar chunks for a knowledge base, ordered by
        cosine similarity descending (closest first).
        Uses the HNSW index on the embedding column for fast ANN search.
        """
        cosine_dist = ChunkModel.embedding.cosine_distance(query_embedding)

        result = await self._session.execute(
            select(ChunkModel, (1 - cosine_dist).label("similarity"))
            .where(
                ChunkModel.knowledge_base_id == knowledge_base_id,
                ChunkModel.embedding.is_not(None),
            )
            .order_by(cosine_dist)
            .limit(top_k)
        )
        return [(row.ChunkModel, float(row.similarity)) for row in result.all()]
