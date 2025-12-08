/**
 * Seed Script - DYNAMODB VERSION
 * 100% Real Data: 10 Categories x 10 Books/each = 100 Books
 * Target: DynamoDB (via Services)
 */

const dotenv = require('dotenv');
// Load Config
dotenv.config({ path: 'config/config.env' });

// FORCE DYNAMODB MODE
process.env.DB_TYPE = 'dynamodb';
// Disable Image Upload validations if necessary or mock them
process.env.NODE_ENV = 'development';

const categoryService = require('../services/CategoryService');
const productService = require('../services/ProductService');
const orderService = require('../services/OrderService');
const userService = require('../services/UserService');

// 1. DANH MỤC
const CATEGORIES = [
    { name: 'Văn học Kinh điển', description: 'Những tác phẩm văn học vượt thời gian.' },
    { name: 'Kinh tế & Quản trị', description: 'Sách về kinh doanh, đầu tư và lãnh đạo.' },
    { name: 'Tâm lý & Kỹ năng', description: 'Phát triển bản thân và thấu hiểu tâm lý.' },
    { name: 'Thiếu nhi', description: 'Sách truyện và giáo dục cho trẻ em.' },
    { name: 'Trinh thám', description: 'Những vụ án ly kỳ và bí ẩn.' },
    { name: 'Tiểu thuyết Lãng mạn', description: 'Những câu chuyện tình yêu cảm động.' },
    { name: 'Lịch sử', description: 'Khám phá quá khứ và các nền văn minh.' },
    { name: 'Khoa học Viễn tưởng', description: 'Công nghệ tương lai và du hành vũ trụ.' },
    { name: 'Manga - Comic', description: 'Truyện tranh Nhật Bản và Âu Mỹ.' },
    { name: 'Sống đẹp', description: 'Phong cách sống và cảm hứng.' }
];

// 2. DỮ LIỆU SÁCH (100 CUỐN THẬT)
const BOOKS_DATA = {
    'Văn học Kinh điển': [
        { name: 'Nhà Giả Kim', desc: 'Cuốn sách của Paulo Coelho kể về hành trình theo đuổi ước mơ của Santiago. Một tác phẩm đầy triết lý và cảm hứng về việc lắng nghe trái tim mình.' },
        { name: 'Ông Già Và Biển Cả', desc: 'Kiệt tác của Hemingway về cuộc chiến giữa ông lão Santiago và con cá kiếm khổng lồ, biểu tượng cho sức mạnh tinh thần bất khuất của con người.' },
        { name: 'Những Người Khốn Khổ', desc: 'Bức tranh xã hội Pháp thế kỷ 19 qua cuộc đời Jean Valjean, câu chuyện vĩ đại về tình yêu thương, lòng nhân ái và sự cứu rỗi.' },
        { name: 'Trăm Năm Cô Đơn', desc: 'Sử thi về dòng họ Buendía và ngôi làng Macondo. Đỉnh cao của chủ nghĩa hiện thực huyền ảo từ Gabriel García Márquez.' },
        { name: 'Bố Già', desc: 'Tiểu thuyết tội phạm kinh điển của Mario Puzo, khắc họa thế giới ngầm Mafia Mỹ đầy quyền lực và những quy tắc khắc nghiệt của gia đình Corleone.' },
        { name: 'Gatsby Vĩ Đại', desc: 'Bức chân dung về Giấc mơ Mỹ phù hoa và bi kịch tình yêu của Jay Gatsby trong kỷ nguyên Jazz những năm 1920.' },
        { name: 'Đồi Gió Hú', desc: 'Câu chuyện tình yêu hoang dại, ám ảnh và đầy thù hận giữa Heathcliff và Catherine Earnshaw trên vùng đồng hoang Yorkshire.' },
        { name: 'Kiêu Hãnh Và Định Kiến', desc: 'Tác phẩm hài hước, lãng mạn của Jane Austen về tình yêu và hôn nhân, vượt qua lòng kiêu hãnh và định kiến để tìm thấy hạnh phúc.' },
        { name: 'Tội Ác Và Trừng Phạt', desc: 'Kiệt tác tâm lý của Dostoevsky về sự dằn vặt lương tâm của Raskolnikov sau khi phạm tội và hành trình tìm kiếm sự tha thứ.' },
        { name: 'Hai Số Phận', desc: 'Câu chuyện lôi cuốn về cuộc đời song song của hai người đàn ông sinh cùng ngày giờ nhưng khác biệt hoàn toàn về xuất thân và số phận.' }
    ],
    'Kinh tế & Quản trị': [
        { name: 'Đắc Nhân Tâm', desc: 'Cuốn sách gối đầu giường về nghệ thuật giao tiếp và thu phục lòng người. Học cách lắng nghe, khen ngợi và tạo thiện cảm.' },
        { name: 'Nghĩ Giàu Làm Giàu', desc: '13 nguyên tắc thành công được đúc kết từ những người giàu nhất nước Mỹ. Sách kinh điển về tư duy thịnh vượng.' },
        { name: 'Cha Giàu Cha Nghèo', desc: 'Thay đổi tư duy tài chính, phân biệt tài sản và tiêu sản, hướng dẫn cách bắt tiền làm việc cho mình.' },
        { name: 'Từ Tốt Đến Vĩ Đại', desc: 'Nghiên cứu của Jim Collins về cách các công ty bình thường vươn lên trở thành những đế chế vĩ đại và bền vững.' },
        { name: 'Chiến Tranh Tiền Tệ', desc: 'Vén màn bí mật về lịch sử tiền tệ và những âm mưu tài chính toàn cầu đứng sau các sự kiện lịch sử lớn.' },
        { name: 'Nhà Đầu Tư Thông Minh', desc: 'Sách giáo khoa về đầu tư giá trị của Benjamin Graham. Hướng dẫn tư duy đầu tư dài hạn và quản trị rủi ro.' },
        { name: 'Phi Lý Trí', desc: 'Dan Ariely khám phá những hành vi kinh tế phi lý trí của con người, giúp hiểu rõ hơn về tâm lý khách hàng và quyết định mua sắm.' },
        { name: 'Khởi Nghiệp Tinh Gọn', desc: 'Phương pháp khởi nghiệp hiện đại: xây dựng, đo lường, học hỏi. Giúp các startup giảm thiểu rủi ro và phát triển nhanh chóng.' },
        { name: 'Tỷ Phú Bán Giày', desc: 'Câu chuyện về Zappos và văn hóa doanh nghiệp độc đáo tập trung vào hạnh phúc khách hàng của Tony Hsieh.' },
        { name: 'Marketing Giỏi Phải Kiếm Được Tiền', desc: 'Sergio Zyman chia sẻ những nguyên tắc marketing thực chiến, tập trung vào hiệu quả doanh số thay vì chỉ làm thương hiệu sáo rỗng.' }
    ],
    'Tâm lý & Kỹ năng': [
        { name: 'Tuổi Trẻ Đáng Giá Bao Nhiêu', desc: 'Cuốn sách truyền cảm hứng cho giới trẻ về việc học, làm việc và đi. Khuyến khích sống hết mình và trân trọng tuổi trẻ.' },
        { name: 'Đời Thay Đổi Khi Chúng Ta Thay Đổi', desc: 'Andrew Matthews mang đến cái nhìn hài hước và tích cực về cuộc sống. Giúp bạn thay đổi thái độ để hạnh phúc hơn.' },
        { name: 'Sức Mạnh Của Thói Quen', desc: 'Giải mã cơ chế hoạt động của thói quen và cách thay đổi chúng để tạo ra những kết quả tích cực trong đời sống cá nhân và tổ chức.' },
        { name: 'Chú Chó Nhìn Thấy Gì', desc: 'Tuyển tập các bài viết sắc sảo của Malcolm Gladwell, lật lại những vấn đề quen thuộc dưới góc nhìn hoàn toàn mới lạ.' },
        { name: 'Tư Duy Nhanh Và Chậm', desc: 'Daniel Kahneman giải thích hai hệ thống tư duy chi phối nhận thức của chúng ta, giúp ra quyết định sáng suốt hơn.' },
        { name: 'Hạt Giống Tâm Hồn', desc: 'Những câu chuyện ngắn ý nghĩa nuôi dưỡng tâm hồn, mang lại niềm tin và nghị lực sống trong những lúc khó khăn.' },
        { name: 'Đánh Thức Con Người Phi Thường Trong Bạn', desc: 'Anthony Robbins hướng dẫn cách kiểm soát cảm xúc, cơ thể và tài chính để đánh thức tiềm năng to lớn bên trong.' },
        { name: 'Ngôn Ngữ Cơ Thể', desc: 'Khám phá bí mật giao tiếp không lời. Hiểu người khác nghĩ gì qua cử chỉ và ánh mắt để giao tiếp hiệu quả hơn.' },
        { name: 'Quẳng Gánh Lo Đi Và Vui Sống', desc: 'Dale Carnegie chia sẻ các phương pháp thực tế để giảm bớt lo âu, căng thẳng và tìm lại sự bình yên trong tâm trí.' },
        { name: 'Lối Sống Tối Giản Của Người Nhật', desc: 'Sasaki Fumio chia sẻ về lợi ích của việc vứt bỏ đồ đạc dư thừa để tìm thấy hạnh phúc và sự tự do đích thực.' }
    ],
    'Thiếu nhi': [
        { name: 'Dế Mèn Phiêu Lưu Ký', desc: 'Tác phẩm đồng thoại kinh điển của Tô Hoài về cuộc phiêu lưu của Dế Mèn. Bài học về tình bạn và lòng nhân ái.' },
        { name: 'Hoàng Tử Bé', desc: 'Câu chuyện ngụ ngôn triết học về một hoàng tử nhỏ đến từ hành tinh khác. Nhắc nhở người lớn về những điều giản dị nhưng quan trọng.' },
        { name: 'Kính Vạn Hoa', desc: 'Bộ truyện gắn liền với tuổi thơ của Nguyễn Nhật Ánh, kể về những trò nghịch ngợm và bài học đáng nhớ của Quý Ròm, Tiểu Long, Hạnh.' },
        { name: 'Cho Tôi Xin Một Vé Đi Tuổi Thơ', desc: 'Nguyễn Nhật Ánh mời người đọc lên chuyến tàu quay về quá khứ để sống lại những ký ức tuổi thơ hồn nhiên, trong trẻo.' },
        { name: 'Harry Potter và Hòn Đá Phù Thủy', desc: 'Tập đầu tiên trong bộ truyện lừng danh về cậu bé phù thủy Harry Potter và thế giới phép thuật đầy màu sắc.' },
        { name: 'Chuyện Con Mèo Dạy Hải Âu Bay', desc: 'Câu chuyện cảm động về lời hứa của chú mèo Zorba nuôi dưỡng chú chim hải âu non. Bài học về tình yêu thương không biên giới.' },
        { name: 'Pippi Tất Dài', desc: 'Cô bé Pippi tinh nghịch, khỏe mạnh và độc lập với những trò đùa vui nhộn đã chinh phục hàng triệu trẻ em thế giới.' },
        { name: 'Không Gia Đình', desc: 'Cuộc đời phiêu bạt của cậu bé Remi và gánh xiếc rong. Ca ngợi lao động, tình người và ý chí vươn lên.' },
        { name: 'Totto-chan Bên Cửa Sổ', desc: 'Hồi ký về ngôi trường Tomoe đặc biệt và phương pháp giáo dục tuyệt vời của thầy hiệu trưởng Kobayashi.' },
        { name: 'Alice Ở Xứ Sở Diệu Kỳ', desc: 'Cuộc phiêu lưu của Alice vào hang thỏ, lạc vào thế giới kỳ ảo với những nhân vật kỳ quặc và tình huống phi lý thú vị.' }
    ],
    'Trinh thám': [
        { name: 'Sherlock Holmes Toàn Tập', desc: 'Tuyển tập những vụ án lừng danh của thám tử tài ba Sherlock Holmes và bác sĩ Watson. Đỉnh cao của tư duy logic và suy luận.' },
        { name: 'Mười Người Da Đen Nhỏ', desc: 'Kiệt tác của Agatha Christie. Mười người lạ mặt bị mời đến một hòn đảo và lần lượt bị sát hại theo bài đồng dao quái gở.' },
        { name: 'Sự Im Lặng Của Bầy Cừu', desc: 'Cuộc đối đầu tâm lý nghẹt thở giữa đặc vụ FBI Clarice Starling và kẻ ăn thịt người thông minh Hannibal Lecter.' },
        { name: 'Phía Sau Nghi Can X', desc: 'Tiểu thuyết trinh thám Nhật Bản xuất sắc. Một vụ án mạng được che giấu bằng một kế hoạch hoàn hảo của thiên tài toán học.' },
        { name: 'Mật Mã Da Vinci', desc: 'Dan Brown dẫn dắt người đọc vào cuộc truy tìm Chén Thánh với những bí mật tôn giáo và lịch sử gây tranh cãi.' },
        { name: 'Cô Gái Có Hình Xăm Rồng', desc: 'Sự kết hợp giữa nhà báo Mikael Blomkvist và hacker kỳ quặc Lisbeth Salander trong việc điều tra vụ mất tích bí ẩn.' },
        { name: 'Hỏa Ngục', desc: 'Giáo sư Robert Langdon chạy đua với thời gian để ngăn chặn một âm mưu phát tán virus diệt chủng được giấu trong tác phẩm của Dante.' },
        { name: 'Kẻ Nhắc Tuồng', desc: 'Một vụ án bắt cóc hàng loạt trẻ em đầy ám ảnh. Cuốn sách khai thác sâu vào tâm lý tội phạm và cái ác tiềm ẩn.' },
        { name: 'Bạch Dạ Hành', desc: 'Tác phẩm u tối và day dứt của Higashino Keigo. Hai đứa trẻ lớn lên dưới bóng đen của tội ác quá khứ, không bao giờ được đi dưới ánh mặt trời.' },
        { name: 'Kỳ Án Ánh Trăng', desc: 'Trinh thám kinh dị Trung Quốc. Những cái chết bí ẩn liên quan đến một bài thơ và lời nguyền tại ký túc xá đại học.' }
    ],
    'Tiểu thuyết Lãng mạn': [
        { name: 'Rừng Na Uy', desc: 'Câu chuyện u buồn và ám ảnh của Murakami về tuổi trẻ, tình yêu và sự mất mát trong bối cảnh nước Nhật những năm 60.' },
        { name: 'Mắt Biếc', desc: 'Mối tình đơn phương da diết của Ngạn dành cho Hà Lan. Một câu chuyện tình buồn và đẹp đặc trưng của Nguyễn Nhật Ánh.' },
        { name: 'Cô Gái Năm Ấy Chúng Ta Cùng Theo Đuổi', desc: 'Hồi ức thanh xuân ngọt ngào và tiếc nuối về mối tình đầu của nhóm nam sinh dành cho cô bạn lớp trưởng ưu tú.' },
        { name: 'Xin Lỗi Em Chỉ Là Con Đĩ', desc: 'Câu chuyện gây chấn động về tình yêu chân thành và bi kịch của Hạ Âu, một cô gái mang danh phận thấp hèn.' },
        { name: 'Me Before You', desc: 'Tình yêu nảy nở giữa cô gái quê mùa Louisa và chàng trai liệt tứ chi Will Traynor. Câu chuyện về sự lựa chọn và phẩm giá.' },
        { name: 'Lỗi Tại Các Vì Sao', desc: 'Chuyện tình của hai bạn trẻ mắc bệnh ung thư. Hài hước, đau đớn nhưng tràn đầy hy vọng và ý nghĩa cuộc sống.' },
        { name: 'Gọi Em Bằng Tên Anh', desc: 'Mùa hè nước Ý rực rỡ và mối tình đam mỹ nồng nàn, day dứt giữa Elio và Oliver. Khám phá khao khát và bản ngã.' },
        { name: 'Love Story', desc: 'Câu chuyện tình yêu kinh điển lấy đi nước mắt của hàng triệu độc giả. "Yêu là không bao giờ phải nói lời hối tiếc".' },
        { name: 'Ngàn Mặt Trời Rực Rỡ', desc: 'Tình bạn và tình yêu thương của hai người phụ nữ Afghanistan giữa bom đạn chiến tranh và định kiến xã hội khắc nghiệt.' },
        { name: 'Cuốn Theo Chiều Gió', desc: 'Mối tình kinh điển giữa Scarlett O\'Hara và Rhett Butler trong bối cảnh Nội chiến Mỹ. Bài ca về nghị lực sống mạnh mẽ.' }
    ],
    'Lịch sử': [
        { name: 'Sapiens: Lược Sử Loài Người', desc: 'Yuval Noah Harari tóm lược lịch sử nhân loại từ thời đồ đá đến hiện đại, giải mã lý do Homo Sapiens thống trị thế giới.' },
        { name: 'Đại Việt Sử Ký Toàn Thư', desc: 'Bộ chính sử lớn nhất và quan trọng nhất của Việt Nam, ghi chép lịch sử từ thời Hồng Bàng đến nhà Hậu Lê.' },
        { name: 'Súng, Vi Trùng Và Thép', desc: 'Giải thích sự bất bình đẳng giữa các nền văn minh. Tại sao phương Tây lại chinh phục được thế giới?' },
        { name: 'Tâm Hồn Cao Thượng', desc: 'Những câu chuyện lịch sử và đạo đức cảm động dưới dạng nhật ký của cậu bé En-Ri-Cô người Ý.' },
        { name: 'Búp Sen Xanh', desc: 'Tiểu thuyết lịch sử về thời niên thiếu của Bác Hồ. Khắc họa hình ảnh người thanh niên yêu nước Nguyễn Tất Thành.' },
        { name: 'Chiến Tranh Và Hòa Bình', desc: 'Đại sử thi của Lev Tolstoy về cuộc chiến tranh Vệ quốc của Nga chống lại Napoleon.' },
        { name: 'Nguồn Gốc Của Các Loài', desc: 'Tác phẩm khoa học nền tảng của Darwin về thuyết tiến hóa và chọn lọc tự nhiên.' },
        { name: 'Văn Minh Phương Tây', desc: 'Khái quát quá trình hình thành và phát triển của nền văn minh phương Tây từ Hy Lạp cổ đại đến hiện đại.' },
        { name: 'Lịch Sử Thế Giới', desc: 'Bức tranh toàn cảnh về các sự kiện quan trọng, các nền văn minh và nhân vật đã định hình nên thế giới ngày nay.' },
        { name: 'Biên Niên Sử Narnia', desc: 'Tuy là giả tưởng nhưng chứa đựng nhiều ẩn dụ về lịch sử và tôn giáo. Cuộc chiến giữa thiện và ác tại vùng đất Narnia.' }
    ],
    'Khoa học Viễn tưởng': [
        { name: 'Dune - Xứ Cát', desc: 'Kiệt tác sci-fi về hành tinh sa mạc Arrakis, nơi duy nhất có hương dược. Cuộc chiến chính trị và tôn giáo giữa các gia tộc.' },
        { name: 'Tam Thể (The Three-Body Problem)', desc: 'Tiểu thuyết cứng của Lưu Từ Hân về cuộc tiếp xúc đầu tiên của nhân loại với nền văn minh ngoài hành tinh Trisolaris.' },
        { name: 'Người Về Từ Sao Hỏa', desc: 'Cuộc chiến sinh tồn của phi hành gia Mark Watney bị bỏ lại một mình trên Sao Hỏa. Đề cao trí tuệ và tinh thần lạc quan.' },
        { name: 'Chúa Nhẫn', desc: 'Tuyệt phẩm fantasy xây dựng một thế giới Trung Địa hoàn chỉnh. Cuộc hành trình tiêu diệt Nhẫn Chúa đầy bi tráng.' },
        { name: 'Trò Chơi Vương Quyền', desc: 'Cuộc đấu tranh giành Ngai Sắt tại lục địa Westeros. Âm mưu chính trị, rồng và phép thuật.' },
        { name: 'Fahrenheit 451', desc: 'Thế giới tương lai nơi sách bị cấm và bị đốt. Lời cảnh tỉnh về sự kiểm duyệt và sự xuống cấp của văn hóa đọc.' },
        { name: '1984', desc: 'Tiểu thuyết phản utopia ám ảnh về một xã hội bị giám sát toàn diện bởi "Anh Cả".' },
        { name: 'Cỗ Máy Thời Gian', desc: 'Tác phẩm tiên phong của H.G. Wells về du hành thời gian, khám phá tương lai xa xôi của nhân loại.' },
        { name: 'Hai Vạn Dặm Dưới Đáy Biển', desc: 'Cuộc phiêu lưu của thuyền trưởng Nemo trên tàu ngầm Nautilus khám phá đại dương bí ẩn.' },
        { name: 'Ready Player One', desc: 'Thế giới ảo OASIS và cuộc săn tìm kho báu trứng Phục sinh. Tôn vinh văn hóa Pop thập niên 80.' }
    ],
    'Manga - Comic': [
        { name: 'One Piece - Tập 1', desc: 'Hành trình của Luffy Mũ Rơm ra khơi tìm kiếm kho báu One Piece để trở thành Vua Hải Tặc. Truyện tranh bán chạy nhất thế giới.' },
        { name: 'Naruto - Tập 1', desc: 'Câu chuyện về cậu bé Ninja Naruto ồn ào và khát khao được công nhận. Hành trình trở thành Hokage vĩ đại.' },
        { name: 'Dragon Ball - Tập 1', desc: 'Goku và những người bạn trên hành trình tìm kiếm 7 viên ngọc rồng. Tượng đài của dòng truyện Shonen.' },
        { name: 'Thám Tử Lừng Danh Conan - Tập 1', desc: 'Shinichi Kudo bị teo nhỏ thành Conan, phá giải những vụ án hóc búa trong khi truy tìm Tổ chức Áo Đen.' },
        { name: 'Doraemon - Truyện Ngắn', desc: 'Mèo máy Doraemon đến từ tương lai với túi bảo bối thần kỳ giúp đỡ cậu bé Nobita hậu đậu.' },
        { name: 'Black Jack - Bác Sĩ Quái Dị', desc: 'Bác sĩ phẫu thuật thiên tài Black Jack với những ca mổ thần kỳ và câu chuyện nhân văn về y đức.' },
        { name: 'Slam Dunk', desc: 'Hanamichi Sakuragi và đội bóng rổ trường Shohoku. Truyện thể thao truyền cảm hứng mạnh mẽ về đam mê.' },
        { name: 'Death Note', desc: 'Light Yagami nhặt được cuốn sổ tử thần và muốn trừng phạt tội phạm. Cuộc đấu trí căng thẳng với thám tử L.' },
        { name: 'Attack on Titan', desc: 'Nhân loại sống trong các bức tường để trốn tránh những gã khổng lồ ăn thịt người. Bí mật đen tối dần được hé lộ.' },
        { name: 'Marvel Encyclopedia', desc: 'Bách khoa toàn thư về các siêu anh hùng và ác nhân trong vũ trụ Marvel. Từ Spider-Man, Iron Man đến Avengers.' }
    ],
    'Sống đẹp': [
        { name: 'Chicken Soup for the Soul', desc: 'Tuyển tập những câu chuyện nhỏ sưởi ấm trái tim, mang lại niềm tin và tình yêu cuộc sống.' },
        { name: 'Hạnh Phúc Tại Tâm', desc: 'Osho chia sẻ về bản chất của hạnh phúc, thiền định và sự tỉnh thức trong đời sống hiện đại.' },
        { name: 'Muôn Kiếp Nhân Sinh', desc: 'Nguyên Phong kể về luật nhân quả và luân hồi qua những câu chuyện tiền kiếp kỳ lạ.' },
        { name: 'Hiểu Về Trái Tim', desc: 'Thiền sư Minh Niệm lý giải những cảm xúc đời thường: Khổ đau, Hạnh phúc, Tình yêu, Ghen tuông... để giúp ta sống an lạc.' },
        { name: 'Bước Chậm Lại Giữa Thế Gian Vội Vã', desc: 'Đại đức Haemin mang đến những lời khuyên thông thái để giữ tâm bình an giữa cuộc sống bận rộn.' },
        { name: 'Nhà Lãnh Đạo Không Chức Danh', desc: 'Robin Sharma khẳng định: Bạn không cần chức danh để trở thành lãnh đạo. Hãy lãnh đạo chính mình và công việc của mình.' },
        { name: 'Dám Bị Ghét', desc: 'Đối thoại triết học về tâm lý học Adler. Dám sống theo cách của mình, không bị ràng buộc bởi kỳ vọng của người khác.' },
        { name: 'Lagom - Vừa Đủ Là Hạnh Phúc', desc: 'Triết lý sống cân bằng của người Thụy Điển. Không quá ít, không quá nhiều, chỉ cần vừa đủ.' },
        { name: 'Ikigai - Đi Tìm Lý Do Thức Dậy', desc: 'Bí quyết sống thọ và hạnh phúc của người Nhật thông qua việc tìm ra mục đích sống (Ikigai) của mình.' },
        { name: 'Tối Giản', desc: 'Hướng dẫn lối sống tối giản từ vật chất đến tư duy để tập trung vào những điều thực sự quan trọng.' }
    ]
};

const REVIEW_COMMENTS = [
    'Sách in đẹp, giấy xốp nhẹ, cầm rất thích tay.',
    'Giao hàng nhanh, đóng gói cẩn thận 3 lớp chống sốc.',
    'Nội dung sách quá hay, đọc một mạch không dứt ra được.',
    'Sách bị móp nhẹ ở góc do vận chuyển, nhưng nội dung bù lại.',
    'Mua tặng bạn mà bạn khen nức nở. Rất hài lòng.',
    'Sách chính hãng, tem mác đầy đủ. Ủng hộ shop dài dài.',
    'Bản dịch khá mượt, giữ được văn phong gốc.',
    'Giá hơi cao nhưng chất lượng tương xứng.',
    'Đã đọc đi đọc lại 2 lần, mỗi lần lại thấm thêm một chút.',
    'Tuyệt vời! Một cuốn sách nên có trong tủ sách mọi gia đình.'
];

// User credentials holder
const USER_CREDENTIALS = [];
const ADMIN_CREDENTIALS = [];

async function seedData() {
    console.log('📚 BẮT ĐẦU NẠP DỮ LIỆU SÁCH MẪU (DYNAMODB VERSION)...\n');

    try {

        // -----------------------------------------------------
        // 1. ADMIN
        console.log('👑 Kiểm tra Admin...');
        const adminEmail = 'admin@bookstore.com';
        let admin;

        try {
            // Thử tìm user (Nếu là DynamoDB thì service có thể throw error nếu ko tìm thấy hoặc return null)
            // Lưu ý: UserService dùng User Model, có thể switch repo.
            // Ta sẽ thử tạo, nếu lỗi duplicate thì bỏ qua.

            // Tuy nhiên, để an toàn và tránh duplicate ID trong DynamoDB (nếu dùng UUID),
            // tốt nhất là nên query bằng email (Scan hoặc GSI).
            // DynamoUserRepository có findByEmail ko?
            // Check service: userService.getUserByEmail(email) (cần implement nếu chưa có, hoặc dùng logic create catch error)

            // Cách nhanh nhất cho Seed script: Cứ gọi Create, nếu lỗi Duplicate thì bỏ qua, sau đó Login để lấy ID
            // Nhưng ở đây ta đang chạy script backend, không login qua API.

            // Em sẽ giả định logic: Create -> Catch Error -> Login/Find

            admin = await userService.createUser({
                name: 'Chủ Tiệm Sách',
                email: adminEmail,
                password: 'Admin@123456',
                role: 'admin'
            });
            console.log('✅ Đã tạo mới Admin');
        } catch (e) {
            // Nếu lỗi duplicate
            console.log('ℹ️  Admin đã tồn tại (hoặc lỗi khác), đang lấy thông tin...');
            // Cần lấy ID của admin. 
            // Trong DynamoDB, ta có thể dùng GSI email để tìm
            // Hoặc đơn giản: scan
            const repo = userService._getRepository(); // Hack acces to repo
            if (repo.findByEmail) {
                admin = await repo.findByEmail(adminEmail);
            } else {
                // Fallback: Scan (Slow but ok for seed)
                // DynamoDB scan
                // Check if repo has findOne logic
                if (repo.findAll) {
                    const allUsers = await repo.findAll();
                    admin = allUsers.find(u => u.email === adminEmail);
                }
            }
        }

        if (!admin) {
            console.log('⚠️ Không lấy được Admin ID. Dừng script.');
            // Nếu vẫn không có admin, force create với ID cố định? Không nên.
            // Tạm thời dừng nếu không có admin
            process.exit(1);
        }

        ADMIN_CREDENTIALS.push({ email: adminEmail, password: 'Admin@123456' });

        // -----------------------------------------------------
        // 2. USERS
        console.log('\n👥 Kiểm tra Khách hàng...');
        const users = [];
        for (let i = 1; i <= 5; i++) {
            const email = `user${i}@example.com`;
            let user;
            try {
                user = await userService.createUser({
                    name: `Bạn Đọc ${i}`,
                    email: email,
                    password: `User${i}@123`,
                    role: 'user'
                });
                console.log(`✅ Đã tạo: ${email}`);
            } catch (e) {
                // Find existing
                const repo = userService._getRepository();
                if (repo.findByEmail) {
                    user = await repo.findByEmail(email);
                } else if (repo.findAll) {
                    const all = await repo.findAll();
                    user = all.find(u => u.email === email);
                }
            }

            if (user) users.push(user);
            USER_CREDENTIALS.push({ email: email, password: `User${i}@123` });
        }

        // -----------------------------------------------------
        // 3. CATEGORIES & PRODUCTS
        console.log('\n📦 Đang nhập 100 đầu sách thật vào kho...');
        const products = [];
        let bookCount = 0;

        for (const [catName, booksList] of Object.entries(BOOKS_DATA)) {

            const catDescription = CATEGORIES.find(c => c.name === catName)?.description || 'Sách hay tuyển chọn';

            const category = await categoryService.createCategory({
                name: catName,
                description: catDescription,
                images: [{ public_id: `cat_${Date.now()}_${Math.random()}`, url: 'https://via.placeholder.com/300x200' }]
            });
            console.log(`\n📁 Danh mục: ${catName}`);

            for (const book of booksList) {
                const price = Math.floor(Math.random() * 300000) + 60000;

                const product = await productService.createProduct({
                    name: book.name,
                    price: price,
                    description: book.desc + '\n\nSách bản quyền, in ấn chất lượng cao. Giấy định lượng tốt, chống lóa. Phù hợp cho mọi đối tượng độc giả.',
                    category: catName,
                    seller: 'Nhà Sách Trí Tuệ',
                    stock: Math.floor(Math.random() * 50) + 10,
                    ratings: 0,
                    numOfReviews: 0,
                    images: [{ public_id: `book_${Date.now()}_${Math.random()}`, url: 'https://via.placeholder.com/400x600' }]
                }, admin.id || admin._id || admin.userId); // Support various ID formats

                products.push(product);
                bookCount++;
            }
            console.log(`   ✅ Đã nhập 10 sách.`);
        }

        // -----------------------------------------------------
        // 4. ORDERS
        console.log('\n🛒 Tạo 100 đơn hàng mẫu...');
        let orderCount = 0;
        for (let u = 0; u < users.length; u++) { // 5 users
            const user = users[u];
            const userId = user.id || user._id || user.userId;

            for (let i = 0; i < 20; i++) {
                const prod = products[Math.floor(Math.random() * products.length)];
                const qty = Math.floor(Math.random() * 2) + 1;
                const prodId = prod.id || prod._id || prod.productId;

                await orderService.createOrder({
                    shippingInfo: {
                        address: `${Math.floor(Math.random() * 100)} Nguyễn Thị Minh Khai`,
                        city: 'Hồ Chí Minh',
                        phoneNo: '0987654321',
                        postalCode: '70000',
                        country: 'Vietnam'
                    },
                    orderItems: [{
                        name: prod.name,
                        quantity: qty,
                        image: prod.images && prod.images[0] ? prod.images[0].url : 'https://via.placeholder.com/150',
                        price: prod.price,
                        product: prodId
                    }],
                    paymentInfo: { id: `pay_${Date.now()}_${orderCount}`, status: 'succeeded' },
                    itemsPrice: prod.price * qty,
                    taxPrice: 0,
                    shippingPrice: 15000,
                    totalPrice: (prod.price * qty) + 15000,
                    orderStatus: 'Delivered'
                }, userId);
                orderCount++;
            }
        }
        console.log(`✅ Đã tạo ${orderCount} đơn hàng.`);

        // -----------------------------------------------------
        // 5. REVIEWS
        console.log('\n⭐ Tạo 200 đánh giá...');
        let reviewCount = 0;
        for (let i = 0; i < 200; i++) {
            const user = users[Math.floor(Math.random() * users.length)];
            const prod = products[Math.floor(Math.random() * products.length)];
            const userId = user.id || user._id || user.userId;
            const prodId = prod.id || prod._id || prod.productId;

            try {
                await productService.createReview(prodId, {
                    user: userId,
                    name: user.name,
                    rating: Math.floor(Math.random() * 2) + 4, // 4-5 sao
                    comment: REVIEW_COMMENTS[Math.floor(Math.random() * REVIEW_COMMENTS.length)]
                });
                reviewCount++;
            } catch (e) { }
        }
        console.log(`✅ Đã thêm ${reviewCount} đánh giá.`);

        console.log('\n🔥 XONG! DỮ LIỆU ĐÃ SẴN SÀNG CHO CHATBOT TRAINING.');
        console.log('Total Books: ' + bookCount);
        process.exit(0);

    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
}

seedData();
