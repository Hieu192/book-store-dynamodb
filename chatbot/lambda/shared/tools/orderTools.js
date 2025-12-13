/**
 * Order Management Tools for Bedrock Function Calling
 * Uses existing order controller endpoints - NO DUPLICATION
 */

const ORDER_TOOLS = [
    {
        toolSpec: {
            name: "get_user_orders",
            description: `Retrieves all orders for the currently authenticated user.
      
      Use this tool when:
      - Customer asks "đơn hàng của tôi", "my orders", "lịch sử đơn hàng"
      - Customer wants to see their order history
      - Customer asks "đơn gần nhất", "latest order", "đơn mới nhất"
      - Customer wants to check all orders with a specific status
      
      Backend endpoint: GET /api/v1/orders/me
      
      Returns:
      - List of ALL orders for the authenticated user
      - Each order includes: _id, orderCode, status, total, created date, items
      - Automatically filtered by authenticated userId for security
      - Returns empty list if customer has no orders
      
      Note: Backend returns ALL orders, so you may need to:
      - Filter by status if user asks about specific status
      - Sort by date and take first N for "latest orders"
      - Extract specific order if user mentions order code`,

            inputSchema: {
                json: {
                    type: "object",
                    properties: {},
                    required: []
                }
            }
        }
    },

    {
        toolSpec: {
            name: "get_order_details",
            description: `Retrieves detailed information about a specific order using its order ID.
      
      Use this tool when:
      - User provides a specific order code and you need full details
      - After calling get_user_orders, you have order ID and need complete info
      - User asks for detailed information about a specific order
      
      Backend endpoint: GET /api/v1/order/:id
      
      Input:
      - orderId: The internal order ID (NOT order code)
      - You get this ID from get_user_orders results
      
      Returns:
      - Complete order details including all items, shipping info, payment status
      - Only works if order belongs to authenticated user (ownership verified by backend)
      
      Important:
      - This uses internal order ID (_id field from database)
      - If user provides orderCode (e.g., ORD-2024-001234), first call get_user_orders
        to find the order and get its _id, then call this tool with that _id`,

            inputSchema: {
                json: {
                    type: "object",
                    properties: {
                        orderId: {
                            type: "string",
                            description: "Internal database order ID (e.g., MongoDB ObjectId or DynamoDB ID). NOT the orderCode."
                        }
                    },
                    required: ["orderId"]
                }
            }
        }
    }
];

module.exports = ORDER_TOOLS;
