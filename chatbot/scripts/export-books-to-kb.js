/**
 * Export Books from DynamoDB to S3 for Knowledge Base
 * 
 * This script:
 * 1. Queries all books from DynamoDB
 * 2. Formats them as text documents
 * 3. Uploads to S3 KB bucket
 * 
 * Usage:
 *   node export-books-to-kb.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Configuration
const REGION = 'ap-southeast-1';
const TABLE_NAME = 'BookStore';
const KB_BUCKET = 'bookstore-production-chatbot-kb-904233110564'; // Update with your bucket name
const KB_PREFIX = 'books/';

// Initialize clients
const dynamoClient = new DynamoDBClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({ region: REGION });

/**
 * Scan all books from DynamoDB
 */
async function getAllBooks() {
    console.log('📚 Scanning books from DynamoDB...');

    const books = [];
    let lastEvaluatedKey = undefined;

    do {
        const params = {
            TableName: TABLE_NAME
        };

        // Add pagination if needed
        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }

        const response = await dynamo.send(new ScanCommand(params));

        // Filter books from response (PK starts with PRODUCT#, SK = METADATA)
        const bookItems = response.Items.filter(item =>
            item.PK && item.PK.startsWith('PRODUCT#') &&
            item.SK === 'METADATA'
        );

        books.push(...bookItems);
        lastEvaluatedKey = response.LastEvaluatedKey;

        console.log(`  Found ${bookItems.length} books (Total: ${books.length})`);
    } while (lastEvaluatedKey);

    return books;
}

/**
 * Format book as text document for Knowledge Base
 */
function formatBookDocument(book) {
    const doc = `
# ${book.name}

**Author:** ${book.author || 'Unknown'}
**Category:** ${book.category || 'Uncategorized'}
**Price:** $${book.price}
**Stock:** ${book.stock} available
**Rating:** ${book.ratings || 'Not rated'} ⭐

## Description
${book.description || 'No description available.'}

## Product Details
- Product ID: ${book.productId || book.id}
- Created: ${book.createdAt || 'Unknown'}
${book.publisher ? `- Publisher: ${book.publisher}` : ''}
${book.publicationDate ? `- Publication Date: ${book.publicationDate}` : ''}
${book.isbn ? `- ISBN: ${book.isbn}` : ''}
${book.pages ? `- Pages: ${book.pages}` : ''}
${book.language ? `- Language: ${book.language}` : ''}

## Reviews Summary
${book.reviews && book.reviews.length > 0
            ? book.reviews.map(r => `- ${r.rating}⭐: ${r.comment}`).join('\n')
            : 'No reviews yet.'
        }

---
Keywords: ${book.name}, ${book.author}, ${book.category}, book, manga, novel
`;

    return doc.trim();
}

/**
 * Upload document to S3
 */
async function uploadToS3(key, content) {
    const params = {
        Bucket: KB_BUCKET,
        Key: key,
        Body: content,
        ContentType: 'text/plain',
        Metadata: {
            'source': 'dynamodb-export',
            'export-date': new Date().toISOString()
        }
    };

    await s3Client.send(new PutObjectCommand(params));
}

/**
 * Main export function
 */
async function exportBooksToKB() {
    try {
        console.log('🚀 Starting DynamoDB → S3 Export for Knowledge Base\n');

        // Step 1: Get all books
        const books = await getAllBooks();
        console.log(`\n✅ Retrieved ${books.length} books from DynamoDB\n`);

        if (books.length === 0) {
            console.log('⚠️  No books found in DynamoDB!');
            return;
        }

        // Step 2: Upload each book as a document
        console.log('📤 Uploading to S3...\n');

        for (let i = 0; i < books.length; i++) {
            const book = books[i];
            const fileName = `${book.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.txt`;
            const s3Key = `${KB_PREFIX}${fileName}`;

            const document = formatBookDocument(book);

            await uploadToS3(s3Key, document);

            console.log(`  ${i + 1}/${books.length} ✓ ${book.name} → ${s3Key}`);
        }

        console.log(`\n✅ Successfully exported ${books.length} books to S3!`);
        console.log(`📍 S3 Location: s3://${KB_BUCKET}/${KB_PREFIX}\n`);

        // Step 3: Create summary document
        const summary = `# Book Catalog Summary

Total Books: ${books.length}
Last Updated: ${new Date().toISOString()}

## Categories
${[...new Set(books.map(b => b.category))].map(cat =>
            `- ${cat}: ${books.filter(b => b.category === cat).length} books`
        ).join('\n')}

## All Books
${books.map(b => `- ${b.name} by ${b.author || 'Unknown'} ($${b.price})`).join('\n')}
`;

        await uploadToS3(`${KB_PREFIX}catalog-summary.txt`, summary);
        console.log('✓ Created catalog summary\n');

        console.log('📝 Next Steps:');
        console.log('1. Go to AWS Bedrock Console → Knowledge Bases');
        console.log('2. Select your Knowledge Base');
        console.log('3. Click "Data sources" → Select S3 source → Click "Sync"');
        console.log('4. Wait 2-5 minutes for indexing');
        console.log('5. Test chatbot with: "What manga books do you have?"');

    } catch (error) {
        console.error('❌ Export failed:', error);
        throw error;
    }
}

// Run export
exportBooksToKB();
