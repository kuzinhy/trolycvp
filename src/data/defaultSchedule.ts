import { Meeting, Event, Task } from '../constants';

export const DEFAULT_MEETINGS: Meeting[] = [
  {
    id: 'm-aug-01',
    name: 'Họp Giao ban Thường trực Đảng ủy đầu tuần',
    date: '2026-08-10',
    time: '08:00',
    location: 'Phòng họp Ban Thường vụ',
    chairperson: 'Đ/c Bí thư Đảng ủy',
    participants: 'Thường trực Đảng ủy, Lãnh đạo UBND, Chánh Văn phòng Đảng ủy',
    description: 'Đánh giá công tác lãnh đạo tuần qua và định hướng các nhiệm vụ trọng tâm tuần 33.',
    priority: 'high'
  },
  {
    id: 'm-aug-02',
    name: 'Họp Khối Tuyên giáo - Dân vận về nâng cao chất lượng sinh hoạt Chi bộ',
    date: '2026-08-11',
    time: '08:30',
    location: 'Hội trường B',
    chairperson: 'Đ/c Phó Bí thư Thường trực',
    participants: 'Ban Tuyên giáo, Khối Vận, Ủy ban MTTQ và các đoàn thể',
    description: 'Thảo luận giải pháp nắm bắt tình hình tư tưởng cán bộ, đảng viên và nhân dân trên địa bàn.',
    priority: 'medium'
  },
  {
    id: 'm-aug-03',
    name: 'Hội nghị thẩm định hồ sơ kết nạp Đảng viên mới đợt 2/9',
    date: '2026-08-12',
    time: '14:00',
    location: 'Phòng họp số 1',
    chairperson: 'Đ/c Trưởng Ban Tổ chức Đảng ủy',
    participants: 'Ban Tổ chức, Bí thư các Chi bộ có quần chúng ưu tú',
    description: 'Thẩm định tiêu chuẩn chính trị và quá trình phấn đấu của 05 quần chúng ưu tú.',
    priority: 'high'
  },
  {
    id: 'm-aug-04',
    name: 'Họp Thường trực Đảng ủy nghe Văn phòng báo cáo chuẩn bị Hội nghị BCH',
    date: '2026-08-13',
    time: '08:00',
    location: 'Phòng họp Thường trực Đảng ủy',
    chairperson: 'Đ/c Bí thư Đảng ủy',
    participants: 'Thường trực Đảng ủy, Chánh Văn phòng Nguyễn Minh Huy, các Phó VP',
    description: 'Rà soát dự thảo các báo cáo, tờ trình và công tác khánh tiết chuẩn bị Hội nghị Ban Chấp hành Đảng bộ.',
    priority: 'high'
  },
  {
    id: 'm-aug-05',
    name: 'Họp rà soát quy hoạch cán bộ lãnh đạo, quản lý nhiệm kỳ 2025 - 2030',
    date: '2026-08-13',
    time: '14:30',
    location: 'Phòng họp Ban Thường vụ',
    chairperson: 'Thường trực Đảng ủy',
    participants: 'Ban Thường vụ Đảng ủy, Ban Tổ chức, Văn phòng',
    description: 'Xem xét, bổ sung quy hoạch cấp ủy và các chức danh lãnh đạo chủ chốt cơ sở.',
    priority: 'high'
  },
  {
    id: 'm-aug-06',
    name: 'Hội nghị Giao ban Bí thư 12 Chi bộ trực thuộc tháng 8/2026',
    date: '2026-08-14',
    time: '08:30',
    location: 'Hội trường lớn Đảng ủy',
    chairperson: 'Thường trực Đảng ủy',
    participants: 'BCH Đảng bộ, Bí thư & Phó Bí thư 12 Chi bộ',
    description: 'Đánh giá tiến độ thực hiện Nghị quyết Đảng bộ và triển khai nhiệm vụ tháng 9.',
    priority: 'high'
  },
  {
    id: 'm-aug-07',
    name: 'Họp Ban Chỉ đạo 35 Đảng ủy về bảo vệ nền tảng tư tưởng trên mạng xã hội',
    date: '2026-08-14',
    time: '15:00',
    location: 'Phòng họp số 2',
    chairperson: 'Đ/c Trưởng Ban Tuyên giáo',
    participants: 'Thành viên Ban Chỉ đạo 35, Tổ Thư ký giúp việc',
    description: 'Tăng cường nắm tình hình dư luận xã hội và đấu tranh phản bác các quan điểm sai trái, thù địch.',
    priority: 'medium'
  },
  {
    id: 'm-aug-08',
    name: 'Họp Giao ban Thường trực Đảng ủy tuần 34',
    date: '2026-08-17',
    time: '08:00',
    location: 'Phòng họp Thường trực',
    chairperson: 'Đ/c Bí thư Đảng ủy',
    participants: 'Thường trực Đảng ủy, Văn phòng, các Ban Xây dựng Đảng',
    description: 'Chỉ đạo các nhiệm vụ đột xuất và triển khai kế hoạch công tác tuần.',
    priority: 'high'
  },
  {
    id: 'm-aug-09',
    name: 'Kỳ họp Ủy ban Kiểm tra Đảng ủy định kỳ tháng 8',
    date: '2026-08-18',
    time: '09:00',
    location: 'Phòng họp UBKT',
    chairperson: 'Đ/c Chủ nhiệm UBKT Đảng ủy',
    participants: 'Các Ủy viên UBKT Đảng ủy',
    description: 'Xem xét kết quả kiểm tra khi có dấu hiệu vi phạm và giám sát thường xuyên chuyên đề.',
    priority: 'high'
  },
  {
    id: 'm-aug-10',
    name: 'Hội nghị Ban Chấp hành Đảng bộ mở rộng đánh giá tình hình tháng 8/2026',
    date: '2026-08-21',
    time: '08:00',
    location: 'Hội trường lớn Đảng ủy',
    chairperson: 'Ban Chấp hành Đảng bộ',
    participants: 'Toàn thể Đảng ủy viên, Thường trực HĐND, UBND, Bí thư các Chi bộ',
    description: 'Hội nghị định kỳ đánh giá công tác xây dựng Đảng, phát triển kinh tế - xã hội, quốc phòng - an ninh.',
    priority: 'high'
  },
  {
    id: 'm-aug-11',
    name: 'Lễ trao tặng Huy hiệu Đảng đợt 02/9/2026 cho Đảng viên lão thành',
    date: '2026-08-25',
    time: '08:30',
    location: 'Hội trường lớn Đảng ủy',
    chairperson: 'Đ/c Bí thư Đảng ủy',
    participants: 'Các đồng chí được trao tặng Huy hiệu Đảng, đại diện gia đình và cấp ủy',
    description: 'Tổ chức trang trọng Lễ trao tặng Huy hiệu 30, 40, 45, 50, 55, 60 năm tuổi Đảng.',
    priority: 'high'
  },
  {
    id: 'm-aug-12',
    name: 'Họp phân công lịch trực sẵn sàng chiến đấu và phục vụ Lễ Quốc khánh 2/9',
    date: '2026-08-28',
    time: '09:00',
    location: 'Phòng họp Thường trực',
    chairperson: 'Chánh Văn phòng Nguyễn Minh Huy',
    participants: 'Lãnh đạo Ban Chỉ huy Quân sự, Công an, cán bộ công chức Văn phòng',
    description: 'Chốt danh sách ca trực chỉ huy, trực ban tác chiến trong dịp nghỉ lễ 2/9.',
    priority: 'high'
  }
];

export const DEFAULT_EVENTS: Event[] = [
  {
    id: 'e-aug-01',
    name: 'Hội nghị trực tuyến toàn quốc quán triệt văn bản mới của Trung ương về công tác Đảng',
    date: '2026-08-13',
    time: '08:00',
    location: 'Phòng họp trực tuyến Đảng ủy',
    description: 'Điểm cầu truyền hình trực tiếp kết nối với Hội trường Bộ Chính trị - Ban Bí thư.',
    category: 'Chính trị - Hội nghị',
    type: 'meeting'
  },
  {
    id: 'e-aug-02',
    name: 'Kỷ niệm 81 năm Ngày truyền thống Công an nhân dân Việt Nam (19/8/1945 - 19/8/2026)',
    date: '2026-08-19',
    time: '08:00',
    location: 'Hội trường Công an Phường',
    description: 'Ngày hội Toàn dân bảo vệ an ninh Tổ quốc và biểu dương các tập thể, cá nhân điển hình tiên tiến.',
    category: 'Kỷ niệm - Lễ tiết',
    type: 'anniversary'
  },
  {
    id: 'e-aug-03',
    name: 'Kỷ niệm 81 năm Cách mạng Tháng Tám thành công (19/8/1945 - 19/8/2026)',
    date: '2026-08-19',
    time: '07:30',
    location: 'Đài tưởng niệm Liệt sĩ',
    description: 'Lễ dâng hương, dâng hoa tưởng niệm các anh hùng liệt sĩ.',
    category: 'Kỷ niệm lịch sử',
    type: 'anniversary'
  },
  {
    id: 'e-aug-04',
    name: 'Kỷ niệm 81 năm Ngày Quốc khánh Nước CHXHCN Việt Nam (02/9/1945 - 02/9/2026)',
    date: '2026-09-02',
    time: '07:00',
    location: 'Trụ sở Đảng ủy - HĐND - UBND Phường',
    description: 'Tết Độc lập, treo cờ Tổ quốc và thực hiện nghiêm chế độ trực sẵn sàng chiến đấu.',
    category: 'Lễ Quốc gia',
    type: 'holiday'
  },
  {
    id: 'e-aug-05',
    name: 'Ngày toàn dân đưa trẻ đến trường - Khai giảng năm học mới 2026 - 2027',
    date: '2026-09-05',
    time: '07:30',
    location: 'Các trường học trên địa bàn Phường',
    description: 'Lãnh đạo Đảng ủy, HĐND, UBND đến dự và chúc mừng thầy cô, học sinh.',
    category: 'Giáo dục - Sự kiện',
    type: 'other'
  }
];

export const DEFAULT_TASKS_DATA: Task[] = [
  {
    id: 'task-party-01',
    title: 'Rà soát, chuẩn bị hồ sơ nhân sự phục vụ quy hoạch cán bộ nhiệm kỳ 2025 - 2030',
    description: 'Thẩm định tiêu chuẩn chính trị, quá trình công tác của các đồng chí trong diện quy hoạch cấp ủy và chức danh lãnh đạo.',
    priority: 'high',
    status: 'In Progress',
    category: 'Tổ chức & Cán bộ',
    deadline: '2026-08-20',
    time: '17:00',
    progress: 65,
    createdAt: Date.now() - 86400000 * 5,
    isImportant: true,
    assignee: 'Nguyễn Minh Huy'
  },
  {
    id: 'task-party-02',
    title: 'Tổng hợp báo cáo công tác xây dựng Đảng và hệ thống chính trị Quý 3/2026',
    description: 'Thu thập số liệu từ 12 chi bộ trực thuộc, đánh giá kết quả thực hiện các chỉ tiêu phát triển Đảng và công tác dân vận.',
    priority: 'high',
    status: 'In Progress',
    category: 'Báo cáo & Tổng hợp',
    deadline: '2026-08-25',
    time: '16:30',
    progress: 50,
    createdAt: Date.now() - 86400000 * 4,
    isImportant: true,
    assignee: 'Lê Thị Kiều Oanh'
  },
  {
    id: 'task-party-03',
    title: 'Kiểm tra tiến độ thực hiện Kết luận của Thường trực Đảng ủy tháng 8/2026',
    description: 'Đôn đốc các ban ngành, chi bộ trực thuộc báo cáo kết quả các đầu việc tồn đọng và giải trình tiến độ.',
    priority: 'high',
    status: 'In Progress',
    category: 'Kiểm tra & Giám sát',
    deadline: '2026-08-18',
    time: '17:00',
    progress: 80,
    createdAt: Date.now() - 86400000 * 6,
    isImportant: true,
    assignee: 'Trần Quốc Bảo'
  },
  {
    id: 'task-party-04',
    title: 'Hoàn thiện dự thảo Nghị quyết chuyên đề về Chuyển đổi số trong sinh hoạt Chi bộ',
    description: 'Xây dựng khung tiêu chí ứng dụng phần mềm Sổ tay Đảng viên điện tử tại các Chi bộ khu phố.',
    priority: 'high',
    status: 'In Progress',
    category: 'Văn kiện & Nghị quyết',
    deadline: '2026-08-28',
    time: '17:00',
    progress: 40,
    createdAt: Date.now() - 86400000 * 2,
    assignee: 'Nguyễn Minh Huy'
  },
  {
    id: 'task-party-05',
    title: 'Thẩm tra lý lịch và hoàn thiện hồ sơ kết nạp 05 quần chúng ưu tú đợt 2/9',
    description: 'Phối hợp với Chi bộ khu phố và cấp ủy nơi cư trú hoàn tất biên bản xác minh 3 đời đúng quy định Điều lệ Đảng.',
    priority: 'high',
    status: 'In Progress',
    category: 'Phát triển Đảng',
    deadline: '2026-08-19',
    time: '11:30',
    progress: 75,
    createdAt: Date.now() - 86400000 * 7,
    isImportant: true,
    assignee: 'Lê Thị Kiều Oanh'
  },
  {
    id: 'task-party-06',
    title: 'Chuẩn bị tài liệu, khánh tiết và maket phục vụ Hội nghị Ban Chấp hành Đảng bộ định kỳ',
    description: 'In ấn tài liệu hội nghị, gửi giấy mời đại biểu, bố trí phòng họp trực tuyến và kiểm tra đường truyền tác chiến.',
    priority: 'medium',
    status: 'Pending',
    category: 'Hội nghị & Sự kiện',
    deadline: '2026-08-22',
    time: '17:00',
    progress: 20,
    createdAt: Date.now() - 86400000 * 1,
    assignee: 'Nguyễn Thị Thu Phương'
  },
  {
    id: 'task-party-07',
    title: 'Lập lịch trực sẵn sàng chiến đấu và bảo vệ an ninh trật tự Lễ Quốc khánh 2/9',
    description: 'Căn cứ vào chủ trương từ trung ương, địa phương để lập lịch trực bảo đảm 24/24 sẵn sàng xử lý tình huống.',
    priority: 'high',
    status: 'In Progress',
    category: 'Lịch trực & Quốc phòng',
    deadline: '2026-08-26',
    time: '16:00',
    progress: 60,
    createdAt: Date.now() - 86400000 * 3,
    isImportant: true,
    assignee: 'Nguyễn Minh Huy'
  },
  {
    id: 'task-party-08',
    title: 'Gửi lịch làm việc tuần tới, dặn hoa, xem sinh nhật và chuẩn bị tài liệu Thường trực',
    description: 'Hằng tuần, nhắc trước 18h ngày chủ nhật phải gửi lịch làm việc, dặn hoa, xem sinh nhật tuần sau, chuẩn bị tài liệu Thường trực.',
    priority: 'medium',
    status: 'Pending',
    category: 'Tổng hợp & Hành chính',
    deadline: '2026-08-17',
    time: '17:30',
    progress: 30,
    createdAt: Date.now() - 86400000 * 2,
    isSystem: true,
    assignee: 'Nguyễn Minh Huy'
  }
];
