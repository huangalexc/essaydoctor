-- Search school/major programs using semantic similarity with optional filters
-- @param {String} $1:embedding - Embedding vector in PostgreSQL vector format '[x,y,z,...]'
-- @param {String} $2:schoolName - Optional school name filter (use '%' for no filter)
-- @param {String} $3:majorName - Optional major name filter (use '%' for no filter)
-- @param {Int} $4:limit - Maximum number of results to return
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
  AND "schoolName" ILIKE $2
  AND "majorName" ILIKE $3
ORDER BY embedding <=> $1::vector
LIMIT $4;
