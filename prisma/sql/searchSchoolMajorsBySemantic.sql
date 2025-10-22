-- Search school/major programs using semantic similarity (cosine distance)
-- @param {String} $1:embedding - Embedding vector in PostgreSQL vector format '[x,y,z,...]'
-- @param {Int} $2:limit - Maximum number of results to return
SELECT
  id,
  "schoolName",
  "majorName",
  "programDescription",
  "keyFeatures",
  "sourceUrl",
  "lastUpdated",
  -- Cosine distance (lower is more similar, 0 = identical, 2 = opposite)
  embedding <=> $1::vector AS distance,
  -- Convert distance to similarity score (0-1, higher is more similar)
  (1 - (embedding <=> $1::vector) / 2) AS similarity
FROM "school_major_data"
WHERE
  embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT $2;
