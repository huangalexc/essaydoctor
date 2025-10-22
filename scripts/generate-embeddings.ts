#!/usr/bin/env tsx
/**
 * CLI Script: Generate Vector Embeddings for School/Major Data
 *
 * This script generates OpenAI embeddings for all SchoolMajorData records
 * that don't yet have embeddings. It uses batch processing with rate limiting
 * and retry logic.
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts [options]
 *
 * Options:
 *   --limit <number>     Maximum number of records to process
 *   --ids <id1,id2,...>  Specific record IDs to process (comma-separated)
 *   --force             Regenerate embeddings even if they exist
 *   --stats             Show statistics only (no generation)
 *   --help              Show this help message
 *
 * Examples:
 *   # Generate embeddings for all records without embeddings
 *   npx tsx scripts/generate-embeddings.ts
 *
 *   # Process only 100 records
 *   npx tsx scripts/generate-embeddings.ts --limit 100
 *
 *   # Process specific records
 *   npx tsx scripts/generate-embeddings.ts --ids abc123,def456
 *
 *   # Show statistics without generating
 *   npx tsx scripts/generate-embeddings.ts --stats
 */

import {
  batchGenerateEmbeddings,
  getEmbeddingStats,
  regenerateOutdatedEmbeddings,
} from '../src/lib/embeddings/batch-processor';

interface CliOptions {
  limit?: number;
  ids?: string[];
  force?: boolean;
  stats?: boolean;
  help?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--limit':
        options.limit = parseInt(args[++i], 10);
        if (isNaN(options.limit)) {
          console.error('Error: --limit must be a valid number');
          process.exit(1);
        }
        break;

      case '--ids':
        options.ids = args[++i].split(',').map((id) => id.trim());
        break;

      case '--force':
        options.force = true;
        break;

      case '--stats':
        options.stats = true;
        break;

      case '--help':
      case '-h':
        options.help = true;
        break;

      default:
        console.error(`Unknown option: ${arg}`);
        console.error('Use --help for usage information');
        process.exit(1);
    }
  }

  return options;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
Generate Vector Embeddings for School/Major Data

Usage:
  npx tsx scripts/generate-embeddings.ts [options]

Options:
  --limit <number>     Maximum number of records to process
  --ids <id1,id2,...>  Specific record IDs to process (comma-separated)
  --force             Regenerate embeddings even if they exist
  --stats             Show statistics only (no generation)
  --help              Show this help message

Examples:
  # Generate embeddings for all records without embeddings
  npx tsx scripts/generate-embeddings.ts

  # Process only 100 records
  npx tsx scripts/generate-embeddings.ts --limit 100

  # Process specific records
  npx tsx scripts/generate-embeddings.ts --ids abc123,def456

  # Show statistics without generating
  npx tsx scripts/generate-embeddings.ts --stats
  `);
}

/**
 * Display embedding statistics
 */
async function displayStats() {
  console.log('\n📊 Embedding Statistics\n');

  const stats = await getEmbeddingStats();

  console.log(`Total Records:          ${stats.total}`);
  console.log(`With Embeddings:        ${stats.withEmbeddings}`);
  console.log(`Pending:                ${stats.pending}`);
  console.log(`Completion:             ${stats.completionPercent}%`);

  console.log('\n');
}

/**
 * Main execution function
 */
async function main() {
  const options = parseArgs();

  // Show help if requested
  if (options.help) {
    showHelp();
    return;
  }

  // Show stats if requested
  if (options.stats) {
    await displayStats();
    return;
  }

  // Display initial stats
  console.log('\n🚀 Starting Embedding Generation\n');
  await displayStats();

  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable not set');
    process.exit(1);
  }

  // Run batch generation
  console.log('⏳ Generating embeddings...\n');

  const startTime = Date.now();

  let result;

  if (options.force) {
    console.log('🔄 Force mode: Regenerating all embeddings older than 90 days\n');
    result = await regenerateOutdatedEmbeddings(90);
  } else if (options.ids) {
    console.log(`📝 Processing ${options.ids.length} specific records\n`);
    result = await batchGenerateEmbeddings({
      majorIds: options.ids,
      limit: options.limit,
    });
  } else {
    console.log('📝 Processing records without embeddings\n');
    result = await batchGenerateEmbeddings({
      limit: options.limit,
    });
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Display results
  console.log('\n✅ Batch Generation Complete\n');
  console.log(`Success:     ${result.success}`);
  console.log(`Failed:      ${result.failed}`);
  console.log(`Duration:    ${duration}s`);

  if (result.errors.length > 0) {
    console.log('\n⚠️  Errors:\n');
    result.errors.forEach((error) => {
      console.log(`  - ${error.id}: ${error.error}`);
    });
  }

  // Display final stats
  console.log('\n');
  await displayStats();

  // Exit with error code if there were failures
  if (result.failed > 0) {
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('\n❌ Fatal Error:\n', error);
  process.exit(1);
});
