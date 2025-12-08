/**
 * Seed Script - Tạo Dữ Liệu Mẫu
 * Tạo danh mục, sản phẩm, đơn hàng, người dùng, admin và đánh giá
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const categoryService = require('../services/CategoryService');
const productService = require('../services/ProductService');
const orderService = require('../services/OrderService');
const userService = require('../services/UserService');

// Load environment variables
dotenv.config({ path: 'config/config.env' });

const CATEGORIES = [
    { name: 'Điện tử', description: 'Thiết bị điện tử và công nghệ' },
    { name: 'Sách', description: 'Sách và xuất bản phẩm' },
    { name: 'Thời trang', description: 'Quần áo và phụ kiện' },
    { name: 'Nhà cửa & Vườn', description: 'Đồ gia dụng và làm vườn' },
    { name: 'Thể thao', description: 'Dụng cụ và thiết bị thể thao' },
    { name: 'Đồ chơi', description: 'Đồ chơi và trò chơi' },
    { name: 'Làm đẹp', description: 'Mỹ phẩm và chăm sóc cá nhân' },
    { name: 'Thực phẩm', description: 'Thực phẩm và đồ uống' },
    { name: 'Ô tô', description: 'Phụ tùng và phụ kiện ô tô' },
    { name: 'Sức khỏe', description: 'Sản phẩm chăm sóc sức khỏe' }
];

const PRODUCT_NAMES = {
    'Điện tử': ['Laptop Dell', 'iPhone 15', 'iPad Pro', 'Tai nghe Sony', 'Máy ảnh Canon', 'Apple Watch', 'Loa JBL', 'Màn hình LG', 'Bàn phím cơ', 'Chuột Logitech'],
    'Sách': ['Đắc Nhân Tâm', 'Nhà Giả Kim', 'Sapiens', 'Tôi Thấy Hoa Vàng', 'Tuổi Trẻ Đáng Giá', 'Nghĩ Giàu Làm Giàu', 'Vô Cùng Tàn Nhẫn', 'Cà Phê Cùng Tony', 'Trí Tuệ Do Thái', 'Muôn Kiếp Nhân Sinh'],
    'Thời trang': ['Áo thun Nam', 'Quần Jean Nữ', 'Váy Dự Tiệc', 'Áo Khoác', 'Giày Sneaker', 'Mũ Lưỡi Trai', 'Vớ Cotton', 'Áo Len', 'Quần Short', 'Khăn Choàng'],
    'Nhà cửa & Vườn': ['Đèn Ngủ', 'Bình Hoa', 'Chậu Cây', 'Rèm Cửa', 'Thảm Trải Sàn', 'Ghế Sofa', 'Bàn Ăn', 'Gương Trang Điểm', 'Đồng Hồ Treo Tường', 'Gối Tựa Lưng'],
    'Thể thao': ['Bóng Đá', 'Bóng Rổ', 'Vợt Tennis', 'Thảm Yoga', 'Tạ Tay', 'Giày Chạy Bộ', 'Găng Tay Boxing', 'Mũ Bảo Hiểm', 'Áo Đấu', 'Bình Nước'],
    'Đồ chơi': ['Mô Hình Anime', 'Búp Bê Barbie', 'Xếp Hình', 'Cờ Vua', 'Xe Điều Khiển', 'Lego City', 'Gấu Bông', 'Lắp Ráp', 'Tàu Hỏa', 'Diều'],
    'Làm đẹp': ['Son Môi Dior', 'Mascara Maybelline', 'Kem Nền', 'Nước Hoa Chanel', 'Dầu Gội', 'Dầu Xã', 'Kem Dưỡng Da', 'Sữa Dưỡng Thể', 'Sơn Móng Tay', 'Máy Sấy Tóc'],
    'Thực phẩm': ['Cà Phê Trung Nguyên', 'Trà Ô Long', 'Socola Ferrero', 'Bánh Quy', 'Snack Khoai', 'Nước Ép', 'Ngũ Cốc', 'Mì Ý', 'Gạo ST25', 'Bánh Protein'],
    'Ô tô': ['Ắc Quy GS', 'Lốp Michelin', 'Lọc Dầu', 'Má Phanh', 'Gạt Nước', 'Lọc Gió', 'Bugi NGK', 'Áo Trùm Xe', 'Thảm Lót Sàn', 'Giá Đỡ Điện Thoại'],
    'Sức khỏe': ['Vitamin C 1000mg', 'Whey Protein', 'Khẩu Trang y tế', 'Nước Rửa Tay', 'Nhiệt Kế Điện Tử', 'Máy Đo Huyết Áp', 'Hộp Sơ Cứu', 'Dầu Massage', 'Vòng Đeo Tay Thông Minh', 'Gạch Yoga']
};

const REVIEW_COMMENTS = [
    'Sản phẩm tuyệt vời! Rất đáng mua.',
    'Chất lượng tốt với mức giá hợp lý.',
    'Không tệ, đáp ứng được mong đợi.',
    'Có thể tốt hơn, nhưng chấp nhận được.',
    'Hoàn hảo! Đúng như những gì tôi cần.',
    'Sản phẩm tuyệt hay, đáng từng đồng!',
    'Giá trị tốt với tiền bỏ ra.',
    'Hài lòng với sản phẩm này.',
    'Giao hàng nhanh, sản phẩm chất lượng.',
    'Sẽ mua lại lần sau!',
    'Sản phẩm khá ổn, không có gì đặc biệt.',
    'Vượt quá mong đợi của tôi!',
    'Chất lượng còn cần cải thiện.',
    'Rất thích! Mua rất đáng.',
    'Hoạt động đúng như mô tả.',
    'Khá tốt nhìn chung.',
    'Rất hài lòng với sản phẩm.',
    'Sản phẩm tốt, đáng giới thiệu.',
    'Không ấn tượng lắm, nhưng được.',
    'Chất lượng xuất sắc!'
];

// User credentials
const USER_CREDENTIALS = [];
const ADMIN_CREDENTIALS = [];

async function seedData() {
    console.log('🌱 Bắt đầu tạo dữ liệu mẫu...\n');

    try {
        // 1. Tạo Admin
        console.log('👑 Tạo Admin...');
        const adminData = {
            name: 'Quản Trị Viên',
            email: 'admin@bookstore.com',
            password: 'Admin@123456',
            role: 'admin'
        };

        const admin = await userService.createUser(adminData);
        ADMIN_CREDENTIALS.push({
            name: admin.name,
            email: adminData.email,
            password: adminData.password,
            role: 'admin'
        });
        console.log('✅ Đã tạo Admin');

        // 2. Tạo 5 người dùng
        console.log('\n👥 Tạo 5 người dùng...');
        const users = [];
        for (let i = 1; i <= 5; i++) {
            const userData = {
                name: `Người dùng ${i}`,
                email: `user${i}@example.com`,
                password: `User${i}@123`,
                role: 'user'
            };

            const user = await userService.createUser(userData);
            users.push(user);
            USER_CREDENTIALS.push({
                name: user.name,
                email: userData.email,
                password: userData.password,
                role: 'user'
            });
            console.log(`✅ Đã tạo: ${userData.email}`);
        }

        // 3. Tạo 10 danh mục
        console.log('\n📁 Tạo 10 danh mục...');
        const categories = [];
        for (const cat of CATEGORIES) {
            const category = await categoryService.createCategory({
                name: cat.name,
                description: cat.description,
                images: [{
                    public_id: `category_${cat.name.toLowerCase().replace(/\s/g, '_')}`,
                    url: `https://via.placeholder.com/300x200?text=${encodeURIComponent(cat.name)}`
                }]
            });
            categories.push(category);
            console.log(`✅ Đã tạo danh mục: ${cat.name}`);
        }

        // 4. Tạo 100 sản phẩm (10 sản phẩm mỗi danh mục)
        console.log('\n📦 Tạo 100 sản phẩm...');
        const products = [];
        let productCount = 0;

        for (const category of categories) {
            const categoryName = category.name;
            const productNames = PRODUCT_NAMES[categoryName] || PRODUCT_NAMES['Điện tử'];

            for (let i = 0; i < 10; i++) {
                const productName = productNames[i];
                const price = Math.floor(Math.random() * 9000000) + 1000000; // 1tr - 10tr VND
                const stock = Math.floor(Math.random() * 50) + 10;

                const productData = {
                    name: productName,
                    price: price,
                    description: `${productName} chất lượng cao từ danh mục ${categoryName}. Sản phẩm chính hãng, bảo hành đầy đủ.`,
                    category: categoryName,
                    seller: 'BookStore Official',
                    stock: stock,
                    ratings: (Math.random() * 2 + 3).toFixed(1),
                    numOfReviews: 0,
                    images: [{
                        public_id: `product_${productCount}`,
                        url: `https://via.placeholder.com/400x400?text=${encodeURIComponent(productName)}`
                    }]
                };

                const product = await productService.createProduct(productData, admin.id || admin._id);
                products.push(product);
                productCount++;

                if (productCount % 10 === 0) {
                    console.log(`✅ Đã tạo ${productCount}/100 sản phẩm`);
                }
            }
        }

        // 5. Tạo 100 đơn hàng (20 đơn mỗi người dùng)
        console.log('\n🛒 Tạo 100 đơn hàng...');
        let orderCount = 0;

        for (let userIndex = 0; userIndex < users.length; userIndex++) {
            const user = users[userIndex];
            const userId = user.id || user._id;

            for (let i = 0; i < 20; i++) {
                const numItems = Math.floor(Math.random() * 3) + 1;
                const orderItems = [];
                let itemsPrice = 0;

                for (let j = 0; j < numItems; j++) {
                    const randomProduct = products[Math.floor(Math.random() * products.length)];
                    const productId = randomProduct.id || randomProduct._id;
                    const quantity = Math.floor(Math.random() * 3) + 1;
                    const price = randomProduct.price;

                    orderItems.push({
                        name: randomProduct.name,
                        quantity: quantity,
                        image: randomProduct.images[0].url,
                        price: price,
                        product: productId
                    });

                    itemsPrice += price * quantity;
                }

                const taxPrice = itemsPrice * 0.1;
                const shippingPrice = itemsPrice > 5000000 ? 0 : 200000; // Free ship trên 5tr
                const totalPrice = itemsPrice + taxPrice + shippingPrice;

                const orderData = {
                    shippingInfo: {
                        address: `${Math.floor(Math.random() * 999) + 1} Đường Lê Lợi`,
                        city: ['Hà Nội', 'TP HCM', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'][Math.floor(Math.random() * 5)],
                        phoneNo: `09${Math.floor(Math.random() * 90000000) + 10000000}`,
                        postalCode: `${Math.floor(Math.random() * 90000) + 10000}`,
                        country: 'Việt Nam'
                    },
                    orderItems: orderItems,
                    paymentInfo: {
                        id: `payment_${Date.now()}_${orderCount}`,
                        status: 'succeeded'
                    },
                    itemsPrice: itemsPrice,
                    taxPrice: taxPrice,
                    shippingPrice: shippingPrice,
                    totalPrice: totalPrice,
                    orderStatus: ['Đang xử lý', 'Đang giao', 'Đã giao'][Math.floor(Math.random() * 3)]
                };

                for (const item of orderItems) {
                    try {
                        await productService.updateStock(item.product, -item.quantity);
                    } catch (error) {
                        console.log(`⚠️  Không thể giảm stock: ${error.message}`);
                    }
                }

                const order = await orderService.createOrder(orderData, userId);
                orderCount++;

                if (orderCount % 20 === 0) {
                    console.log(`✅ Đã tạo ${orderCount}/100 đơn hàng`);
                }
            }
        }

        // 6. Tạo 200 đánh giá
        console.log('\n⭐ Tạo 200 đánh giá...');
        let reviewCount = 0;

        for (let i = 0; i < 200; i++) {
            const randomUser = users[Math.floor(Math.random() * users.length)];
            const userId = randomUser.id || randomUser._id;

            const randomProduct = products[Math.floor(Math.random() * products.length)];
            const productId = randomProduct.id || randomProduct._id;

            const rating = Math.floor(Math.random() * 5) + 1;
            const comment = REVIEW_COMMENTS[Math.floor(Math.random() * REVIEW_COMMENTS.length)];

            const reviewData = {
                user: userId,
                name: randomUser.name,
                rating: rating,
                comment: comment
            };

            try {
                await productService.createReview(productId, reviewData);
                reviewCount++;

                if (reviewCount % 50 === 0) {
                    console.log(`✅ Đã tạo ${reviewCount}/200 đánh giá`);
                }
            } catch (error) {
                if (!error.message.includes('already reviewed')) {
                    console.log(`⚠️  Không thể tạo đánh giá: ${error.message}`);
                }
            }
        }

        console.log(`✅ Tổng số đánh giá đã tạo: ${reviewCount}`);

        // In thông tin đăng nhập
        console.log('\n' + '='.repeat(70));
        console.log('🎉 TẠO DỮ LIỆU THÀNH CÔNG!');
        console.log('='.repeat(70));

        console.log('\n👑 THÔNG TIN ADMIN:');
        console.log('─'.repeat(70));
        ADMIN_CREDENTIALS.forEach(cred => {
            console.log(`Tên:      ${cred.name}`);
            console.log(`Email:    ${cred.email}`);
            console.log(`Mật khẩu: ${cred.password}`);
            console.log(`Vai trò:  ${cred.role}`);
        });

        console.log('\n👥 THÔNG TIN NGƯỜI DÙNG:');
        console.log('─'.repeat(70));
        USER_CREDENTIALS.forEach(cred => {
            console.log(`Tên:      ${cred.name}`);
            console.log(`Email:    ${cred.email}`);
            console.log(`Mật khẩu: ${cred.password}`);
            console.log(`Vai trò:  ${cred.role}`);
            console.log('─'.repeat(70));
        });

        console.log('\n📊 TỔNG KẾT:');
        console.log('─'.repeat(70));
        console.log(`✅ Danh mục:   10`);
        console.log(`✅ Sản phẩm:   100`);
        console.log(`✅ Đơn hàng:   100`);
        console.log(`✅ Đánh giá:   ${reviewCount}`);
        console.log(`✅ Người dùng: 5`);
        console.log(`✅ Admin:      1`);
        console.log('='.repeat(70));

        console.log('\n💡 Bạn có thể đăng nhập với các thông tin trên!');
        console.log('💳 Tất cả đơn hàng đều thanh toán thành công');
        console.log(`⭐ ${reviewCount} đánh giá từ người dùng\n`);

    } catch (error) {
        console.error('❌ Lỗi khi tạo dữ liệu:', error);
        throw error;
    }
}

// Chạy seed
seedData()
    .then(() => {
        console.log('✅ Hoàn tất tạo dữ liệu');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Tạo dữ liệu thất bại:', error);
        process.exit(1);
    });
