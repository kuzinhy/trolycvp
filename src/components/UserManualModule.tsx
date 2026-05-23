import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, BrainCircuit, LayoutDashboard, PenTool, Database, ShieldCheck, ChevronRight } from 'lucide-react';

export const UserManualModule: React.FC = () => {
  const sections = [
    {
      title: 'Hội thoại AI Elite (Knowledge Core)',
      icon: <BrainCircuit className="w-5 h-5 text-indigo-500" />,
      color: 'bg-indigo-50',
      description: 'Hệ thống trợ lý ảo thông minh được huấn luyện chuyên sâu cho môi trường tham mưu cấp ủy.',
      details: [
        'Hỏi đáp đa năng: Đặt câu hỏi về điều lệ Đảng, quy định, hướng dẫn của cấp trên.',
        'Học hỏi kiến thức: AI có thể cập nhật các văn kiện mới nhất (Knowledge Core).',
        'Tìm kiếm văn bản: Tra cứu ngay lập tức theo từ khóa.'
      ]
    },
    {
      title: 'Soạn thảo Pro & Rà soát văn bản',
      icon: <PenTool className="w-5 h-5 text-amber-500" />,
      color: 'bg-amber-50',
      description: 'Công cụ soạn thảo thông minh tăng cường tốc độ và tính chuẩn xác của văn bản Đảng.',
      details: [
        'Soạn thảo AI: Tự động lên dàn ý và hoàn thiện báo cáo, nghị quyết, tham luận.',
        'Rà soát Văn bản Đảng: Quét văn bản để phát hiện lỗi sai về thể thức, từ ngữ chính trị.',
        'Tạo kết luận/Thư mời: Tốc ký các form điền nhanh để in xuất ra dạng chuẩn.'
      ]
    },
    {
      title: 'Quản trị - Điều hành',
      icon: <LayoutDashboard className="w-5 h-5 text-blue-500" />,
      color: 'bg-blue-50',
      description: 'Bảng theo dõi và vận hành các hoạt động chi bộ, Đảng bộ.',
      details: [
        'Bảng điều khiển (Dashboard): Tổng hợp các số liệu đầu việc, tỷ lệ hoàn thành, người vi phạm.',
        'Quản trị Nghị quyết: Áp dụng các chỉ tiêu lớn và đo lường tiến độ định kỳ.',
        'Việc cần làm (Task Management): Giao việc cụ thể, có hạn chót và giám sát từng cán bộ.'
      ]
    },
    {
      title: 'Tham mưu & Dữ liệu chiến lược',
      icon: <Database className="w-5 h-5 text-emerald-500" />,
      color: 'bg-emerald-50',
      description: 'Phân tích dữ liệu lịch sử và tổng hợp xu hướng dư luận.',
      details: [
        'Tin tức & Dư luận: Quét các nguồn nội bộ và dư luận trên không gian mạng liên quan đến đơn vị.',
        'Dự báo chiến lược: Nhìn vào số liệu quá khứ, dự báo về chất lượng Đảng viên hoặc rủi ro tiềm ẩn.',
        'Tham mưu & Sinh hoạt: Chuẩn bị nội dung sinh hoạt chi bộ định kỳ, chuyên đề.'
      ]
    },
    {
      title: 'Quản trị Hệ thống (Admin)',
      icon: <ShieldCheck className="w-5 h-5 text-rose-500" />,
      color: 'bg-rose-50',
      description: 'Khu vực quản lý cấp cao để điều chỉnh thiết lập chung.',
      details: [
        'Quản lý quân số: Thêm, xóa, phân quyền các đảng viên/cán bộ có tài khoản sử dụng.',
        'Lịch sử hệ thống: Kiểm tra tính minh bạch và những thay đổi đã diễn ra trong phần mềm.',
        'Cập nhật hệ thống: Xem và nâng cấp những tính năng mới do AI phát hành.'
      ]
    }
  ];

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100/50 rounded-xl text-blue-600">
            <BookOpen size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Hướng dẫn sử dụng hệ thống</h2>
            <p className="text-xs text-slate-500 mt-0.5">Cẩm nang tra cứu chức năng dành cho Chánh văn phòng Đảng uỷ</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="text-xl font-bold mb-2">Hệ thống Chỉ huy Chiến lược 6.0</h3>
            <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
              Được thiết kế riêng để tối ưu hóa điều hành, tham mưu chiến lược và quản lý tri thức cho Đảng ủy. Các chức năng đều lấy "Kết nối tri thức" làm cốt lõi, đảm bảo an toàn và bảo mật cao.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${section.color}`}>
                    {section.icon}
                  </div>
                  <h4 className="font-bold text-slate-800">{section.title}</h4>
                </div>
                <p className="text-sm text-slate-600 mb-4">{section.description}</p>
                <ul className="space-y-2">
                  {section.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex gap-2 text-sm text-slate-700">
                      <ChevronRight className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{detail}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
            <h4 className="font-bold text-amber-800 mb-2">Quy tắc bảo mật</h4>
            <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
              <li>Không tải lên các văn kiện, tư liệu có đóng dấu Mật, Tối Mật, Tuyệt Mật.</li>
              <li>Chỉ sử dụng trên thiết bị đã được cấp phép an toàn thông tin của đơn vị.</li>
              <li>Đăng xuất khỏi hệ thống khi rời khỏi vị trí làm việc.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
