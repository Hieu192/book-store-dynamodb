const AWS = require('aws-sdk');
const { verifyToken } = require('auth');
const { putItem } = require('dynamodb');
const { generateUUID, getCurrentTimestamp, errorResponse, successResponse } = require('utils');

/**
 * Upload Document to Knowledge Base Handler
 * 
 * Admin-only function to upload documents to S3 for Knowledge Base indexing
 * Can be triggered via:
 * - HTTP API (Lambda Function URL or API Gateway REST)
 * - Direct Lambda invocation
 * 
 * Environment Variables:
 * - KB_BUCKET_NAME: S3 bucket for Knowledge Base documents
 * - KNOWLEDGE_BASE_ID: Bedrock Knowledge Base ID
 * - JWT_SECRET: For admin verification
 */

const s3 = new AWS.S3({
    region: process.env.AWS_REGION || 'ap-southeast-1'
});

const bedrock = new AWS.BedrockAgent({
    region: process.env.AWS_REGION || 'ap-southeast-1'
});

const KB_BUCKET_NAME = process.env.KB_BUCKET_NAME;
const KNOWLEDGE_BASE_ID = process.env.KNOWLEDGE_BASE_ID;

exports.handler = async (event) => {
    console.log('Upload document event:', JSON.stringify(event, null, 2));

    try {
        // Verify admin authorization
        const token = event.headers?.Authorization?.replace('Bearer ', '') ||
            event.queryStringParameters?.token;

        if (!token) {
            return errorResponse(401, 'No authorization token');
        }

        const authResult = verifyToken(token);

        if (!authResult.valid) {
            return errorResponse(401, 'Invalid token');
        }

        // Check if user is admin
        // Note: Adjust based on your user role structure
        if (authResult.role !== 'admin') {
            return errorResponse(403, 'Admin access required');
        }

        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { fileName, content, fileType, documentType } = body;

        if (!fileName || !content) {
            return errorResponse(400, 'fileName and content are required');
        }

        // Validate document type
        const validDocTypes = ['products', 'faqs', 'policies', 'guides'];
        const docType = documentType || 'uploads';

        if (!validDocTypes.includes(docType) && docType !== 'uploads') {
            return errorResponse(400, `Invalid documentType. Must be one of: ${validDocTypes.join(', ')}`);
        }

        // Generate S3 key
        const documentId = generateUUID();
        const timestamp = Date.now();
        const s3Key = `${docType}/${timestamp}-${fileName}`;

        // Determine content type
        let contentType = fileType || 'text/plain';
        if (fileName.endsWith('.pdf')) {
            contentType = 'application/pdf';
        } else if (fileName.endsWith('.txt')) {
            contentType = 'text/plain';
        } else if (fileName.endsWith('.md')) {
            contentType = 'text/markdown';
        }

        // Prepare content buffer
        let buffer;
        if (content.startsWith('data:')) {
            // Base64 data URI
            const base64Data = content.split(',')[1];
            buffer = Buffer.from(base64Data, 'base64');
        } else {
            // Plain text or already base64
            buffer = Buffer.from(content, content.length < 1000 ? 'utf-8' : 'base64');
        }

        // Upload to S3
        const uploadParams = {
            Bucket: KB_BUCKET_NAME,
            Key: s3Key,
            Body: buffer,
            ContentType: contentType,
            Metadata: {
                uploadedBy: authResult.userId,
                documentId: documentId,
                documentType: docType,
                uploadedAt: getCurrentTimestamp()
            }
        };

        const uploadResult = await s3.upload(uploadParams).promise();

        console.log(`✅ Document uploaded to S3: ${uploadResult.Location}`);

        // Store document metadata in DynamoDB
        await putItem({
            PK: `DOCUMENT#${documentId}`,
            SK: 'METADATA',
            documentId: documentId,
            fileName: fileName,
            s3Key: s3Key,
            s3Url: uploadResult.Location,
            documentType: docType,
            contentType: contentType,
            size: buffer.length,
            uploadedBy: authResult.userId,
            uploadedAt: getCurrentTimestamp(),
            status: 'uploaded',
            GSI1PK: `DOCUMENT_TYPE#${docType}`,
            GSI1SK: `UPLOADED#${getCurrentTimestamp()}#${documentId}`
        });

        // Trigger Knowledge Base sync (if available)
        try {
            if (KNOWLEDGE_BASE_ID) {
                // Note: Bedrock KB auto-syncs every 5-15 minutes
                // Or you can trigger manual sync via StartIngestionJob
                const syncParams = {
                    knowledgeBaseId: KNOWLEDGE_BASE_ID,
                    dataSourceId: process.env.DATA_SOURCE_ID, // If you have specific data source
                    description: `Manual sync after uploading ${fileName}`
                };

                // Uncomment if you want manual sync
                // const syncResult = await bedrock.startIngestionJob(syncParams).promise();
                // console.log('Knowledge Base sync started:', syncResult.ingestionJob.ingestionJobId);
            }
        } catch (syncError) {
            console.warn('Failed to trigger KB sync:', syncError.message);
            // Non-critical, continue
        }

        // Return success
        return successResponse(200, {
            message: 'Document uploaded successfully',
            document: {
                id: documentId,
                fileName: fileName,
                s3Key: s3Key,
                url: uploadResult.Location,
                type: docType,
                size: buffer.length
            }
        });

    } catch (error) {
        console.error('❌ Upload error:', error);
        return errorResponse(500, 'Failed to upload document', error.message);
    }
};
