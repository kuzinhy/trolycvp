import React, { useRef } from 'react';
import { 
  Printer, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  ArrowLeft,
  Calendar as CalendarIcon,
  FileText
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { ScheduleItem, determineSession, formatWeeklyScheduleText } from './scheduleUtils';

interface PrintScheduleViewProps {
  weekStart: Date;
  items: ScheduleItem[];
  onBack: () => void;
  showToast: (msg: string, type?: any) => void;
}

export const PrintScheduleView: React.FC<PrintScheduleViewProps> = ({
  weekStart,
  items,
  onBack,
  showToast
}) => {
  const [copied, setCopied] = React.useState(false);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekNumber = format(weekStart, 'w');
  const fromDate = format(weekStart, 'dd/MM/yyyy');
  const toDate = format(addDays(weekStart, 6), 'dd/MM/yyyy');

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = formatWeeklyScheduleText(items, weekStart);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      showToast("Đã sao chép nội dung lịch tuần vào bộ nhớ tạm", "success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Action Toolbar (Ẩn khi in) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Quay lại giao diện lịch</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyText}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? "Đã sao chép" : "Sao chép gửi Zalo/SMS"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>In Lịch Công Tác (A4)</span>
          </button>
        </div>
      </div>

      {/* A4 Paper Container for Print and Preview */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-md print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none text-slate-900 font-serif">
        {/* Header Quốc hiệu & Đảng ủy */}
        <div className="flex items-start justify-between pb-6 border-b-2 border-slate-900 text-xs leading-relaxed">
          <div className="text-center font-bold">
            <div className="uppercase tracking-wider">ĐẢNG BỘ PHƯỜNG</div>
            <div className="uppercase font-black tracking-tight text-sm">VĂN PHÒNG ĐẢNG ỦY</div>
            <div className="w-16 h-0.5 bg-slate-800 mx-auto my-1"></div>
            <div className="font-normal italic text-slate-600">Số: ... - LCT/VPĐU</div>
          </div>

          <div className="text-center font-bold">
            <div className="uppercase tracking-wider">ĐẢNG CỘNG SẢN VIỆT NAM</div>
            <div className="w-24 h-0.5 bg-slate-800 mx-auto my-1"></div>
            <div className="font-normal italic text-slate-600">
              ..., ngày {format(new Date(), 'dd')} tháng {format(new Date(), 'MM')} năm {format(new Date(), 'yyyy')}
            </div>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center my-6 space-y-1">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900">
            LỊCH LÀM VIỆC TUẦN THƯỜNG TRỰC ĐẢNG ỦY (TUẦN {weekNumber})
          </h2>
          <p className="text-xs font-semibold italic text-slate-700">
            (Từ ngày {fromDate} đến ngày {toDate})
          </p>
        </div>

        {/* Weekly Official Table */}
        <div className="overflow-x-auto my-6">
          <table className="w-full border-collapse border border-slate-900 text-xs">
            <thead>
              <tr className="bg-slate-100 border border-slate-900 text-center font-bold">
                <th className="border border-slate-900 p-2 w-28 uppercase">Thứ / Ngày</th>
                <th className="border border-slate-900 p-2 w-16 uppercase">Buổi</th>
                <th className="border border-slate-900 p-2 w-20 uppercase">Thời gian</th>
                <th className="border border-slate-900 p-2 uppercase">Nội dung công việc</th>
                <th className="border border-slate-900 p-2 w-28 uppercase">Chủ trì</th>
                <th className="border border-slate-900 p-2 w-32 uppercase">Thành phần</th>
                <th className="border border-slate-900 p-2 w-28 uppercase">Địa điểm</th>
                <th className="border border-slate-900 p-2 w-24 uppercase">Chuẩn bị</th>
              </tr>
            </thead>
            <tbody>
              {weekDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const morningItems = items.filter(it => it.date === dayStr && (it.session || determineSession(it.time)) === 'morning' && it.status !== 'cancelled');
                const afternoonItems = items.filter(it => it.date === dayStr && (it.session || determineSession(it.time)) === 'afternoon' && it.status !== 'cancelled');
                
                const totalRows = (morningItems.length || 1) + (afternoonItems.length || 1);

                return (
                  <React.Fragment key={dayStr}>
                    {/* Morning Rows */}
                    {morningItems.length === 0 ? (
                      <tr className="border border-slate-900">
                        <td rowSpan={totalRows} className="border border-slate-900 p-2 text-center font-bold align-middle bg-slate-50">
                          <div className="uppercase">{format(day, 'EEEE', { locale: vi })}</div>
                          <div className="font-normal">{format(day, 'dd/MM/yyyy')}</div>
                        </td>
                        <td className="border border-slate-900 p-2 text-center font-bold">Sáng</td>
                        <td className="border border-slate-900 p-2 text-center text-slate-500">-</td>
                        <td className="border border-slate-900 p-2 italic text-slate-500">Làm việc tại cơ quan</td>
                        <td className="border border-slate-900 p-2 text-center">-</td>
                        <td className="border border-slate-900 p-2 text-center">-</td>
                        <td className="border border-slate-900 p-2 text-center">-</td>
                        <td className="border border-slate-900 p-2 text-center">-</td>
                      </tr>
                    ) : (
                      morningItems.map((item, idx) => (
                        <tr key={item.id} className="border border-slate-900">
                          {idx === 0 && (
                            <>
                              <td rowSpan={totalRows} className="border border-slate-900 p-2 text-center font-bold align-middle bg-slate-50">
                                <div className="uppercase">{format(day, 'EEEE', { locale: vi })}</div>
                                <div className="font-normal">{format(day, 'dd/MM/yyyy')}</div>
                              </td>
                              <td rowSpan={morningItems.length} className="border border-slate-900 p-2 text-center font-bold align-middle">
                                Sáng
                              </td>
                            </>
                          )}
                          <td className="border border-slate-900 p-2 text-center font-bold">{item.time || '08:00'}</td>
                          <td className="border border-slate-900 p-2 font-bold">{item.name}</td>
                          <td className="border border-slate-900 p-2 font-medium">{item.chairperson || '-'}</td>
                          <td className="border border-slate-900 p-2">{item.participants || '-'}</td>
                          <td className="border border-slate-900 p-2">{item.location || '-'}</td>
                          <td className="border border-slate-900 p-2">{item.preparingUnit || '-'}</td>
                        </tr>
                      ))
                    )}

                    {/* Afternoon Rows */}
                    {afternoonItems.length === 0 ? (
                      <tr className="border border-slate-900">
                        <td className="border border-slate-900 p-2 text-center font-bold">Chiều</td>
                        <td className="border border-slate-900 p-2 text-center text-slate-500">-</td>
                        <td className="border border-slate-900 p-2 italic text-slate-500">Làm việc tại cơ quan</td>
                        <td className="border border-slate-900 p-2 text-center">-</td>
                        <td className="border border-slate-900 p-2 text-center">-</td>
                        <td className="border border-slate-900 p-2 text-center">-</td>
                        <td className="border border-slate-900 p-2 text-center">-</td>
                      </tr>
                    ) : (
                      afternoonItems.map((item, idx) => (
                        <tr key={item.id} className="border border-slate-900">
                          {idx === 0 && (
                            <td rowSpan={afternoonItems.length} className="border border-slate-900 p-2 text-center font-bold align-middle">
                              Chiều
                            </td>
                          )}
                          <td className="border border-slate-900 p-2 text-center font-bold">{item.time || '14:00'}</td>
                          <td className="border border-slate-900 p-2 font-bold">{item.name}</td>
                          <td className="border border-slate-900 p-2 font-medium">{item.chairperson || '-'}</td>
                          <td className="border border-slate-900 p-2">{item.participants || '-'}</td>
                          <td className="border border-slate-900 p-2">{item.location || '-'}</td>
                          <td className="border border-slate-900 p-2">{item.preparingUnit || '-'}</td>
                        </tr>
                      ))
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer & Signatures */}
        <div className="mt-8 pt-4 flex items-start justify-between text-xs leading-relaxed">
          <div className="w-1/2 space-y-1">
            <div className="font-bold italic">Nơi nhận:</div>
            <div className="text-[11px] text-slate-700 leading-normal">
              - Thường trực Đảng ủy (để b/c);<br />
              - Các đ/c UVBTV, BCH Đảng bộ;<br />
              - HĐND, UBND, MTTQ & các đoàn thể;<br />
              - Các Chi bộ trực thuộc;<br />
              - Lưu: VP.
            </div>
          </div>

          <div className="w-1/2 text-center space-y-1">
            <div className="font-bold uppercase">TL. THƯỜNG TRỰC ĐẢNG ỦY</div>
            <div className="font-black uppercase text-sm">CHÁNH VĂN PHÒNG</div>
            <div className="h-16"></div>
            <div className="font-bold text-sm">Nguyễn Minh Huy</div>
          </div>
        </div>
      </div>
    </div>
  );
};
